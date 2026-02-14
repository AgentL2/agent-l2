// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StateCommitmentChain
 * @notice L1 contract that stores state root commitments posted by the sequencer
 *         for the AgentL2 optimistic rollup.
 * @dev Each batch commitment contains:
 *      - batchIndex: sequential index of the batch
 *      - stateRoot: Merkle root of the L2 state after the batch
 *      - timestamp: when the batch was submitted
 *      - submitter: the sequencer that submitted the batch
 *
 *      State roots become finalized after FRAUD_PROOF_WINDOW (7 days) passes
 *      without a successful challenge. During the window, anyone can challenge
 *      a batch through the FraudProver contract.
 *
 *      Integrates with:
 *      - BondManager: checks sequencer collateralization before accepting batches
 *      - FraudProver: authorized to delete fraudulent state batches
 */
contract StateCommitmentChain is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error OnlyFraudProver();
    error InvalidStateRoot();
    error InvalidBatchIndex();
    error BatchAlreadyExists();
    error BatchNotFound();
    error BatchAlreadyChallenged();
    error BatchAlreadyFinalized();
    error FraudProofWindowNotPassed();
    error SequencerNotCollateralized();
    error InvalidAddress();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    /// @notice Duration of the fraud proof window (7 days).
    uint256 public constant FRAUD_PROOF_WINDOW = 7 days;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct StateBatch {
        uint256 batchIndex;
        bytes32 stateRoot;
        uint256 timestamp;
        address submitter;
        bool challenged;
        bool finalized;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    /// @notice Address of the BondManager contract.
    address public bondManager;

    /// @notice Address of the FraudProver contract.
    address public fraudProver;

    /// @notice The next expected batch index.
    uint256 public nextBatchIndex;

    /// @notice Total number of finalized batches.
    uint256 public totalFinalizedBatches;

    /// @notice Mapping from batch index to state batch data.
    mapping(uint256 => StateBatch) public stateBatches;

    /// @notice Mapping from state root to batch index (for lookups).
    mapping(bytes32 => uint256) public stateRootToBatchIndex;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event StateBatchAppended(
        uint256 indexed batchIndex,
        bytes32 indexed stateRoot,
        address indexed submitter,
        uint256 timestamp
    );

    event StateBatchChallenged(
        uint256 indexed batchIndex,
        bytes32 indexed stateRoot,
        address indexed challenger
    );

    event StateBatchFinalized(
        uint256 indexed batchIndex,
        bytes32 indexed stateRoot
    );

    event StateBatchDeleted(
        uint256 indexed batchIndex,
        bytes32 indexed stateRoot
    );

    event BondManagerUpdated(address indexed oldBondManager, address indexed newBondManager);
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
    // Sequencer Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Append a new state batch commitment.
     * @dev The sequencer calls this after processing a batch of L2 transactions.
     *      The sequencer must be collateralized via BondManager.
     * @param stateRoot The Merkle root of the L2 state after this batch.
     */
    function appendStateBatch(bytes32 stateRoot) external {
        if (stateRoot == bytes32(0)) revert InvalidStateRoot();

        // Check sequencer collateralization if BondManager is set
        if (bondManager != address(0)) {
            (bool success, bytes memory data) = bondManager.staticcall(
                abi.encodeWithSignature("isSequencerCollateralized(address)", msg.sender)
            );
            require(
                success && abi.decode(data, (bool)),
                "SCC: sequencer not collateralized"
            );
        }

        uint256 batchIndex = nextBatchIndex;

        stateBatches[batchIndex] = StateBatch({
            batchIndex: batchIndex,
            stateRoot: stateRoot,
            timestamp: block.timestamp,
            submitter: msg.sender,
            challenged: false,
            finalized: false
        });

        stateRootToBatchIndex[stateRoot] = batchIndex;
        nextBatchIndex = batchIndex + 1;

        emit StateBatchAppended(batchIndex, stateRoot, msg.sender, block.timestamp);
    }

    /**
     * @notice Append multiple state batch commitments in a single transaction.
     * @param stateRoots Array of state roots to append.
     */
    function appendStateBatches(bytes32[] calldata stateRoots) external {
        // Check sequencer collateralization once
        if (bondManager != address(0)) {
            (bool success, bytes memory data) = bondManager.staticcall(
                abi.encodeWithSignature("isSequencerCollateralized(address)", msg.sender)
            );
            require(
                success && abi.decode(data, (bool)),
                "SCC: sequencer not collateralized"
            );
        }

        uint256 batchIndex = nextBatchIndex;

        for (uint256 i = 0; i < stateRoots.length; i++) {
            if (stateRoots[i] == bytes32(0)) revert InvalidStateRoot();

            stateBatches[batchIndex] = StateBatch({
                batchIndex: batchIndex,
                stateRoot: stateRoots[i],
                timestamp: block.timestamp,
                submitter: msg.sender,
                challenged: false,
                finalized: false
            });

            stateRootToBatchIndex[stateRoots[i]] = batchIndex;
            emit StateBatchAppended(batchIndex, stateRoots[i], msg.sender, block.timestamp);

            batchIndex++;
        }

        nextBatchIndex = batchIndex;
    }

    // -------------------------------------------------------------------------
    // Finalization
    // -------------------------------------------------------------------------

    /**
     * @notice Finalize a state batch after the fraud proof window has passed.
     * @dev Anyone can call this to finalize a batch. The batch must not have been
     *      challenged or already finalized.
     * @param batchIndex The index of the batch to finalize.
     */
    function finalizeBatch(uint256 batchIndex) external {
        StateBatch storage batch = stateBatches[batchIndex];
        if (batch.stateRoot == bytes32(0)) revert BatchNotFound();
        if (batch.challenged) revert BatchAlreadyChallenged();
        if (batch.finalized) revert BatchAlreadyFinalized();
        if (block.timestamp < batch.timestamp + FRAUD_PROOF_WINDOW) {
            revert FraudProofWindowNotPassed();
        }

        batch.finalized = true;
        totalFinalizedBatches++;

        emit StateBatchFinalized(batchIndex, batch.stateRoot);
    }

    // -------------------------------------------------------------------------
    // Challenge (FraudProver only)
    // -------------------------------------------------------------------------

    /**
     * @notice Mark a state batch as challenged. Called by FraudProver.
     * @param batchIndex The index of the batch to challenge.
     * @param challenger The address of the challenger (for event logging).
     */
    function challengeBatch(uint256 batchIndex, address challenger) external onlyFraudProver {
        StateBatch storage batch = stateBatches[batchIndex];
        if (batch.stateRoot == bytes32(0)) revert BatchNotFound();
        if (batch.challenged) revert BatchAlreadyChallenged();
        if (batch.finalized) revert BatchAlreadyFinalized();

        batch.challenged = true;

        emit StateBatchChallenged(batchIndex, batch.stateRoot, challenger);
    }

    /**
     * @notice Delete a fraudulent state batch and all subsequent batches.
     * @dev Called by FraudProver after a successful fraud proof. This invalidates
     *      the batch and forces the sequencer to resubmit from this point.
     * @param batchIndex The index of the first fraudulent batch.
     */
    function deleteBatch(uint256 batchIndex) external onlyFraudProver {
        StateBatch storage batch = stateBatches[batchIndex];
        if (batch.stateRoot == bytes32(0)) revert BatchNotFound();
        if (batch.finalized) revert BatchAlreadyFinalized();

        // Delete this batch and all subsequent unfinalized batches
        uint256 currentNextBatch = nextBatchIndex;
        for (uint256 i = batchIndex; i < currentNextBatch; i++) {
            StateBatch storage b = stateBatches[i];
            if (b.stateRoot != bytes32(0) && !b.finalized) {
                bytes32 sr = b.stateRoot;
                delete stateRootToBatchIndex[sr];
                delete stateBatches[i];
                emit StateBatchDeleted(i, sr);
            }
        }

        // Reset nextBatchIndex to the deleted batch index
        nextBatchIndex = batchIndex;
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Get the state batch data for a given index.
     * @param batchIndex The batch index.
     * @return The StateBatch struct.
     */
    function getStateBatch(uint256 batchIndex) external view returns (StateBatch memory) {
        return stateBatches[batchIndex];
    }

    /**
     * @notice Check whether a state root has been finalized.
     * @param stateRoot The state root to check.
     * @return True if the state root exists and its batch is finalized.
     */
    function isStateRootFinalized(bytes32 stateRoot) external view returns (bool) {
        uint256 batchIndex = stateRootToBatchIndex[stateRoot];
        StateBatch storage batch = stateBatches[batchIndex];
        return batch.stateRoot == stateRoot && batch.finalized;
    }

    /**
     * @notice Check whether a batch is within the fraud proof window.
     * @param batchIndex The batch index.
     * @return True if the batch exists, is not finalized, and is within the window.
     */
    function isInFraudProofWindow(uint256 batchIndex) external view returns (bool) {
        StateBatch storage batch = stateBatches[batchIndex];
        if (batch.stateRoot == bytes32(0)) return false;
        if (batch.finalized || batch.challenged) return false;
        return block.timestamp < batch.timestamp + FRAUD_PROOF_WINDOW;
    }

    /**
     * @notice Get the latest submitted batch index (nextBatchIndex - 1).
     * @return The latest batch index, or reverts if no batches submitted.
     */
    function getLatestBatchIndex() external view returns (uint256) {
        require(nextBatchIndex > 0, "SCC: no batches submitted");
        return nextBatchIndex - 1;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @notice Set the BondManager contract address.
     * @param _bondManager The BondManager contract address.
     */
    function setBondManager(address _bondManager) external onlyOwner {
        if (_bondManager == address(0)) revert InvalidAddress();
        address old = bondManager;
        bondManager = _bondManager;
        emit BondManagerUpdated(old, _bondManager);
    }

    /**
     * @notice Set the FraudProver contract address.
     * @param _fraudProver The FraudProver contract address.
     */
    function setFraudProver(address _fraudProver) external onlyOwner {
        if (_fraudProver == address(0)) revert InvalidAddress();
        address old = fraudProver;
        fraudProver = _fraudProver;
        emit FraudProverUpdated(old, _fraudProver);
    }
}
