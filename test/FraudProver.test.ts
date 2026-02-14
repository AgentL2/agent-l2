import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("FraudProver", function () {
  async function deployFixture() {
    const [owner, sequencer, challenger, user1] = await ethers.getSigners();

    // Deploy BondManager
    const BondManagerFactory = await ethers.getContractFactory("BondManager");
    const bondManager = await BondManagerFactory.deploy();

    // Deploy StateCommitmentChain
    const SCCFactory = await ethers.getContractFactory("StateCommitmentChain");
    const scc = await SCCFactory.deploy();

    // Deploy CanonicalTransactionChain
    const CTCFactory = await ethers.getContractFactory("CanonicalTransactionChain");
    const ctc = await CTCFactory.deploy();

    // Deploy FraudProver
    const FPFactory = await ethers.getContractFactory("FraudProver");
    const fraudProver = await FPFactory.deploy();

    const bondManagerAddr = await bondManager.getAddress();
    const sccAddr = await scc.getAddress();
    const ctcAddr = await ctc.getAddress();
    const fpAddr = await fraudProver.getAddress();

    // Wire up contracts
    await fraudProver.setStateCommitmentChain(sccAddr);
    await fraudProver.setBondManager(bondManagerAddr);
    await fraudProver.setCanonicalTransactionChain(ctcAddr);

    await scc.setBondManager(bondManagerAddr);
    await scc.setFraudProver(fpAddr);

    await ctc.setBondManager(bondManagerAddr);

    await bondManager.setFraudProver(fpAddr);

    // Sequencer posts bond
    await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("5") });

    return {
      fraudProver,
      scc,
      ctc,
      bondManager,
      owner,
      sequencer,
      challenger,
      user1,
    };
  }

  /**
   * Helper: submit two state batches from the sequencer (batch 0 and batch 1)
   * so that fraud proofs against batch 1 can reference batch 0's state root as
   * the valid pre-state root.
   */
  async function deployWithBatches() {
    const base = await deployFixture();
    const { scc, sequencer } = base;

    const stateRoot0 = ethers.keccak256(ethers.toUtf8Bytes("state0"));
    const stateRoot1 = ethers.keccak256(ethers.toUtf8Bytes("state1-fraud"));

    await scc.connect(sequencer).appendStateBatch(stateRoot0);
    await scc.connect(sequencer).appendStateBatch(stateRoot1);

    return { ...base, stateRoot0, stateRoot1 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { fraudProver, owner } = await loadFixture(deployFixture);
      expect(await fraudProver.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      const { fraudProver } = await loadFixture(deployFixture);
      expect(await fraudProver.CHALLENGE_RESOLUTION_PERIOD()).to.equal(2 * 24 * 60 * 60);
      expect(await fraudProver.MIN_CHALLENGER_BOND()).to.equal(ethers.parseEther("0.1"));
    });

    it("Should start with zero challenges", async function () {
      const { fraudProver } = await loadFixture(deployFixture);
      expect(await fraudProver.totalChallenges()).to.equal(0);
      expect(await fraudProver.totalSuccessfulFraudProofs()).to.equal(0);
    });
  });

  describe("Challenge Initiation", function () {
    it("Should allow initiating a challenge with sufficient bond", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      // Submit a state batch
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));

      await expect(
        fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
          value: ethers.parseEther("0.1"),
        })
      ).to.emit(fraudProver, "ChallengeInitiated");
    });

    it("Should increment total challenges", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      await fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
        value: ethers.parseEther("0.1"),
      });

      expect(await fraudProver.totalChallenges()).to.equal(1);
    });

    it("Should reject challenge with insufficient bond", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      await expect(
        fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
          value: ethers.parseEther("0.05"),
        })
      ).to.be.revertedWithCustomError(fraudProver, "InsufficientChallengerBond");
    });

    it("Should reject challenge with zero claimed state root", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(
        fraudProver.connect(challenger).initiateChallenge(0, ethers.ZeroHash, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWithCustomError(fraudProver, "InvalidPreStateRoot");
    });

    it("Should reject duplicate challenge on same batch", async function () {
      const { fraudProver, scc, sequencer, challenger, user1 } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      await fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
        value: ethers.parseEther("0.1"),
      });

      const claimedRoot2 = ethers.keccak256(ethers.toUtf8Bytes("another-root"));
      // SCC marks batch as challenged first, so _verifyBatchChallengeable fails before duplicate check
      await expect(
        fraudProver.connect(user1).initiateChallenge(0, claimedRoot2, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.reverted;
    });

    it("Should report active challenge", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      await fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
        value: ethers.parseEther("0.1"),
      });

      expect(await fraudProver.hasActiveChallenge(0)).to.be.true;
    });
  });

  describe("Fraud Proof Submission", function () {
    it("Should submit a valid fraud proof for batch 1", async function () {
      const { fraudProver, scc, sequencer, challenger, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));

      // Initiate challenge on batch 1
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      // Submit fraud proof with pre-state = stateRoot0 (previous batch)
      const proof = ethers.toUtf8Bytes("fraud-proof-data-with-computation-trace");

      await expect(
        fraudProver
          .connect(challenger)
          .submitFraudProof(challengeId, stateRoot0, claimedRoot, proof)
      ).to.emit(fraudProver, "ChallengeResolved");
    });

    it("Should reject fraud proof from non-challenger", async function () {
      const { fraudProver, scc, sequencer, challenger, user1, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      const proof = ethers.toUtf8Bytes("proof-data");
      await expect(
        fraudProver.connect(user1).submitFraudProof(challengeId, stateRoot0, claimedRoot, proof)
      ).to.be.revertedWithCustomError(fraudProver, "OnlyChallenger");
    });

    it("Should reject fraud proof with invalid pre-state root", async function () {
      const { fraudProver, scc, sequencer, challenger, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      const wrongPreState = ethers.keccak256(ethers.toUtf8Bytes("wrong-prestate"));
      const proof = ethers.toUtf8Bytes("proof-data");
      await expect(
        fraudProver.connect(challenger).submitFraudProof(challengeId, wrongPreState, claimedRoot, proof)
      ).to.be.revertedWithCustomError(fraudProver, "InvalidPreStateRoot");
    });

    it("Should reject fraud proof with empty proof data", async function () {
      const { fraudProver, scc, sequencer, challenger, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      // Empty proof should cause the fraud proof verification to fail (not valid)
      // The challenge resolves as unsuccessful (challenger loses bond)
      await expect(
        fraudProver.connect(challenger).submitFraudProof(challengeId, stateRoot0, claimedRoot, "0x")
      ).to.emit(fraudProver, "ChallengeResolved");

      // Verify challenge was marked as unsuccessful
      const challenge = await fraudProver.getChallenge(challengeId);
      expect(challenge.resolved).to.be.true;
      expect(challenge.successful).to.be.false;
    });

    it("Should reject fraud proof after resolution period", async function () {
      const { fraudProver, scc, sequencer, challenger, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      // Advance time past resolution period
      await time.increase(2 * 24 * 60 * 60 + 1);

      const proof = ethers.toUtf8Bytes("proof-data");
      await expect(
        fraudProver.connect(challenger).submitFraudProof(challengeId, stateRoot0, claimedRoot, proof)
      ).to.be.revertedWithCustomError(fraudProver, "ChallengeWindowExpired");
    });
  });

  describe("Expired Challenge Resolution", function () {
    it("Should allow resolving expired challenge", async function () {
      const { fraudProver, scc, sequencer, challenger, user1, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      // Advance time past resolution period
      await time.increase(2 * 24 * 60 * 60 + 1);

      await expect(fraudProver.connect(user1).resolveExpiredChallenge(challengeId))
        .to.emit(fraudProver, "ChallengeResolved")
        .withArgs(challengeId, 1, false, challenger.address, sequencer.address);
    });

    it("Should not resolve challenge before expiry", async function () {
      const { fraudProver, scc, sequencer, challenger, user1, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      await expect(
        fraudProver.connect(user1).resolveExpiredChallenge(challengeId)
      ).to.be.revertedWithCustomError(fraudProver, "ResolutionPeriodNotPassed");
    });

    it("Should not resolve already resolved challenge", async function () {
      const { fraudProver, scc, sequencer, challenger, user1, stateRoot0, stateRoot1 } =
        await loadFixture(deployWithBatches);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state1"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(1, claimedRoot, {
        value: ethers.parseEther("0.2"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      await time.increase(2 * 24 * 60 * 60 + 1);
      await fraudProver.connect(user1).resolveExpiredChallenge(challengeId);

      await expect(
        fraudProver.connect(user1).resolveExpiredChallenge(challengeId)
      ).to.be.revertedWithCustomError(fraudProver, "ChallengeAlreadyResolved");
    });
  });

  describe("Views", function () {
    it("Should return correct challenge data", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      const tx = await fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
        value: ethers.parseEther("0.15"),
      });
      const receipt = await tx.wait();
      const events = await fraudProver.queryFilter(
        fraudProver.filters.ChallengeInitiated(),
        receipt!.blockNumber,
        receipt!.blockNumber
      );
      const challengeId = events[0].args?.challengeId;

      const challenge = await fraudProver.getChallenge(challengeId);
      expect(challenge.challenger).to.equal(challenger.address);
      expect(challenge.batchIndex).to.equal(0);
      expect(challenge.claimedStateRoot).to.equal(claimedRoot);
      expect(challenge.disputedStateRoot).to.equal(stateRoot);
      expect(challenge.sequencer).to.equal(sequencer.address);
      expect(challenge.challengerBond).to.equal(ethers.parseEther("0.15"));
      expect(challenge.resolved).to.be.false;
      expect(challenge.successful).to.be.false;
    });

    it("Should correctly track active challenges", async function () {
      const { fraudProver, scc, sequencer, challenger } = await loadFixture(deployFixture);

      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("disputed-state"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      expect(await fraudProver.hasActiveChallenge(0)).to.be.false;

      const claimedRoot = ethers.keccak256(ethers.toUtf8Bytes("correct-state"));
      await fraudProver.connect(challenger).initiateChallenge(0, claimedRoot, {
        value: ethers.parseEther("0.1"),
      });

      expect(await fraudProver.hasActiveChallenge(0)).to.be.true;
    });
  });

  describe("Admin", function () {
    it("Should allow owner to set StateCommitmentChain", async function () {
      const { fraudProver, owner, user1 } = await loadFixture(deployFixture);
      await expect(fraudProver.connect(owner).setStateCommitmentChain(user1.address))
        .to.emit(fraudProver, "StateCommitmentChainUpdated");
    });

    it("Should allow owner to set BondManager", async function () {
      const { fraudProver, owner, user1 } = await loadFixture(deployFixture);
      await expect(fraudProver.connect(owner).setBondManager(user1.address))
        .to.emit(fraudProver, "BondManagerUpdated");
    });

    it("Should allow owner to set CanonicalTransactionChain", async function () {
      const { fraudProver, owner, user1 } = await loadFixture(deployFixture);
      await expect(fraudProver.connect(owner).setCanonicalTransactionChain(user1.address))
        .to.emit(fraudProver, "CanonicalTransactionChainUpdated");
    });

    it("Should reject zero address for admin setters", async function () {
      const { fraudProver, owner } = await loadFixture(deployFixture);
      await expect(fraudProver.connect(owner).setStateCommitmentChain(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(fraudProver, "InvalidAddress");
      await expect(fraudProver.connect(owner).setBondManager(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(fraudProver, "InvalidAddress");
      await expect(fraudProver.connect(owner).setCanonicalTransactionChain(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(fraudProver, "InvalidAddress");
    });

    it("Should reject non-owner admin calls", async function () {
      const { fraudProver, user1 } = await loadFixture(deployFixture);
      await expect(fraudProver.connect(user1).setStateCommitmentChain(user1.address)).to.be.reverted;
      await expect(fraudProver.connect(user1).setBondManager(user1.address)).to.be.reverted;
      await expect(fraudProver.connect(user1).setCanonicalTransactionChain(user1.address)).to.be.reverted;
    });
  });
});
