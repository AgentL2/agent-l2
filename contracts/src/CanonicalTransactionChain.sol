// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CanonicalTransactionChain
 * @notice L1 contract for L2 transaction data availability in the AgentL2 optimistic rollup.
 * @dev The sequencer posts compressed L2 transaction batches as calldata to this contract.
 *      This ensures data availability on L1 so that anyone can reconstruct L2 state and
 *      verify fraud proofs.
 *
 *      Each batch contains:
 *      - batchIndex: sequential batch index
 *      - txRoot: Merkle root of the transactions in the batch
 *      - prevTotalElements: total L2 transactions before this batch
 *      - batchSize: number of transactions in this batch
 *      - extraData: compressed transaction data (stored as calldata for gas efficiency)
 *
 *      Force inclusion mechanism:
 *      - Users can enqueue L1->L2 transactions if the sequencer censors them
 *      - If enqueued transactions are not included within FORCE_INCLUSION_PERIOD,
 *        anyone can force-include them in the next batch
 *
 *      Integrates with:
 *      - BondManager: checks sequencer collateralization
 *      - StateCommitmentChain: transaction batches correspond to state commitments
 */
contract CanonicalTransactionChain is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error InvalidBatchData();
    error InvalidBatchIndex();
    error InvalidAddress();
    error InvalidGasLimit();
    error SequencerNotCollateralized();
    error ForceInclusionPeriodNotPassed();
    error QueueEmpty();
    error BatchSizeTooLarge();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    /// @notice Maximum number of transactions in a single batch.
    uint256 public constant MAX_BATCH_SIZE = 10000;

    /// @notice Duration after which enqueued L1->L2 txs can be force-included.
    uint256 public constant FORCE_INCLUSION_PERIOD = 24 hours;

    /// @notice Maximum gas limit for an enqueued L1->L2 transaction.
    uint256 public constant MAX_ENQUEUE_GAS_LIMIT = 15_000_000;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    /// @notice A batch of L2 transactions posted by the sequencer.
    struct TransactionBatch {
        uint256 batchIndex;
        bytes32 txRoot;
        uint256 prevTotalElements;
        uint256 batchSize;
        uint256 timestamp;
        address submitter;
    }

    /// @notice An L1->L2 transaction enqueued by a user for force inclusion.
    struct QueuedTransaction {
        address sender;
        address target;
        uint256 gasLimit;
        bytes data;
        uint256 timestamp;
        bool included;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    /// @notice Address of the BondManager contract.
    address public bondManager;

    /// @notice The next expected batch index.
    uint256 public nextBatchIndex;

    /// @notice Total number of L2 transactions committed.
    uint256 public totalElements;

    /// @notice Mapping from batch index to transaction batch data.
    mapping(uint256 => TransactionBatch) public batches;

    /// @notice Queue of L1->L2 transactions for force inclusion.
    QueuedTransaction[] public transactionQueue;

    /// @notice Index of the next queue element to be included.
    uint256 public nextQueueIndex;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event TransactionBatchAppended(
        uint256 indexed batchIndex,
        bytes32 indexed txRoot,
        uint256 prevTotalElements,
        uint256 batchSize,
        address indexed submitter
    );

    event TransactionEnqueued(
        uint256 indexed queueIndex,
        address indexed sender,
        address indexed target,
        uint256 gasLimit,
        bytes data,
        uint256 timestamp
    );

    event QueueTransactionIncluded(
        uint256 indexed queueIndex,
        uint256 indexed batchIndex
    );

    event BondManagerUpdated(address indexed oldBondManager, address indexed newBondManager);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // Sequencer Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Append a batch of L2 transactions.
     * @dev The sequencer posts the transaction root and the raw transaction data
     *      as calldata. The txData is not stored in contract storage to save gas;
     *      it exists in the transaction's calldata for data availability.
     * @param txRoot Merkle root of the transactions in this batch.
     * @param batchSize Number of transactions in the batch.
     * @param txData Compressed/encoded transaction data (stored as calldata only).
     */
    function appendTransactionBatch(
        bytes32 txRoot,
        uint256 batchSize,
        bytes calldata txData
    ) external {
        if (txRoot == bytes32(0)) revert InvalidBatchData();
        if (batchSize == 0 || batchSize > MAX_BATCH_SIZE) revert BatchSizeTooLarge();

        // Check sequencer collateralization if BondManager is set
        if (bondManager != address(0)) {
            (bool success, bytes memory data) = bondManager.staticcall(
                abi.encodeWithSignature("isSequencerCollateralized(address)", msg.sender)
            );
            require(
                success && abi.decode(data, (bool)),
                "CTC: sequencer not collateralized"
            );
        }

        uint256 batchIndex = nextBatchIndex;

        batches[batchIndex] = TransactionBatch({
            batchIndex: batchIndex,
            txRoot: txRoot,
            prevTotalElements: totalElements,
            batchSize: batchSize,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        totalElements += batchSize;
        nextBatchIndex = batchIndex + 1;

        // Include any pending queue transactions that have passed the force inclusion period
        _includeQueuedTransactions(batchIndex);

        emit TransactionBatchAppended(batchIndex, txRoot, totalElements - batchSize, batchSize, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Force Inclusion (Anti-Censorship)
    // -------------------------------------------------------------------------

    /**
     * @notice Enqueue an L1->L2 transaction for force inclusion.
     * @dev Any user can call this to ensure their transaction is included on L2
     *      even if the sequencer tries to censor it. The sequencer must include
     *      enqueued transactions within FORCE_INCLUSION_PERIOD or anyone can
     *      force-include them.
     * @param target The L2 contract address to call.
     * @param gasLimit The gas limit for the L2 transaction.
     * @param data The calldata for the L2 transaction.
     */
    function enqueueTransaction(
        address target,
        uint256 gasLimit,
        bytes calldata data
    ) external {
        if (target == address(0)) revert InvalidAddress();
        if (gasLimit == 0 || gasLimit > MAX_ENQUEUE_GAS_LIMIT) revert InvalidGasLimit();

        uint256 queueIndex = transactionQueue.length;

        transactionQueue.push(QueuedTransaction({
            sender: msg.sender,
            target: target,
            gasLimit: gasLimit,
            data: data,
            timestamp: block.timestamp,
            included: false
        }));

        emit TransactionEnqueued(queueIndex, msg.sender, target, gasLimit, data, block.timestamp);
    }

    /**
     * @notice Force-include pending queue transactions that have passed the inclusion period.
     * @dev Anyone can call this if the sequencer has not included pending transactions
     *      within FORCE_INCLUSION_PERIOD. Creates a batch containing only the queued
     *      transactions.
     */
    function forceIncludeQueuedTransactions() external {
        if (nextQueueIndex >= transactionQueue.length) revert QueueEmpty();

        QueuedTransaction storage queuedTx = transactionQueue[nextQueueIndex];
        if (block.timestamp < queuedTx.timestamp + FORCE_INCLUSION_PERIOD) {
            revert ForceInclusionPeriodNotPassed();
        }

        // Count how many queue elements can be force-included
        uint256 count = 0;
        for (uint256 i = nextQueueIndex; i < transactionQueue.length; i++) {
            if (block.timestamp >= transactionQueue[i].timestamp + FORCE_INCLUSION_PERIOD) {
                count++;
            } else {
                break;
            }
        }

        if (count == 0) revert QueueEmpty();

        // Create a force-inclusion batch
        uint256 batchIndex = nextBatchIndex;

        // Compute a tx root from the queued transactions
        bytes32 txRoot = _computeQueueTxRoot(nextQueueIndex, count);

        batches[batchIndex] = TransactionBatch({
            batchIndex: batchIndex,
            txRoot: txRoot,
            prevTotalElements: totalElements,
            batchSize: count,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        // Mark queue elements as included
        for (uint256 i = 0; i < count; i++) {
            transactionQueue[nextQueueIndex + i].included = true;
            emit QueueTransactionIncluded(nextQueueIndex + i, batchIndex);
        }

        totalElements += count;
        nextBatchIndex = batchIndex + 1;
        nextQueueIndex += count;

        emit TransactionBatchAppended(batchIndex, txRoot, totalElements - count, count, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /**
     * @notice Include queued transactions that have passed the force inclusion period.
     * @dev Called automatically when the sequencer appends a batch.
     * @param batchIndex The current batch index (for event logging).
     */
    function _includeQueuedTransactions(uint256 batchIndex) internal {
        while (nextQueueIndex < transactionQueue.length) {
            QueuedTransaction storage queuedTx = transactionQueue[nextQueueIndex];
            if (queuedTx.included) {
                nextQueueIndex++;
                continue;
            }
            if (block.timestamp < queuedTx.timestamp + FORCE_INCLUSION_PERIOD) {
                break;
            }

            queuedTx.included = true;
            emit QueueTransactionIncluded(nextQueueIndex, batchIndex);
            nextQueueIndex++;
        }
    }

    /**
     * @notice Compute a Merkle root for queued transactions.
     * @dev Simplified: hashes queued transaction data sequentially. In production,
     *      this would build a proper Merkle tree.
     * @param startIndex First queue index.
     * @param count Number of queue elements.
     * @return root The computed transaction root.
     */
    function _computeQueueTxRoot(uint256 startIndex, uint256 count) internal view returns (bytes32 root) {
        root = bytes32(0);
        for (uint256 i = 0; i < count; i++) {
            QueuedTransaction storage qtx = transactionQueue[startIndex + i];
            root = keccak256(abi.encodePacked(
                root,
                qtx.sender,
                qtx.target,
                qtx.gasLimit,
                keccak256(qtx.data)
            ));
        }
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Get a transaction batch by index.
     * @param batchIndex The batch index.
     * @return The TransactionBatch struct.
     */
    function getBatch(uint256 batchIndex) external view returns (TransactionBatch memory) {
        return batches[batchIndex];
    }

    /**
     * @notice Get the total number of enqueued L1->L2 transactions.
     * @return The length of the transaction queue.
     */
    function getQueueLength() external view returns (uint256) {
        return transactionQueue.length;
    }

    /**
     * @notice Get the number of pending (not yet included) queue transactions.
     * @return The number of pending transactions.
     */
    function getPendingQueueCount() external view returns (uint256) {
        return transactionQueue.length - nextQueueIndex;
    }

    /**
     * @notice Get a queued transaction by index.
     * @param queueIndex The queue index.
     * @return sender The sender of the enqueued transaction.
     * @return target The target address on L2.
     * @return gasLimit The gas limit for the L2 transaction.
     * @return data The calldata for the L2 transaction.
     * @return timestamp The timestamp when the transaction was enqueued.
     * @return included Whether the transaction has been included in a batch.
     */
    function getQueuedTransaction(uint256 queueIndex) external view returns (
        address sender,
        address target,
        uint256 gasLimit,
        bytes memory data,
        uint256 timestamp,
        bool included
    ) {
        QueuedTransaction storage qtx = transactionQueue[queueIndex];
        return (qtx.sender, qtx.target, qtx.gasLimit, qtx.data, qtx.timestamp, qtx.included);
    }

    /**
     * @notice Get the latest batch index.
     * @return The latest batch index.
     */
    function getLatestBatchIndex() external view returns (uint256) {
        require(nextBatchIndex > 0, "CTC: no batches submitted");
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
}
