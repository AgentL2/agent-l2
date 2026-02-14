import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("StateCommitmentChain", function () {
  async function deployFixture() {
    const [owner, sequencer, fraudProver, challenger, user1] = await ethers.getSigners();

    // Deploy BondManager
    const BondManagerFactory = await ethers.getContractFactory("BondManager");
    const bondManager = await BondManagerFactory.deploy();

    // Deploy StateCommitmentChain
    const SCCFactory = await ethers.getContractFactory("StateCommitmentChain");
    const scc = await SCCFactory.deploy();

    // Configure SCC
    await scc.setBondManager(await bondManager.getAddress());
    await scc.setFraudProver(fraudProver.address);

    // Configure BondManager
    await bondManager.setFraudProver(fraudProver.address);

    // Sequencer posts bond
    await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });

    return { scc, bondManager, owner, sequencer, fraudProver, challenger, user1 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { scc, owner } = await loadFixture(deployFixture);
      expect(await scc.owner()).to.equal(owner.address);
    });

    it("Should start with nextBatchIndex at 0", async function () {
      const { scc } = await loadFixture(deployFixture);
      expect(await scc.nextBatchIndex()).to.equal(0);
    });

    it("Should have correct fraud proof window", async function () {
      const { scc } = await loadFixture(deployFixture);
      expect(await scc.FRAUD_PROOF_WINDOW()).to.equal(7 * 24 * 60 * 60);
    });
  });

  describe("Appending State Batches", function () {
    it("Should append a state batch from collateralized sequencer", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));

      await expect(scc.connect(sequencer).appendStateBatch(stateRoot))
        .to.emit(scc, "StateBatchAppended")
        .withArgs(0, stateRoot, sequencer.address, await time.latest() + 1);
    });

    it("Should increment batch index", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const root1 = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      const root2 = ethers.keccak256(ethers.toUtf8Bytes("state2"));

      await scc.connect(sequencer).appendStateBatch(root1);
      await scc.connect(sequencer).appendStateBatch(root2);

      expect(await scc.nextBatchIndex()).to.equal(2);
    });

    it("Should reject zero state root", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      await expect(
        scc.connect(sequencer).appendStateBatch(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(scc, "InvalidStateRoot");
    });

    it("Should reject non-collateralized sequencer", async function () {
      const { scc, user1 } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await expect(scc.connect(user1).appendStateBatch(stateRoot))
        .to.be.revertedWith("SCC: sequencer not collateralized");
    });

    it("Should append multiple state batches at once", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const roots = [
        ethers.keccak256(ethers.toUtf8Bytes("state1")),
        ethers.keccak256(ethers.toUtf8Bytes("state2")),
        ethers.keccak256(ethers.toUtf8Bytes("state3")),
      ];

      await scc.connect(sequencer).appendStateBatches(roots);
      expect(await scc.nextBatchIndex()).to.equal(3);
    });

    it("Should store correct batch data", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));

      await scc.connect(sequencer).appendStateBatch(stateRoot);
      const batch = await scc.getStateBatch(0);

      expect(batch.batchIndex).to.equal(0);
      expect(batch.stateRoot).to.equal(stateRoot);
      expect(batch.submitter).to.equal(sequencer.address);
      expect(batch.challenged).to.be.false;
      expect(batch.finalized).to.be.false;
    });
  });

  describe("Finalization", function () {
    it("Should not finalize before fraud proof window", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(scc.finalizeBatch(0))
        .to.be.revertedWithCustomError(scc, "FraudProofWindowNotPassed");
    });

    it("Should finalize after fraud proof window", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(scc.finalizeBatch(0))
        .to.emit(scc, "StateBatchFinalized")
        .withArgs(0, stateRoot);
    });

    it("Should increment totalFinalizedBatches", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await time.increase(7 * 24 * 60 * 60 + 1);
      await scc.finalizeBatch(0);

      expect(await scc.totalFinalizedBatches()).to.equal(1);
    });

    it("Should not finalize non-existent batch", async function () {
      const { scc } = await loadFixture(deployFixture);
      await expect(scc.finalizeBatch(99))
        .to.be.revertedWithCustomError(scc, "BatchNotFound");
    });

    it("Should not finalize already finalized batch", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await time.increase(7 * 24 * 60 * 60 + 1);
      await scc.finalizeBatch(0);

      await expect(scc.finalizeBatch(0))
        .to.be.revertedWithCustomError(scc, "BatchAlreadyFinalized");
    });

    it("Should not finalize challenged batch", async function () {
      const { scc, sequencer, fraudProver, challenger } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await scc.connect(fraudProver).challengeBatch(0, challenger.address);

      await time.increase(7 * 24 * 60 * 60 + 1);
      await expect(scc.finalizeBatch(0))
        .to.be.revertedWithCustomError(scc, "BatchAlreadyChallenged");
    });
  });

  describe("Challenges", function () {
    it("Should allow FraudProver to challenge a batch", async function () {
      const { scc, sequencer, fraudProver, challenger } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(scc.connect(fraudProver).challengeBatch(0, challenger.address))
        .to.emit(scc, "StateBatchChallenged")
        .withArgs(0, stateRoot, challenger.address);
    });

    it("Should reject challenge from non-FraudProver", async function () {
      const { scc, sequencer, user1 } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(scc.connect(user1).challengeBatch(0, user1.address))
        .to.be.revertedWithCustomError(scc, "OnlyFraudProver");
    });

    it("Should not challenge already challenged batch", async function () {
      const { scc, sequencer, fraudProver, challenger } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await scc.connect(fraudProver).challengeBatch(0, challenger.address);
      await expect(scc.connect(fraudProver).challengeBatch(0, challenger.address))
        .to.be.revertedWithCustomError(scc, "BatchAlreadyChallenged");
    });

    it("Should not challenge finalized batch", async function () {
      const { scc, sequencer, fraudProver, challenger } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await time.increase(7 * 24 * 60 * 60 + 1);
      await scc.finalizeBatch(0);

      await expect(scc.connect(fraudProver).challengeBatch(0, challenger.address))
        .to.be.revertedWithCustomError(scc, "BatchAlreadyFinalized");
    });
  });

  describe("Batch Deletion", function () {
    it("Should allow FraudProver to delete a batch", async function () {
      const { scc, sequencer, fraudProver } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(scc.connect(fraudProver).deleteBatch(0))
        .to.emit(scc, "StateBatchDeleted")
        .withArgs(0, stateRoot);

      expect(await scc.nextBatchIndex()).to.equal(0);
    });

    it("Should delete subsequent batches", async function () {
      const { scc, sequencer, fraudProver } = await loadFixture(deployFixture);
      const root1 = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      const root2 = ethers.keccak256(ethers.toUtf8Bytes("state2"));
      const root3 = ethers.keccak256(ethers.toUtf8Bytes("state3"));

      await scc.connect(sequencer).appendStateBatch(root1);
      await scc.connect(sequencer).appendStateBatch(root2);
      await scc.connect(sequencer).appendStateBatch(root3);

      // Delete from batch 1 onwards
      await scc.connect(fraudProver).deleteBatch(1);

      expect(await scc.nextBatchIndex()).to.equal(1);
      // Batch 0 should still exist
      const batch0 = await scc.getStateBatch(0);
      expect(batch0.stateRoot).to.equal(root1);
    });

    it("Should reject deletion from non-FraudProver", async function () {
      const { scc, sequencer, user1 } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await expect(scc.connect(user1).deleteBatch(0))
        .to.be.revertedWithCustomError(scc, "OnlyFraudProver");
    });

    it("Should not delete finalized batch", async function () {
      const { scc, sequencer, fraudProver } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      await time.increase(7 * 24 * 60 * 60 + 1);
      await scc.finalizeBatch(0);

      await expect(scc.connect(fraudProver).deleteBatch(0))
        .to.be.revertedWithCustomError(scc, "BatchAlreadyFinalized");
    });
  });

  describe("Views", function () {
    it("Should report correct isInFraudProofWindow", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      expect(await scc.isInFraudProofWindow(0)).to.be.true;

      await time.increase(7 * 24 * 60 * 60 + 1);
      expect(await scc.isInFraudProofWindow(0)).to.be.false;
    });

    it("Should report correct isStateRootFinalized", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const stateRoot = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      await scc.connect(sequencer).appendStateBatch(stateRoot);

      expect(await scc.isStateRootFinalized(stateRoot)).to.be.false;

      await time.increase(7 * 24 * 60 * 60 + 1);
      await scc.finalizeBatch(0);

      expect(await scc.isStateRootFinalized(stateRoot)).to.be.true;
    });

    it("Should return latest batch index", async function () {
      const { scc, sequencer } = await loadFixture(deployFixture);
      const root1 = ethers.keccak256(ethers.toUtf8Bytes("state1"));
      const root2 = ethers.keccak256(ethers.toUtf8Bytes("state2"));

      await scc.connect(sequencer).appendStateBatch(root1);
      await scc.connect(sequencer).appendStateBatch(root2);

      expect(await scc.getLatestBatchIndex()).to.equal(1);
    });

    it("Should revert getLatestBatchIndex when no batches", async function () {
      const { scc } = await loadFixture(deployFixture);
      await expect(scc.getLatestBatchIndex()).to.be.revertedWith("SCC: no batches submitted");
    });
  });

  describe("Admin", function () {
    it("Should allow owner to set BondManager", async function () {
      const { scc, owner, user1 } = await loadFixture(deployFixture);
      await expect(scc.connect(owner).setBondManager(user1.address))
        .to.emit(scc, "BondManagerUpdated");
    });

    it("Should allow owner to set FraudProver", async function () {
      const { scc, owner, user1 } = await loadFixture(deployFixture);
      await expect(scc.connect(owner).setFraudProver(user1.address))
        .to.emit(scc, "FraudProverUpdated");
    });

    it("Should reject zero address for BondManager", async function () {
      const { scc, owner } = await loadFixture(deployFixture);
      await expect(scc.connect(owner).setBondManager(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(scc, "InvalidAddress");
    });

    it("Should reject non-owner admin calls", async function () {
      const { scc, user1 } = await loadFixture(deployFixture);
      await expect(scc.connect(user1).setBondManager(user1.address)).to.be.reverted;
      await expect(scc.connect(user1).setFraudProver(user1.address)).to.be.reverted;
    });
  });
});
