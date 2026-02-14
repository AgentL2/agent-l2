import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("L2Bridge", function () {
  async function deployFixture() {
    const [owner, sequencer, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L2Bridge");
    const bridge = await Factory.deploy(sequencer.address);
    return { bridge, owner, sequencer, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct sequencer", async function () {
      const { bridge, sequencer } = await loadFixture(deployFixture);
      expect(await bridge.sequencer()).to.equal(sequencer.address);
    });
  });

  describe("Deposits", function () {
    it("Should process deposits (sequencer only)", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("deposit1"));
      await expect(bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1")))
        .to.emit(bridge, "DepositProcessed");
    });

    it("Should reject deposits from non-sequencer", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("deposit1"));
      await expect(bridge.connect(user1).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1")))
        .to.be.reverted;
    });

    it("Should not process duplicate deposits", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("deposit1"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      await expect(bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1")))
        .to.be.reverted;
    });
  });

  describe("Withdrawals", function () {
    it("Should initiate a withdrawal", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      // First give user1 a balance via deposit
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("dep-for-withdraw"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      // Now initiate withdrawal: initiateWithdrawal(address l1Address, uint256 amount)
      await expect(bridge.connect(user1).initiateWithdrawal(user1.address, ethers.parseEther("0.5")))
        .to.emit(bridge, "WithdrawalInitiated");
    });

    it("Should not finalize before delay period", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("dep-delay"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      await bridge.connect(user1).initiateWithdrawal(user1.address, ethers.parseEther("0.5"));
      const filter = bridge.filters.WithdrawalInitiated();
      const events = await bridge.queryFilter(filter);
      const wId = events[0].args?.withdrawalId;
      await expect(bridge.connect(sequencer).finalizeWithdrawal(wId)).to.be.reverted;
    });

    it("Should finalize after delay period", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("dep-finalize"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      await bridge.connect(user1).initiateWithdrawal(user1.address, ethers.parseEther("0.5"));
      const filter = bridge.filters.WithdrawalInitiated();
      const events = await bridge.queryFilter(filter);
      const wId = events[0].args?.withdrawalId;
      await time.increase(7 * 24 * 60 * 60 + 1);
      await expect(bridge.connect(sequencer).finalizeWithdrawal(wId))
        .to.emit(bridge, "WithdrawalFinalized");
    });
  });

  describe("Challenges (owner or FraudProver)", function () {
    it("Should reject challenge from non-owner when no FraudProver set", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("dep1"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      await expect(bridge.connect(user1).challengeDeposit(depositId))
        .to.be.revertedWithCustomError(bridge, "OnlyFraudProverOrOwner");
    });

    it("Should allow owner to challenge deposit", async function () {
      const { bridge, owner, sequencer, user1 } = await loadFixture(deployFixture);
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("dep-challenge-owner"));
      await bridge.connect(sequencer).processDeposit(depositId, user1.address, user1.address, ethers.parseEther("1"));
      await expect(bridge.connect(owner).challengeDeposit(depositId))
        .to.emit(bridge, "DepositChallenged");
    });
  });

  describe("Admin", function () {
    it("Should update sequencer (sequencer only)", async function () {
      const { bridge, sequencer, user1 } = await loadFixture(deployFixture);
      // updateSequencer is sequencer-only, not owner-only
      await bridge.connect(sequencer).updateSequencer(user1.address);
      expect(await bridge.sequencer()).to.equal(user1.address);
    });

    it("Should reject non-sequencer sequencer update", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      await expect(bridge.connect(user1).updateSequencer(user1.address)).to.be.reverted;
    });
  });
});
