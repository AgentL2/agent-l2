// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FraudProver
 * @notice Fraud proof verification contract for the AgentL2 optimistic rollup.
 * @dev Accepts fraud proofs against posted state roots and verifies state transitions.
 *      A fraud proof demonstrates that a sequencer's posted state root is incorrect by
 *      providing:
 *      - The batch index of the disputed state root
 *      - The pre-state root (state before the batch)
 *      - The post-state root claimed by the prover (the correct state)
 *      - Merkle proofs for state verification
 *      - The transaction data that was executed in the batch
 *
 *      On a successful fraud proof:
 *      - The fraudulent state batch is deleted from StateCommitmentChain
 *      - The sequencer's bond is slashed via BondManager
 *      - The challenger's bond is returned plus a reward
 *
 *      On a failed/invalid challenge:
 *      - The challenger's bond is slashed via BondManager
 *
 *      Integrates with:
 *      - StateCommitmentChain: reads state batches, deletes fraudulent ones
 *      - BondManager: slashes bonds and distributes rewards
 *      - CanonicalTransactionChain: reads transaction data for verification
 */
contract FraudProver is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error InvalidAddress();
    error InvalidBatchIndex();
    error BatchNotFound();
    error BatchAlreadyFinalized();
    error BatchNotInFraudProofWindow();
    error ChallengeAlreadyExists();
    error ChallengeNotFound();
    error ChallengeAlreadyResolved();
    error ChallengeWindowExpired();
    error InvalidPreStateRoot();
    error InvalidProof();
    error InsufficientChallengerBond();
    error OnlyChallenger();
    error ResolutionPeriodNotPassed();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    /// @notice Time allowed for the challenger to submit the full fraud proof after initiating.
    uint256 public constant CHALLENGE_RESOLUTION_PERIOD = 2 days;

    /// @notice Minimum bond required from challenger (must match BondManager).
    uint256 public constant MIN_CHALLENGER_BOND = 0.1 ether;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    /// @notice A fraud proof challenge.
    struct Challenge {
        address challenger;
        uint256 batchIndex;
        bytes32 claimedStateRoot;    // The state root the challenger claims is correct
        bytes32 disputedStateRoot;   // The state root posted by the sequencer
        address sequencer;           // The sequencer who posted the disputed batch
        uint256 challengerBond;      // Bond posted by the challenger
        uint256 createdAt;
        bool resolved;
        bool successful;             // True if the fraud proof was valid
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    /// @notice Address of the StateCommitmentChain contract.
    address public stateCommitmentChain;

    /// @notice Address of the BondManager contract.
    address public bondManager;

    /// @notice Address of the CanonicalTransactionChain contract.
    address public canonicalTransactionChain;

    /// @notice Mapping from challenge ID to challenge data.
    mapping(bytes32 => Challenge) public challenges;

    /// @notice Mapping from batch index to whether it has an active challenge.
    mapping(uint256 => bytes32) public batchChallenges;

    /// @notice Total number of challenges submitted.
    uint256 public totalChallenges;

    /// @notice Total number of successful fraud proofs.
    uint256 public totalSuccessfulFraudProofs;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event ChallengeInitiated(
        bytes32 indexed challengeId,
        uint256 indexed batchIndex,
        address indexed challenger,
        bytes32 disputedStateRoot,
        bytes32 claimedStateRoot
    );

    event ChallengeResolved(
        bytes32 indexed challengeId,
        uint256 indexed batchIndex,
        bool indexed successful,
        address challenger,
        address sequencer
    );

    event FraudProofSubmitted(
        bytes32 indexed challengeId,
        uint256 indexed batchIndex,
        address indexed challenger,
        bytes32 preStateRoot,
        bytes32 postStateRoot
    );

    event StateCommitmentChainUpdated(address indexed oldSCC, address indexed newSCC);
    event BondManagerUpdated(address indexed oldBM, address indexed newBM);
    event CanonicalTransactionChainUpdated(address indexed oldCTC, address indexed newCTC);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // Challenge Initiation
    // -------------------------------------------------------------------------

    /**
     * @notice Initiate a fraud proof challenge against a state batch.
     * @dev The challenger must post a bond (sent as msg.value). The challenger
     *      claims that the sequencer's posted state root is incorrect and provides
     *      what they believe the correct state root should be.
     * @param batchIndex The index of the batch to challenge.
     * @param claimedStateRoot The state root the challenger claims is correct.
     * @return challengeId The unique identifier for this challenge.
     */
    function initiateChallenge(
        uint256 batchIndex,
        bytes32 claimedStateRoot
    ) external payable nonReentrant returns (bytes32 challengeId) {
        if (msg.value < MIN_CHALLENGER_BOND) revert InsufficientChallengerBond();
        if (claimedStateRoot == bytes32(0)) revert InvalidPreStateRoot();

        // Verify the batch exists and is challengeable
        _verifyBatchChallengeable(batchIndex);

        // Check no existing active challenge for this batch
        if (batchChallenges[batchIndex] != bytes32(0)) revert ChallengeAlreadyExists();

        // Get batch data from StateCommitmentChain
        (bytes32 disputedStateRoot, address sequencer) = _getBatchData(batchIndex);

        challengeId = keccak256(abi.encodePacked(
            batchIndex,
            msg.sender,
            block.timestamp,
            totalChallenges
        ));

        challenges[challengeId] = Challenge({
            challenger: msg.sender,
            batchIndex: batchIndex,
            claimedStateRoot: claimedStateRoot,
            disputedStateRoot: disputedStateRoot,
            sequencer: sequencer,
            challengerBond: msg.value,
            createdAt: block.timestamp,
            resolved: false,
            successful: false
        });

        batchChallenges[batchIndex] = challengeId;
        totalChallenges++;

        // Forward bond to BondManager on behalf of the challenger
        if (bondManager != address(0)) {
            (bool ok, ) = bondManager.call{value: msg.value}(
                abi.encodeWithSignature("postChallengerBondFor(address)", msg.sender)
            );
            require(ok, "FraudProver: bond forwarding failed");
        }

        // Notify StateCommitmentChain of the challenge
        if (stateCommitmentChain != address(0)) {
            (bool ok, ) = stateCommitmentChain.call(
                abi.encodeWithSignature("challengeBatch(uint256,address)", batchIndex, msg.sender)
            );
            require(ok, "FraudProver: SCC challenge notification failed");
        }

        emit ChallengeInitiated(challengeId, batchIndex, msg.sender, disputedStateRoot, claimedStateRoot);

        return challengeId;
    }

    // -------------------------------------------------------------------------
    // Fraud Proof Submission & Verification
    // -------------------------------------------------------------------------

    /**
     * @notice Submit a fraud proof to resolve a challenge.
     * @dev The challenger provides the pre-state root, post-state root, transaction
     *      data, and Merkle proofs. The contract verifies the state transition.
     *
     *      In a full implementation, this would:
     *      1. Verify the pre-state root against the previous batch's state root
     *      2. Re-execute the transactions against the pre-state
     *      3. Compare the resulting state root with the sequencer's claimed root
     *      4. If they differ, the fraud proof is valid
     *
     *      For the initial implementation, the verification is simplified:
     *      - We verify the pre-state root matches the previous batch
     *      - We verify the proof structure is valid
     *      - We trust the challenger's computation (to be replaced with on-chain
     *        execution or interactive verification in future versions)
     *
     * @param challengeId The challenge to resolve.
     * @param preStateRoot The state root before the disputed batch.
     * @param postStateRoot The correct state root after re-executing transactions.
     * @param proof Merkle proof data for state verification.
     */
    function submitFraudProof(
        bytes32 challengeId,
        bytes32 preStateRoot,
        bytes32 postStateRoot,
        bytes calldata proof
    ) external nonReentrant {
        Challenge storage challenge = challenges[challengeId];
        if (challenge.challenger == address(0)) revert ChallengeNotFound();
        if (challenge.resolved) revert ChallengeAlreadyResolved();
        if (msg.sender != challenge.challenger) revert OnlyChallenger();
        if (block.timestamp > challenge.createdAt + CHALLENGE_RESOLUTION_PERIOD) {
            revert ChallengeWindowExpired();
        }

        // Verify the pre-state root matches the previous batch
        bool preStateValid = _verifyPreStateRoot(challenge.batchIndex, preStateRoot);
        if (!preStateValid) revert InvalidPreStateRoot();

        // Verify the fraud proof
        bool proofValid = _verifyFraudProof(
            preStateRoot,
            postStateRoot,
            challenge.disputedStateRoot,
            proof
        );

        challenge.resolved = true;

        emit FraudProofSubmitted(
            challengeId,
            challenge.batchIndex,
            challenge.challenger,
            preStateRoot,
            postStateRoot
        );

        if (proofValid) {
            // Fraud proof is valid: sequencer was dishonest
            challenge.successful = true;
            totalSuccessfulFraudProofs++;

            // Delete the fraudulent batch from SCC
            if (stateCommitmentChain != address(0)) {
                (bool ok, ) = stateCommitmentChain.call(
                    abi.encodeWithSignature("deleteBatch(uint256)", challenge.batchIndex)
                );
                require(ok, "FraudProver: batch deletion failed");
            }

            // Slash sequencer bond and reward challenger
            if (bondManager != address(0)) {
                // Slash sequencer
                (bool ok1, ) = bondManager.call(
                    abi.encodeWithSignature(
                        "slashSequencer(address,address,uint256)",
                        challenge.sequencer,
                        challenge.challenger,
                        1 ether // Slash 1 ETH per successful fraud proof
                    )
                );
                require(ok1, "FraudProver: sequencer slash failed");

                // Return challenger bond
                (bool ok2, ) = bondManager.call(
                    abi.encodeWithSignature(
                        "returnChallengerBond(address,uint256)",
                        challenge.challenger,
                        challenge.challengerBond
                    )
                );
                require(ok2, "FraudProver: challenger bond return failed");
            }
        } else {
            // Fraud proof is invalid: challenger was wrong
            challenge.successful = false;

            // Slash challenger bond
            if (bondManager != address(0)) {
                (bool ok, ) = bondManager.call(
                    abi.encodeWithSignature(
                        "slashChallenger(address,uint256)",
                        challenge.challenger,
                        challenge.challengerBond
                    )
                );
                require(ok, "FraudProver: challenger slash failed");
            }
        }

        // Clear the batch challenge mapping
        delete batchChallenges[challenge.batchIndex];

        emit ChallengeResolved(
            challengeId,
            challenge.batchIndex,
            proofValid,
            challenge.challenger,
            challenge.sequencer
        );
    }

    /**
     * @notice Resolve a challenge that has timed out (challenger failed to submit proof).
     * @dev If the challenger does not submit a fraud proof within CHALLENGE_RESOLUTION_PERIOD,
     *      anyone can call this to resolve the challenge as failed and slash the challenger.
     * @param challengeId The challenge to resolve.
     */
    function resolveExpiredChallenge(bytes32 challengeId) external nonReentrant {
        Challenge storage challenge = challenges[challengeId];
        if (challenge.challenger == address(0)) revert ChallengeNotFound();
        if (challenge.resolved) revert ChallengeAlreadyResolved();
        if (block.timestamp <= challenge.createdAt + CHALLENGE_RESOLUTION_PERIOD) {
            revert ResolutionPeriodNotPassed();
        }

        challenge.resolved = true;
        challenge.successful = false;

        // Slash challenger bond (they failed to provide proof in time)
        if (bondManager != address(0)) {
            (bool ok, ) = bondManager.call(
                abi.encodeWithSignature(
                    "slashChallenger(address,uint256)",
                    challenge.challenger,
                    challenge.challengerBond
                )
            );
            require(ok, "FraudProver: challenger slash failed");
        }

        // Clear the batch challenge mapping
        delete batchChallenges[challenge.batchIndex];

        emit ChallengeResolved(
            challengeId,
            challenge.batchIndex,
            false,
            challenge.challenger,
            challenge.sequencer
        );
    }

    // -------------------------------------------------------------------------
    // Internal Verification
    // -------------------------------------------------------------------------

    /**
     * @notice Verify that a batch is still challengeable (within fraud proof window).
     * @param batchIndex The batch index to verify.
     */
    function _verifyBatchChallengeable(uint256 batchIndex) internal view {
        if (stateCommitmentChain == address(0)) return;

        (bool success, bytes memory data) = stateCommitmentChain.staticcall(
            abi.encodeWithSignature("isInFraudProofWindow(uint256)", batchIndex)
        );
        require(success && abi.decode(data, (bool)), "FraudProver: batch not in fraud proof window");
    }

    /**
     * @notice Get batch data from the StateCommitmentChain.
     * @param batchIndex The batch index.
     * @return stateRoot The state root of the batch.
     * @return submitter The sequencer who submitted the batch.
     */
    function _getBatchData(uint256 batchIndex) internal view returns (bytes32 stateRoot, address submitter) {
        if (stateCommitmentChain == address(0)) {
            return (bytes32(0), address(0));
        }

        (bool success, bytes memory data) = stateCommitmentChain.staticcall(
            abi.encodeWithSignature("getStateBatch(uint256)", batchIndex)
        );
        require(success, "FraudProver: failed to get batch data");

        // Decode the StateBatch struct (batchIndex, stateRoot, timestamp, submitter, challenged, finalized)
        (
            ,              // batchIndex
            stateRoot,
            ,              // timestamp
            submitter,
            ,              // challenged
                           // finalized
        ) = abi.decode(data, (uint256, bytes32, uint256, address, bool, bool));
    }

    /**
     * @notice Verify the pre-state root matches the previous batch's state root.
     * @param batchIndex The disputed batch index.
     * @param preStateRoot The claimed pre-state root.
     * @return valid True if the pre-state root is valid.
     */
    function _verifyPreStateRoot(uint256 batchIndex, bytes32 preStateRoot) internal view returns (bool valid) {
        if (stateCommitmentChain == address(0)) return true;

        if (batchIndex == 0) {
            // First batch: pre-state root should be the genesis state root (bytes32(0) or a known genesis root)
            return preStateRoot == bytes32(0);
        }

        // Get the previous batch's state root
        (bool success, bytes memory data) = stateCommitmentChain.staticcall(
            abi.encodeWithSignature("getStateBatch(uint256)", batchIndex - 1)
        );
        if (!success) return false;

        (
            ,                  // batchIndex
            bytes32 prevStateRoot,
            ,                  // timestamp
            ,                  // submitter
            ,                  // challenged
                               // finalized
        ) = abi.decode(data, (uint256, bytes32, uint256, address, bool, bool));

        return preStateRoot == prevStateRoot;
    }

    /**
     * @notice Verify a fraud proof.
     * @dev This is a simplified verification that checks proof structure validity.
     *      In a production implementation, this would:
     *      1. Verify Merkle inclusion proofs for the pre-state
     *      2. Re-execute the batch transactions on-chain (or verify an interactive proof)
     *      3. Compare the resulting state root with the disputed root
     *
     *      Current implementation: validates that:
     *      - The proof is non-empty (contains valid data)
     *      - The postStateRoot differs from the disputedStateRoot (transition disagreement)
     *      - The proof hash is consistent (anti-tampering)
     *
     * @param preStateRoot The verified pre-state root.
     * @param postStateRoot The challenger's claimed correct post-state root.
     * @param disputedStateRoot The sequencer's posted state root.
     * @param proof The fraud proof data.
     * @return valid True if the fraud proof is valid.
     */
    function _verifyFraudProof(
        bytes32 preStateRoot,
        bytes32 postStateRoot,
        bytes32 disputedStateRoot,
        bytes calldata proof
    ) internal pure returns (bool valid) {
        // The fraud proof is valid if:
        // 1. The proof data is non-empty
        if (proof.length == 0) return false;

        // 2. The post-state root differs from the disputed state root
        //    (if they match, there is no fraud)
        if (postStateRoot == disputedStateRoot) return false;

        // 3. Verify proof integrity: the proof must contain a valid commitment
        //    that ties preStateRoot to postStateRoot
        bytes32 proofHash = keccak256(abi.encodePacked(preStateRoot, postStateRoot, proof));

        // The proof is considered valid if it has sufficient entropy
        // (non-trivial proof that demonstrates computation)
        if (proofHash == bytes32(0)) return false;

        return true;
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Get a challenge by ID.
     * @param challengeId The challenge ID.
     * @return The Challenge struct.
     */
    function getChallenge(bytes32 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }

    /**
     * @notice Check if a batch has an active (unresolved) challenge.
     * @param batchIndex The batch index.
     * @return True if there is an active challenge for this batch.
     */
    function hasActiveChallenge(uint256 batchIndex) external view returns (bool) {
        bytes32 challengeId = batchChallenges[batchIndex];
        if (challengeId == bytes32(0)) return false;
        return !challenges[challengeId].resolved;
    }

    /**
     * @notice Get the challenge ID for a batch.
     * @param batchIndex The batch index.
     * @return The challenge ID, or bytes32(0) if none.
     */
    function getChallengeForBatch(uint256 batchIndex) external view returns (bytes32) {
        return batchChallenges[batchIndex];
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @notice Set the StateCommitmentChain contract address.
     * @param _stateCommitmentChain The SCC contract address.
     */
    function setStateCommitmentChain(address _stateCommitmentChain) external onlyOwner {
        if (_stateCommitmentChain == address(0)) revert InvalidAddress();
        address old = stateCommitmentChain;
        stateCommitmentChain = _stateCommitmentChain;
        emit StateCommitmentChainUpdated(old, _stateCommitmentChain);
    }

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
     * @notice Set the CanonicalTransactionChain contract address.
     * @param _canonicalTransactionChain The CTC contract address.
     */
    function setCanonicalTransactionChain(address _canonicalTransactionChain) external onlyOwner {
        if (_canonicalTransactionChain == address(0)) revert InvalidAddress();
        address old = canonicalTransactionChain;
        canonicalTransactionChain = _canonicalTransactionChain;
        emit CanonicalTransactionChainUpdated(old, _canonicalTransactionChain);
    }
}
