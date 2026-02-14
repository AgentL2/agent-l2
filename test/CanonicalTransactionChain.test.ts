import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("CanonicalTransactionChain", function () {
  async function deployFixture() {
    const [owner, sequencer, user1, user2] = await ethers.getSigners();

    // Deploy BondManager
    const BondManagerFactory = await ethers.getContractFactory("BondManager");
    const bondManager = await BondManagerFactory.deploy();

    // Deploy CTC
    const CTCFactory = await ethers.getContractFactory("CanonicalTransactionChain");
    const ctc = await CTCFactory.deploy();

    // Configure CTC
    await ctc.setBondManager(await bondManager.getAddress());

    // Configure BondManager (needs a fraud prover for setup)
    await bondManager.setFraudProver(owner.address);

    // Sequencer posts bond
    await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });

    return { ctc, bondManager, owner, sequencer, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { ctc, owner } = await loadFixture(deployFixture);
      expect(await ctc.owner()).to.equal(owner.address);
    });

    it("Should start with nextBatchIndex at 0", async function () {
      const { ctc } = await loadFixture(deployFixture);
      expect(await ctc.nextBatchIndex()).to.equal(0);
    });

    it("Should start with totalElements at 0", async function () {
      const { ctc } = await loadFixture(deployFixture);
      expect(await ctc.totalElements()).to.equal(0);
    });

    it("Should have correct constants", async function () {
      const { ctc } = await loadFixture(deployFixture);
      expect(await ctc.MAX_BATCH_SIZE()).to.equal(10000);
      expect(await ctc.FORCE_INCLUSION_PERIOD()).to.equal(24 * 60 * 60);
      expect(await ctc.MAX_ENQUEUE_GAS_LIMIT()).to.equal(15_000_000);
    });
  });

  describe("Appending Transaction Batches", function () {
    it("Should append a transaction batch", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      const txData = ethers.toUtf8Bytes("compressed-tx-data");

      await expect(ctc.connect(sequencer).appendTransactionBatch(txRoot, 100, txData))
        .to.emit(ctc, "TransactionBatchAppended");
    });

    it("Should increment batch index and total elements", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot1 = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      const txRoot2 = ethers.keccak256(ethers.toUtf8Bytes("txbatch2"));
      const txData = ethers.toUtf8Bytes("data");

      await ctc.connect(sequencer).appendTransactionBatch(txRoot1, 100, txData);
      await ctc.connect(sequencer).appendTransactionBatch(txRoot2, 200, txData);

      expect(await ctc.nextBatchIndex()).to.equal(2);
      expect(await ctc.totalElements()).to.equal(300);
    });

    it("Should reject zero txRoot", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      await expect(
        ctc.connect(sequencer).appendTransactionBatch(ethers.ZeroHash, 100, "0x")
      ).to.be.revertedWithCustomError(ctc, "InvalidBatchData");
    });

    it("Should reject zero batch size", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      await expect(
        ctc.connect(sequencer).appendTransactionBatch(txRoot, 0, "0x")
      ).to.be.revertedWithCustomError(ctc, "BatchSizeTooLarge");
    });

    it("Should reject batch size exceeding maximum", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      await expect(
        ctc.connect(sequencer).appendTransactionBatch(txRoot, 10001, "0x")
      ).to.be.revertedWithCustomError(ctc, "BatchSizeTooLarge");
    });

    it("Should reject non-collateralized sequencer", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      await expect(
        ctc.connect(user1).appendTransactionBatch(txRoot, 100, "0x")
      ).to.be.revertedWith("CTC: sequencer not collateralized");
    });

    it("Should store correct batch data", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      const txData = ethers.toUtf8Bytes("data");

      await ctc.connect(sequencer).appendTransactionBatch(txRoot, 150, txData);
      const batch = await ctc.getBatch(0);

      expect(batch.batchIndex).to.equal(0);
      expect(batch.txRoot).to.equal(txRoot);
      expect(batch.prevTotalElements).to.equal(0);
      expect(batch.batchSize).to.equal(150);
      expect(batch.submitter).to.equal(sequencer.address);
    });
  });

  describe("Transaction Enqueueing", function () {
    it("Should allow users to enqueue transactions", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);

      await expect(
        ctc.connect(user1).enqueueTransaction(
          user1.address,
          100000,
          ethers.toUtf8Bytes("tx-data")
        )
      ).to.emit(ctc, "TransactionEnqueued");
    });

    it("Should track queue length", async function () {
      const { ctc, user1, user2 } = await loadFixture(deployFixture);

      await ctc.connect(user1).enqueueTransaction(user1.address, 100000, "0x01");
      await ctc.connect(user2).enqueueTransaction(user2.address, 100000, "0x02");

      expect(await ctc.getQueueLength()).to.equal(2);
      expect(await ctc.getPendingQueueCount()).to.equal(2);
    });

    it("Should reject zero address target", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await expect(
        ctc.connect(user1).enqueueTransaction(ethers.ZeroAddress, 100000, "0x01")
      ).to.be.revertedWithCustomError(ctc, "InvalidAddress");
    });

    it("Should reject zero gas limit", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await expect(
        ctc.connect(user1).enqueueTransaction(user1.address, 0, "0x01")
      ).to.be.revertedWithCustomError(ctc, "InvalidGasLimit");
    });

    it("Should reject gas limit exceeding maximum", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await expect(
        ctc.connect(user1).enqueueTransaction(user1.address, 15_000_001, "0x01")
      ).to.be.revertedWithCustomError(ctc, "InvalidGasLimit");
    });

    it("Should store correct queued transaction data", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      const data = ethers.toUtf8Bytes("my-tx-data");
      await ctc.connect(user1).enqueueTransaction(user1.address, 200000, data);

      const [sender, target, gasLimit, , , included] = await ctc.getQueuedTransaction(0);
      expect(sender).to.equal(user1.address);
      expect(target).to.equal(user1.address);
      expect(gasLimit).to.equal(200000);
      expect(included).to.be.false;
    });
  });

  describe("Force Inclusion", function () {
    it("Should not force-include before period passes", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await ctc.connect(user1).enqueueTransaction(user1.address, 100000, "0x01");

      await expect(
        ctc.connect(user1).forceIncludeQueuedTransactions()
      ).to.be.revertedWithCustomError(ctc, "ForceInclusionPeriodNotPassed");
    });

    it("Should force-include after period passes", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await ctc.connect(user1).enqueueTransaction(user1.address, 100000, "0x01");

      await time.increase(24 * 60 * 60 + 1);

      await expect(ctc.connect(user1).forceIncludeQueuedTransactions())
        .to.emit(ctc, "TransactionBatchAppended");
    });

    it("Should mark queued transactions as included", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await ctc.connect(user1).enqueueTransaction(user1.address, 100000, "0x01");

      await time.increase(24 * 60 * 60 + 1);
      await ctc.connect(user1).forceIncludeQueuedTransactions();

      const [, , , , , included] = await ctc.getQueuedTransaction(0);
      expect(included).to.be.true;
      expect(await ctc.getPendingQueueCount()).to.equal(0);
    });

    it("Should force-include multiple queued transactions", async function () {
      const { ctc, user1, user2 } = await loadFixture(deployFixture);
      await ctc.connect(user1).enqueueTransaction(user1.address, 100000, "0x01");
      await ctc.connect(user2).enqueueTransaction(user2.address, 100000, "0x02");

      await time.increase(24 * 60 * 60 + 1);
      await ctc.connect(user1).forceIncludeQueuedTransactions();

      expect(await ctc.getPendingQueueCount()).to.equal(0);
      expect(await ctc.totalElements()).to.equal(2);
    });

    it("Should revert force-include with empty queue", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await expect(
        ctc.connect(user1).forceIncludeQueuedTransactions()
      ).to.be.revertedWithCustomError(ctc, "QueueEmpty");
    });
  });

  describe("Views", function () {
    it("Should return latest batch index", async function () {
      const { ctc, sequencer } = await loadFixture(deployFixture);
      const txRoot = ethers.keccak256(ethers.toUtf8Bytes("txbatch1"));
      await ctc.connect(sequencer).appendTransactionBatch(txRoot, 100, "0x");
      expect(await ctc.getLatestBatchIndex()).to.equal(0);
    });

    it("Should revert getLatestBatchIndex when no batches", async function () {
      const { ctc } = await loadFixture(deployFixture);
      await expect(ctc.getLatestBatchIndex()).to.be.revertedWith("CTC: no batches submitted");
    });
  });

  describe("Admin", function () {
    it("Should allow owner to set BondManager", async function () {
      const { ctc, owner, user1 } = await loadFixture(deployFixture);
      await expect(ctc.connect(owner).setBondManager(user1.address))
        .to.emit(ctc, "BondManagerUpdated");
    });

    it("Should reject zero address for BondManager", async function () {
      const { ctc, owner } = await loadFixture(deployFixture);
      await expect(ctc.connect(owner).setBondManager(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(ctc, "InvalidAddress");
    });

    it("Should reject non-owner admin calls", async function () {
      const { ctc, user1 } = await loadFixture(deployFixture);
      await expect(ctc.connect(user1).setBondManager(user1.address)).to.be.reverted;
    });
  });
});
