// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title L2Bridge
 * @notice Bridge contract for depositing/withdrawing between L1 and AgentL2.
 * @dev Optimistic rollup bridge: sequencer processes deposits and finalizes withdrawals
 *      after a delay. Anyone can challenge fraudulent deposits or withdrawals during
 *      the fraud proof window to protect agents and users.
 *
 *      Integrates with the FraudProver contract for challenge authorization. When a
 *      FraudProver address is set, challenges are routed through it for proper bond
 *      management and slashing. If no FraudProver is set, falls back to owner-only
 *      challenge authorization for backward compatibility.
 */
contract L2Bridge is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Errors (audit-friendly; gas-efficient)
    // -------------------------------------------------------------------------
    error OnlySequencer();
    error DepositAlreadyProcessed();
    error DepositAlreadyChallenged();
    error DepositNotFound();
    error InvalidAddress();
    error InvalidAmount();
    error WithdrawalAlreadyFinalized();
    error WithdrawalAlreadyChallenged();
    error WithdrawalNotFound();
    error InsufficientBalance();
    error DuplicateWithdrawal();
    error DelayNotPassed();
    error OnlyFraudProverOrOwner();

    // -------------------------------------------------------------------------
    // Constants & state
    // -------------------------------------------------------------------------
    /// @notice Fraud proof window: withdrawals can be challenged until this time after initiation.
    uint256 public constant WITHDRAWAL_DELAY = 7 days;

    address public l1Bridge;
    address public sequencer;

    /// @notice Address of the FraudProver contract (authorized to trigger challenges).
    address public fraudProver;

    struct Deposit {
        address l1Address;
        address l2Address;
        uint256 amount;
        uint256 timestamp;
        bool processed;
        bool challenged;
    }

    struct Withdrawal {
        address l2Address;
        address l1Address;
        uint256 amount;
        uint256 timestamp;
        bool finalized;
        bool challenged;
    }

    mapping(bytes32 => Deposit) public deposits;
    mapping(bytes32 => Withdrawal) public withdrawals;
    mapping(address => uint256) public balances;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event DepositProcessed(bytes32 indexed depositId, address indexed l1Address, address indexed l2Address, uint256 amount);
    event DepositChallenged(bytes32 indexed depositId);
    event WithdrawalInitiated(bytes32 indexed withdrawalId, address indexed l2Address, address indexed l1Address, uint256 amount);
    event WithdrawalFinalized(bytes32 indexed withdrawalId);
    event WithdrawalChallenged(bytes32 indexed withdrawalId);
    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);
    event FraudProverUpdated(address indexed oldFraudProver, address indexed newFraudProver);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    modifier onlySequencer() {
        if (msg.sender != sequencer) revert OnlySequencer();
        _;
    }

    constructor(address _sequencer) Ownable(msg.sender) {
        if (_sequencer == address(0)) revert InvalidAddress();
        sequencer = _sequencer;
    }

    // -------------------------------------------------------------------------
    // Deposit (sequencer) & deposit fraud proof
    // -------------------------------------------------------------------------

    /**
     * @notice Process a deposit from L1 (called by sequencer only).
     * @param depositId Unique deposit identifier (e.g. from L1 event or intent).
     * @param l1Address Sender on L1.
     * @param l2Address Recipient on L2 (credited balance).
     * @param amount Amount in wei.
     */
    function processDeposit(
        bytes32 depositId,
        address l1Address,
        address l2Address,
        uint256 amount
    ) external onlySequencer {
        if (deposits[depositId].processed) revert DepositAlreadyProcessed();
        if (l1Address == address(0) || l2Address == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        deposits[depositId] = Deposit({
            l1Address: l1Address,
            l2Address: l2Address,
            amount: amount,
            timestamp: block.timestamp,
            processed: true,
            challenged: false
        });

        balances[l2Address] += amount;

        emit DepositProcessed(depositId, l1Address, l2Address, amount);
    }

    /**
     * @notice Challenge a fraudulent deposit (fraud proof).
     * @dev Can be called by the FraudProver contract (if set) or the owner (fallback).
     *      When FraudProver is integrated, challenges go through proper bond management
     *      and slashing logic. Reverts the L2 credit for the fraudulent deposit.
     * @param depositId The deposit to challenge.
     */
    function challengeDeposit(bytes32 depositId) external nonReentrant {
        if (fraudProver != address(0)) {
            if (msg.sender != fraudProver && msg.sender != owner()) revert OnlyFraudProverOrOwner();
        } else {
            if (msg.sender != owner()) revert OnlyFraudProverOrOwner();
        }
        Deposit storage d = deposits[depositId];
        if (!d.processed) revert DepositNotFound();
        if (d.challenged) revert DepositAlreadyChallenged();

        d.challenged = true;
        uint256 amount = d.amount;
        address l2Address = d.l2Address;
        if (balances[l2Address] < amount) revert InsufficientBalance();

        balances[l2Address] -= amount;

        emit DepositChallenged(depositId);
    }

    // -------------------------------------------------------------------------
    // Withdrawal (user) & withdrawal fraud proof
    // -------------------------------------------------------------------------

    /**
     * @notice Initiate withdrawal to L1 (user-facing).
     * @param l1Address Destination on L1.
     * @param amount Amount in wei.
     * @return withdrawalId Unique id for this withdrawal (used to finalize or challenge).
     */
    function initiateWithdrawal(
        address l1Address,
        uint256 amount
    ) external nonReentrant returns (bytes32 withdrawalId) {
        if (l1Address == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        withdrawalId = keccak256(abi.encodePacked(
            msg.sender,
            l1Address,
            amount,
            block.timestamp
        ));
        if (withdrawals[withdrawalId].timestamp != 0) revert DuplicateWithdrawal();

        withdrawals[withdrawalId] = Withdrawal({
            l2Address: msg.sender,
            l1Address: l1Address,
            amount: amount,
            timestamp: block.timestamp,
            finalized: false,
            challenged: false
        });

        balances[msg.sender] -= amount;

        emit WithdrawalInitiated(withdrawalId, msg.sender, l1Address, amount);
        return withdrawalId;
    }

    /**
     * @notice Finalize withdrawal after delay (sequencer only).
     * @param withdrawalId The withdrawal to finalize.
     */
    function finalizeWithdrawal(bytes32 withdrawalId) external onlySequencer {
        Withdrawal storage w = withdrawals[withdrawalId];
        if (w.l2Address == address(0)) revert WithdrawalNotFound();
        if (w.finalized) revert WithdrawalAlreadyFinalized();
        if (w.challenged) revert WithdrawalAlreadyChallenged();
        if (block.timestamp < w.timestamp + WITHDRAWAL_DELAY) revert DelayNotPassed();

        w.finalized = true;

        emit WithdrawalFinalized(withdrawalId);
    }

    /**
     * @notice Challenge a fraudulent withdrawal (fraud proof).
     * @dev Can be called by the FraudProver contract (if set) or the owner (fallback).
     *      When FraudProver is integrated, challenges go through proper bond management
     *      and slashing logic. Refunds the L2 balance to the withdrawal initiator.
     * @param withdrawalId The withdrawal to challenge.
     */
    function challengeWithdrawal(bytes32 withdrawalId) external nonReentrant {
        if (fraudProver != address(0)) {
            if (msg.sender != fraudProver && msg.sender != owner()) revert OnlyFraudProverOrOwner();
        } else {
            if (msg.sender != owner()) revert OnlyFraudProverOrOwner();
        }
        Withdrawal storage w = withdrawals[withdrawalId];
        if (w.l2Address == address(0)) revert WithdrawalNotFound();
        if (w.finalized) revert WithdrawalAlreadyFinalized();
        if (w.challenged) revert WithdrawalAlreadyChallenged();

        w.challenged = true;
        uint256 amount = w.amount;
        address l2Address = w.l2Address;

        balances[l2Address] += amount;

        emit WithdrawalChallenged(withdrawalId);
    }

    // -------------------------------------------------------------------------
    // Governance & views
    // -------------------------------------------------------------------------

    /**
     * @notice Set L1 bridge address (cross-reference; sequencer only).
     */
    function setL1Bridge(address _l1Bridge) external onlySequencer {
        l1Bridge = _l1Bridge;
    }

    /**
     * @notice Set the FraudProver contract address (owner only).
     * @dev Once set, the FraudProver contract can authorize deposit and withdrawal
     *      challenges. The owner retains challenge authority as a fallback.
     * @param _fraudProver The address of the FraudProver contract.
     */
    function setFraudProver(address _fraudProver) external onlyOwner {
        if (_fraudProver == address(0)) revert InvalidAddress();
        address old = fraudProver;
        fraudProver = _fraudProver;
        emit FraudProverUpdated(old, _fraudProver);
    }

    /**
     * @notice Update sequencer (only current sequencer).
     */
    function updateSequencer(address newSequencer) external {
        if (msg.sender != sequencer) revert OnlySequencer();
        if (newSequencer == address(0)) revert InvalidAddress();
        address oldSequencer = sequencer;
        sequencer = newSequencer;
        emit SequencerUpdated(oldSequencer, newSequencer);
    }

    /**
     * @notice L2 balance for an account.
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Transfer L2 balance to another address.
     */
    function transfer(address to, uint256 amount) external nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
    }
}
