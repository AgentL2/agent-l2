// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title L1Bridge
 * @notice L1 bridge for AgentL2: accepts ETH deposits, holds funds, and pays out
 *         proven L2 withdrawals after the sequencer attests and delay passes.
 * @dev L1 side of the AgentL2 optimistic bridge. Sequencer relays L1 deposits
 *      to L2 and submits L2 withdrawal proofs to L1 for user claims.
 */
contract L1Bridge is ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error InvalidAddress();
    error InvalidAmount();
    error OnlySequencer();
    error WithdrawalNotProven();
    error AlreadyClaimed();
    error DelayNotPassed();

    // -------------------------------------------------------------------------
    // Constants & state
    // -------------------------------------------------------------------------
    /// @notice Minimum delay after proof before user can claim (L1 safety buffer).
    uint256 public constant CLAIM_DELAY = 1 days;

    address public sequencer;
    uint256 public depositNonce;

    struct WithdrawalProof {
        address l1Address;
        uint256 amount;
        uint256 provenAt;
        bool claimed;
    }

    mapping(bytes32 => WithdrawalProof) public withdrawalProofs;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event DepositInitiated(
        bytes32 indexed depositId,
        address indexed l1Address,
        address indexed l2Address,
        uint256 amount
    );
    event WithdrawalProven(bytes32 indexed withdrawalId, address indexed l1Address, uint256 amount);
    event WithdrawalClaimed(bytes32 indexed withdrawalId, address indexed l1Address, uint256 amount);
    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);

    modifier onlySequencer() {
        if (msg.sender != sequencer) revert OnlySequencer();
        _;
    }

    constructor(address _sequencer) {
        if (_sequencer == address(0)) revert InvalidAddress();
        sequencer = _sequencer;
    }

    /**
     * @notice Deposit ETH to L2. User sends ETH; sequencer will credit L2Bridge.
     * @param l2Address Recipient address on L2.
     */
    function depositToL2(address l2Address) external payable nonReentrant {
        if (l2Address == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();

        depositNonce += 1;
        bytes32 depositId = keccak256(
            abi.encodePacked(msg.sender, l2Address, msg.value, depositNonce)
        );

        emit DepositInitiated(depositId, msg.sender, l2Address, msg.value);
    }

    /**
     * @notice Sequencer submits proof that L2 finalized a withdrawal.
     * @param withdrawalId The L2 withdrawal ID.
     * @param l1Address Destination on L1 (claimant).
     * @param amount Amount to claim.
     */
    function proveWithdrawal(
        bytes32 withdrawalId,
        address l1Address,
        uint256 amount
    ) external onlySequencer {
        if (l1Address == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        withdrawalProofs[withdrawalId] = WithdrawalProof({
            l1Address: l1Address,
            amount: amount,
            provenAt: block.timestamp,
            claimed: false
        });

        emit WithdrawalProven(withdrawalId, l1Address, amount);
    }

    /**
     * @notice Claim ETH for a proven withdrawal after CLAIM_DELAY.
     * @param withdrawalId The L2 withdrawal ID.
     */
    function claimWithdrawal(bytes32 withdrawalId) external nonReentrant {
        WithdrawalProof storage proof = withdrawalProofs[withdrawalId];
        if (proof.l1Address == address(0)) revert WithdrawalNotProven();
        if (proof.claimed) revert AlreadyClaimed();
        if (block.timestamp < proof.provenAt + CLAIM_DELAY) revert DelayNotPassed();

        proof.claimed = true;
        address l1Address = proof.l1Address;
        uint256 amount = proof.amount;

        (bool ok,) = payable(l1Address).call{ value: amount }("");
        require(ok, "Transfer failed");

        emit WithdrawalClaimed(withdrawalId, l1Address, amount);
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
}
