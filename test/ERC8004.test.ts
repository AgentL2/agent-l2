import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC8004", function () {
  async function deployFixture() {
    const [owner, signer1, signer2, target] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERC8004");
    const wallet = await Factory.deploy();
    await owner.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("10") });
    const agentDID = ethers.keccak256(ethers.toUtf8Bytes("agent1"));
    return { wallet, owner, signer1, signer2, target, agentDID };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { wallet, owner } = await loadFixture(deployFixture);
      expect(await wallet.owner()).to.equal(owner.address);
    });
  });

  describe("Agent Authorization", function () {
    it("Should authorize an agent with signer", async function () {
      const { wallet, owner, signer1, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("1"), ethers.parseEther("0.5"), [], true, signer1.address);
      expect(await wallet.isAgentAuthorized(agentDID)).to.be.true;
      expect(await wallet.agentSigner(agentDID)).to.equal(signer1.address);
    });

    it("Should revoke an agent", async function () {
      const { wallet, owner, signer1, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("1"), ethers.parseEther("0.5"), [], true, signer1.address);
      await wallet.connect(owner).revokeAgent(agentDID);
      expect(await wallet.isAgentAuthorized(agentDID)).to.be.false;
    });
  });

  describe("Execution", function () {
    it("Should execute as authorized signer", async function () {
      const { wallet, owner, signer1, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("1"), ethers.parseEther("0.5"), [], true, signer1.address);
      // Send ETH to target — need at least 4 bytes of data for selector extraction, or send with value 0
      // The contract does bytes4(data[:4]) which requires data.length >= 4
      // Use a dummy 4-byte selector for the data
      const dummyData = "0x00000000";
      const balBefore = await ethers.provider.getBalance(target.address);
      await wallet.connect(signer1).executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1"));
      const balAfter = await ethers.provider.getBalance(target.address);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("0.1"));
    });

    it("Should reject execution from wrong signer", async function () {
      const { wallet, owner, signer1, signer2, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("1"), ethers.parseEther("0.5"), [], true, signer1.address);
      await expect(wallet.connect(signer2).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.1")))
        .to.be.revertedWith("ERC8004: caller not authorized signer");
    });

    it("Should enforce per-transaction limits", async function () {
      const { wallet, owner, signer1, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("10"), ethers.parseEther("0.5"), [], true, signer1.address);
      await expect(wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("1")))
        .to.be.revertedWith("ERC8004: exceeds per-tx limit");
    });

    it("Should enforce daily spending limits", async function () {
      const { wallet, owner, signer1, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("0.3"), ethers.parseEther("0.2"), [], true, signer1.address);
      await wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.2"));
      await expect(wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.2")))
        .to.be.revertedWith("ERC8004: exceeds daily limit");
    });

    it("Should reset daily limits after 24 hours", async function () {
      const { wallet, owner, signer1, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("0.3"), ethers.parseEther("0.2"), [], true, signer1.address);
      await wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.2"));
      await time.increase(24 * 60 * 60 + 1);
      await wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.2"));
    });
  });

  describe("Pause", function () {
    it("Should pause and unpause", async function () {
      const { wallet, owner, signer1, target, agentDID } = await loadFixture(deployFixture);
      await wallet.connect(owner).authorizeAgent(agentDID, ethers.parseEther("1"), ethers.parseEther("0.5"), [], true, signer1.address);
      await wallet.connect(owner).setPaused(true);
      await expect(wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.1")))
        .to.be.revertedWith("ERC8004: paused");
      await wallet.connect(owner).setPaused(false);
      await wallet.connect(signer1).executeAsAgent(agentDID, target.address, "0x00000000", ethers.parseEther("0.1"));
    });
  });
});
