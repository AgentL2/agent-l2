// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondManager
 * @notice Manages sequencer and challenger bonds for the AgentL2 optimistic rollup.
 * @dev The sequencer must post a bond before submitting state batches. Challengers
 *      must also post a bond when initiating fraud proofs. Bonds are slashed on
 *      unsuccessful actions (fraudulent state roots or invalid challenges) and
 *      rewarded to the honest party.
 *
 *      Integrates with FraudProver and StateCommitmentChain:
 *      - FraudProver calls `slashSequencer` on successful fraud proof
 *      - FraudProver calls `slashChallenger` on failed challenge
 *      - StateCommitmentChain checks `isSequencerCollateralized` before accepting batches
 */
contract BondManager is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBond();
    error BondLocked();
    error OnlyFraudProver();
    error NotSequencer();
    error AlreadySequencer();
    error NoBondToWithdraw();
    error WithdrawalPending();
    error NoWithdrawalPending();
    error WithdrawalDelayNotPassed();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    /// @notice Minimum bond required for a sequencer to submit batches.
    uint256 public constant MIN_SEQUENCER_BOND = 1 ether;

    /// @notice Minimum bond required for a challenger to submit a fraud proof.
    uint256 public constant MIN_CHALLENGER_BOND = 0.1 ether;

    /// @notice Delay before a sequencer can withdraw their bond after initiating withdrawal.
    uint256 public constant BOND_WITHDRAWAL_DELAY = 7 days;

    /// @notice Percentage of slashed bond awarded to the challenger (basis points).
    uint256 public constant CHALLENGER_REWARD_BPS = 5000; // 50%

    uint256 public constant BPS_DENOMINATOR = 10000;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    /// @notice Address of the FraudProver contract (authorized to slash bonds).
    address public fraudProver;

    /// @notice Sequencer bond balances.
    mapping(address => uint256) public sequencerBonds;

    /// @notice Challenger bond balances (per challenge, keyed by challenger address).
    mapping(address => uint256) public challengerBonds;

    /// @notice Whether an address is a registered sequencer.
    mapping(address => bool) public isSequencer;

    /// @notice Pending withdrawal requests for sequencer bonds.
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestedAt;
    }
    mapping(address => WithdrawalRequest) public pendingWithdrawals;

    /// @notice Total amount held in sequencer bonds.
    uint256 public totalSequencerBonds;

    /// @notice Total amount held in challenger bonds.
    uint256 public totalChallengerBonds;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event SequencerBondPosted(address indexed sequencer, uint256 amount, uint256 totalBond);
    event SequencerBondWithdrawalRequested(address indexed sequencer, uint256 amount);
    event SequencerBondWithdrawn(address indexed sequencer, uint256 amount);
    event SequencerBondSlashed(address indexed sequencer, uint256 amount, address indexed challenger);
    event ChallengerBondPosted(address indexed challenger, uint256 amount);
    event ChallengerBondReturned(address indexed challenger, uint256 amount);
    event ChallengerBondSlashed(address indexed challenger, uint256 amount);
    event SequencerRegistered(address indexed sequencer);
    event SequencerDeregistered(address indexed sequencer);
    event FraudProverUpdated(address indexed oldFraudProver, address indexed newFraudProver);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier onlyFraudProver() {
        if (msg.sender != fraudProver) revert OnlyFraudProver();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // Sequencer Bond Management
    // -------------------------------------------------------------------------

    /**
     * @notice Post a bond to become or remain an active sequencer.
     * @dev Sequencer must post at least MIN_SEQUENCER_BOND to be eligible for
     *      batch submission. Additional bond can be posted at any time.
     */
    function postSequencerBond() external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();

        sequencerBonds[msg.sender] += msg.value;
        totalSequencerBonds += msg.value;

        if (!isSequencer[msg.sender] && sequencerBonds[msg.sender] >= MIN_SEQUENCER_BOND) {
            isSequencer[msg.sender] = true;
            emit SequencerRegistered(msg.sender);
        }

        emit SequencerBondPosted(msg.sender, msg.value, sequencerBonds[msg.sender]);
    }

    /**
     * @notice Request withdrawal of sequencer bond. Subject to BOND_WITHDRAWAL_DELAY.
     * @param amount The amount to withdraw.
     */
    function requestBondWithdrawal(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        if (sequencerBonds[msg.sender] < amount) revert InsufficientBond();
        if (pendingWithdrawals[msg.sender].amount > 0) revert WithdrawalPending();

        pendingWithdrawals[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestedAt: block.timestamp
        });

        emit SequencerBondWithdrawalRequested(msg.sender, amount);
    }

    /**
     * @notice Finalize a pending bond withdrawal after the delay has passed.
     */
    function finalizeBondWithdrawal() external nonReentrant {
        WithdrawalRequest storage req = pendingWithdrawals[msg.sender];
        if (req.amount == 0) revert NoWithdrawalPending();
        if (block.timestamp < req.requestedAt + BOND_WITHDRAWAL_DELAY) revert WithdrawalDelayNotPassed();

        uint256 amount = req.amount;

        // Re-check bond is still sufficient (could have been slashed)
        if (sequencerBonds[msg.sender] < amount) {
            amount = sequencerBonds[msg.sender];
        }

        if (amount == 0) revert NoBondToWithdraw();

        sequencerBonds[msg.sender] -= amount;
        totalSequencerBonds -= amount;
        delete pendingWithdrawals[msg.sender];

        // Deregister if below minimum
        if (sequencerBonds[msg.sender] < MIN_SEQUENCER_BOND && isSequencer[msg.sender]) {
            isSequencer[msg.sender] = false;
            emit SequencerDeregistered(msg.sender);
        }

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "BondManager: withdrawal transfer failed");

        emit SequencerBondWithdrawn(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Challenger Bond Management
    // -------------------------------------------------------------------------

    /**
     * @notice Post a challenger bond when initiating a fraud proof.
     * @dev Called by FraudProver on behalf of the challenger, or directly by challenger.
     */
    function postChallengerBond() external payable nonReentrant {
        if (msg.value < MIN_CHALLENGER_BOND) revert InsufficientBond();

        challengerBonds[msg.sender] += msg.value;
        totalChallengerBonds += msg.value;

        emit ChallengerBondPosted(msg.sender, msg.value);
    }

    /**
     * @notice Post a challenger bond on behalf of another address.
     * @dev Called by FraudProver when forwarding challenger's bond.
     * @param challenger The address to credit the bond to.
     */
    function postChallengerBondFor(address challenger) external payable nonReentrant {
        if (challenger == address(0)) revert InvalidAddress();
        if (msg.value < MIN_CHALLENGER_BOND) revert InsufficientBond();

        challengerBonds[challenger] += msg.value;
        totalChallengerBonds += msg.value;

        emit ChallengerBondPosted(challenger, msg.value);
    }

    /**
     * @notice Return challenger bond after a successful challenge.
     * @param challenger The challenger whose bond to return.
     * @param amount The amount to return.
     */
    function returnChallengerBond(address challenger, uint256 amount) external onlyFraudProver nonReentrant {
        if (challenger == address(0)) revert InvalidAddress();
        if (challengerBonds[challenger] < amount) revert InsufficientBond();

        challengerBonds[challenger] -= amount;
        totalChallengerBonds -= amount;

        (bool ok, ) = payable(challenger).call{value: amount}("");
        require(ok, "BondManager: bond return failed");

        emit ChallengerBondReturned(challenger, amount);
    }

    // -------------------------------------------------------------------------
    // Slashing (FraudProver only)
    // -------------------------------------------------------------------------

    /**
     * @notice Slash a sequencer's bond after a successful fraud proof.
     * @dev Transfers CHALLENGER_REWARD_BPS of the slashed amount to the challenger.
     *      The remainder is burned (sent to address(0) or kept in contract as protocol revenue).
     * @param sequencer The sequencer to slash.
     * @param challenger The challenger to reward.
     * @param amount The amount to slash from the sequencer's bond.
     */
    function slashSequencer(
        address sequencer,
        address challenger,
        uint256 amount
    ) external onlyFraudProver nonReentrant {
        if (sequencer == address(0) || challenger == address(0)) revert InvalidAddress();

        uint256 slashAmount = amount;
        if (slashAmount > sequencerBonds[sequencer]) {
            slashAmount = sequencerBonds[sequencer];
        }

        sequencerBonds[sequencer] -= slashAmount;
        totalSequencerBonds -= slashAmount;

        // Deregister if below minimum
        if (sequencerBonds[sequencer] < MIN_SEQUENCER_BOND && isSequencer[sequencer]) {
            isSequencer[sequencer] = false;
            emit SequencerDeregistered(sequencer);
        }

        // Cancel any pending withdrawal
        if (pendingWithdrawals[sequencer].amount > 0) {
            delete pendingWithdrawals[sequencer];
        }

        // Reward challenger
        uint256 reward = (slashAmount * CHALLENGER_REWARD_BPS) / BPS_DENOMINATOR;

        if (reward > 0) {
            (bool ok, ) = payable(challenger).call{value: reward}("");
            require(ok, "BondManager: reward transfer failed");
        }

        // Remainder stays in contract as protocol revenue

        emit SequencerBondSlashed(sequencer, slashAmount, challenger);
    }

    /**
     * @notice Slash a challenger's bond after a failed/invalid challenge.
     * @param challenger The challenger to slash.
     * @param amount The amount to slash.
     */
    function slashChallenger(address challenger, uint256 amount) external onlyFraudProver nonReentrant {
        if (challenger == address(0)) revert InvalidAddress();

        uint256 slashAmount = amount;
        if (slashAmount > challengerBonds[challenger]) {
            slashAmount = challengerBonds[challenger];
        }

        challengerBonds[challenger] -= slashAmount;
        totalChallengerBonds -= slashAmount;

        // Slashed amount stays in contract as protocol revenue

        emit ChallengerBondSlashed(challenger, slashAmount);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Check whether a sequencer has sufficient bond to submit batches.
     * @param sequencer The sequencer address to check.
     * @return True if the sequencer is registered and has >= MIN_SEQUENCER_BOND.
     */
    function isSequencerCollateralized(address sequencer) external view returns (bool) {
        return isSequencer[sequencer] && sequencerBonds[sequencer] >= MIN_SEQUENCER_BOND;
    }

    /**
     * @notice Get the bond balance of a sequencer.
     * @param sequencer The sequencer address.
     * @return The bond balance in wei.
     */
    function getSequencerBond(address sequencer) external view returns (uint256) {
        return sequencerBonds[sequencer];
    }

    /**
     * @notice Get the bond balance of a challenger.
     * @param challenger The challenger address.
     * @return The bond balance in wei.
     */
    function getChallengerBond(address challenger) external view returns (uint256) {
        return challengerBonds[challenger];
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @notice Set the FraudProver contract address (owner only, one-time or migration).
     * @param _fraudProver The address of the FraudProver contract.
     */
    function setFraudProver(address _fraudProver) external onlyOwner {
        if (_fraudProver == address(0)) revert InvalidAddress();
        address old = fraudProver;
        fraudProver = _fraudProver;
        emit FraudProverUpdated(old, _fraudProver);
    }

    /**
     * @notice Withdraw protocol revenue (slashed bonds minus rewards).
     * @param to The address to send the revenue to.
     * @param amount The amount to withdraw.
     */
    function withdrawProtocolRevenue(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();

        // Ensure we don't withdraw bonded funds
        uint256 totalBonded = totalSequencerBonds + totalChallengerBonds;
        uint256 available = address(this).balance > totalBonded
            ? address(this).balance - totalBonded
            : 0;
        require(amount <= available, "BondManager: insufficient protocol revenue");

        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "BondManager: revenue withdrawal failed");
    }

    /// @notice Allow the contract to receive ETH (for bonds).
    receive() external payable {}
}
