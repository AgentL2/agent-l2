import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("FastBridge", function () {
  async function deployFixture() {
    const [owner, liquidityPool, feeRecipient, user1, user2, referrer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FastBridge");
    const bridge = await Factory.deploy(liquidityPool.address, feeRecipient.address);
    return { bridge, owner, liquidityPool, feeRecipient, user1, user2, referrer };
  }

  describe("Deployment", function () {
    it("Should deploy with correct settings", async function () {
      const { bridge, liquidityPool, feeRecipient } = await loadFixture(deployFixture);
      expect(await bridge.liquidityPool()).to.equal(liquidityPool.address);
      expect(await bridge.feeRecipient()).to.equal(feeRecipient.address);
      expect(await bridge.bridgeFee()).to.equal(10);
    });
  });

  describe("Bridge ETH", function () {
    it("Should bridge ETH and earn points", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      await expect(bridge.connect(user1).bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") }))
        .to.emit(bridge, "BridgeDeposit");
      const stats = await bridge.userStats(user1.address);
      expect(stats.points).to.be.gt(0);
    });

    it("Should reject below minimum", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      await expect(bridge.connect(user1).bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("0.0001") }))
        .to.be.revertedWith("Below minimum");
    });

    it("Should reject above maximum", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      await expect(bridge.connect(user1).bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("200") }))
        .to.be.revertedWith("Above maximum");
    });

    it("Should handle referrals", async function () {
      const { bridge, user1, referrer } = await loadFixture(deployFixture);
      await bridge.connect(referrer).bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("0.01") });
      await bridge.connect(user1).bridgeETH(referrer.address, { value: ethers.parseEther("1") });
      expect(await bridge.referrers(user1.address)).to.equal(referrer.address);
      expect(await bridge.referralCount(referrer.address)).to.equal(1);
    });
  });

  describe("Bridge for Agent", function () {
    it("Should bridge with agent bonus", async function () {
      const { bridge, user1, user2 } = await loadFixture(deployFixture);
      await bridge.connect(user1).bridgeForAgent(user2.address, { value: ethers.parseEther("1") });
      const stats = await bridge.userStats(user1.address);
      expect(stats.points).to.be.gt(0);
    });
  });

  describe("Admin", function () {
    it("Should set fee (owner only)", async function () {
      const { bridge, owner } = await loadFixture(deployFixture);
      await bridge.connect(owner).setFee(50);
      expect(await bridge.bridgeFee()).to.equal(50);
    });

    it("Should reject fee above max", async function () {
      const { bridge, owner } = await loadFixture(deployFixture);
      await expect(bridge.connect(owner).setFee(200)).to.be.revertedWith("Fee too high");
    });

    it("Should reject non-owner emergency withdraw", async function () {
      const { bridge, user1 } = await loadFixture(deployFixture);
      await expect(bridge.connect(user1).emergencyWithdraw(ethers.ZeroAddress)).to.be.reverted;
    });
  });
});
