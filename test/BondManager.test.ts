import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("BondManager", function () {
  async function deployFixture() {
    const [owner, sequencer, challenger, fraudProver, user1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BondManager");
    const bondManager = await Factory.deploy();

    // Set fraud prover
    await bondManager.setFraudProver(fraudProver.address);

    return { bondManager, owner, sequencer, challenger, fraudProver, user1 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { bondManager, owner } = await loadFixture(deployFixture);
      expect(await bondManager.owner()).to.equal(owner.address);
    });

    it("Should set fraud prover correctly", async function () {
      const { bondManager, fraudProver } = await loadFixture(deployFixture);
      expect(await bondManager.fraudProver()).to.equal(fraudProver.address);
    });

    it("Should have correct constants", async function () {
      const { bondManager } = await loadFixture(deployFixture);
      expect(await bondManager.MIN_SEQUENCER_BOND()).to.equal(ethers.parseEther("1"));
      expect(await bondManager.MIN_CHALLENGER_BOND()).to.equal(ethers.parseEther("0.1"));
      expect(await bondManager.BOND_WITHDRAWAL_DELAY()).to.equal(7 * 24 * 60 * 60);
      expect(await bondManager.CHALLENGER_REWARD_BPS()).to.equal(5000);
    });
  });

  describe("Sequencer Bond", function () {
    it("Should allow posting sequencer bond", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1") })
      ).to.emit(bondManager, "SequencerBondPosted");
    });

    it("Should register sequencer when bond meets minimum", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.true;
      expect(await bondManager.isSequencerCollateralized(sequencer.address)).to.be.true;
    });

    it("Should not register sequencer when bond is below minimum", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("0.5") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.false;
      expect(await bondManager.isSequencerCollateralized(sequencer.address)).to.be.false;
    });

    it("Should register sequencer after multiple deposits reach minimum", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("0.5") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.false;
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("0.5") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.true;
    });

    it("Should reject zero bond amount", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(sequencer).postSequencerBond({ value: 0 })
      ).to.be.revertedWithCustomError(bondManager, "InvalidAmount");
    });

    it("Should track total sequencer bonds", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      expect(await bondManager.totalSequencerBonds()).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Bond Withdrawal", function () {
    it("Should allow requesting bond withdrawal", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      await expect(
        bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("1"))
      ).to.emit(bondManager, "SequencerBondWithdrawalRequested");
    });

    it("Should reject withdrawal request exceeding bond", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1") });
      await expect(
        bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("2"))
      ).to.be.revertedWithCustomError(bondManager, "InsufficientBond");
    });

    it("Should reject duplicate withdrawal request", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      await bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("1"));
      await expect(
        bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("0.5"))
      ).to.be.revertedWithCustomError(bondManager, "WithdrawalPending");
    });

    it("Should not finalize withdrawal before delay", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      await bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("1"));
      await expect(
        bondManager.connect(sequencer).finalizeBondWithdrawal()
      ).to.be.revertedWithCustomError(bondManager, "WithdrawalDelayNotPassed");
    });

    it("Should finalize withdrawal after delay", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      await bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("1"));

      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(
        bondManager.connect(sequencer).finalizeBondWithdrawal()
      ).to.emit(bondManager, "SequencerBondWithdrawn");

      expect(await bondManager.sequencerBonds(sequencer.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should deregister sequencer when bond drops below minimum after withdrawal", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.true;

      await bondManager.connect(sequencer).requestBondWithdrawal(ethers.parseEther("0.5"));
      await time.increase(7 * 24 * 60 * 60 + 1);
      await bondManager.connect(sequencer).finalizeBondWithdrawal();

      expect(await bondManager.isSequencer(sequencer.address)).to.be.false;
    });
  });

  describe("Challenger Bond", function () {
    it("Should allow posting challenger bond", async function () {
      const { bondManager, challenger } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.1") })
      ).to.emit(bondManager, "ChallengerBondPosted");
    });

    it("Should reject challenger bond below minimum", async function () {
      const { bondManager, challenger } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.05") })
      ).to.be.revertedWithCustomError(bondManager, "InsufficientBond");
    });

    it("Should track total challenger bonds", async function () {
      const { bondManager, challenger } = await loadFixture(deployFixture);
      await bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.2") });
      expect(await bondManager.totalChallengerBonds()).to.equal(ethers.parseEther("0.2"));
    });
  });

  describe("Slashing", function () {
    it("Should slash sequencer bond on fraud proof", async function () {
      const { bondManager, sequencer, challenger, fraudProver } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });

      await expect(
        bondManager.connect(fraudProver).slashSequencer(
          sequencer.address,
          challenger.address,
          ethers.parseEther("1")
        )
      ).to.emit(bondManager, "SequencerBondSlashed");

      expect(await bondManager.sequencerBonds(sequencer.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should reward challenger on successful fraud proof", async function () {
      const { bondManager, sequencer, challenger, fraudProver } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });

      const balanceBefore = await ethers.provider.getBalance(challenger.address);

      await bondManager.connect(fraudProver).slashSequencer(
        sequencer.address,
        challenger.address,
        ethers.parseEther("1")
      );

      const balanceAfter = await ethers.provider.getBalance(challenger.address);
      // Challenger should receive 50% of slashed amount (0.5 ETH)
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.5"));
    });

    it("Should deregister sequencer when slashed below minimum", async function () {
      const { bondManager, sequencer, challenger, fraudProver } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1") });
      expect(await bondManager.isSequencer(sequencer.address)).to.be.true;

      await bondManager.connect(fraudProver).slashSequencer(
        sequencer.address,
        challenger.address,
        ethers.parseEther("0.5")
      );

      expect(await bondManager.isSequencer(sequencer.address)).to.be.false;
    });

    it("Should slash challenger bond on failed challenge", async function () {
      const { bondManager, challenger, fraudProver } = await loadFixture(deployFixture);
      await bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.2") });

      await expect(
        bondManager.connect(fraudProver).slashChallenger(challenger.address, ethers.parseEther("0.2"))
      ).to.emit(bondManager, "ChallengerBondSlashed");

      expect(await bondManager.challengerBonds(challenger.address)).to.equal(0);
    });

    it("Should reject slashing from non-fraud-prover", async function () {
      const { bondManager, sequencer, challenger, user1 } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });

      await expect(
        bondManager.connect(user1).slashSequencer(
          sequencer.address,
          challenger.address,
          ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(bondManager, "OnlyFraudProver");
    });

    it("Should return challenger bond after successful challenge", async function () {
      const { bondManager, challenger, fraudProver } = await loadFixture(deployFixture);
      await bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.2") });

      const balanceBefore = await ethers.provider.getBalance(challenger.address);

      await bondManager.connect(fraudProver).returnChallengerBond(
        challenger.address,
        ethers.parseEther("0.2")
      );

      const balanceAfter = await ethers.provider.getBalance(challenger.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.2"));
      expect(await bondManager.challengerBonds(challenger.address)).to.equal(0);
    });
  });

  describe("Admin", function () {
    it("Should allow owner to set fraud prover", async function () {
      const { bondManager, owner, user1 } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(owner).setFraudProver(user1.address)
      ).to.emit(bondManager, "FraudProverUpdated");
    });

    it("Should reject non-owner setting fraud prover", async function () {
      const { bondManager, user1 } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(user1).setFraudProver(user1.address)
      ).to.be.reverted;
    });

    it("Should reject zero address for fraud prover", async function () {
      const { bondManager, owner } = await loadFixture(deployFixture);
      await expect(
        bondManager.connect(owner).setFraudProver(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(bondManager, "InvalidAddress");
    });

    it("Should allow owner to withdraw protocol revenue", async function () {
      const { bondManager, owner, sequencer, challenger, fraudProver } = await loadFixture(deployFixture);

      // Post sequencer bond and slash it to generate revenue
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("2") });
      await bondManager.connect(fraudProver).slashSequencer(
        sequencer.address,
        challenger.address,
        ethers.parseEther("1")
      );

      // Protocol revenue = slashed amount - challenger reward = 1 ETH - 0.5 ETH = 0.5 ETH
      await expect(
        bondManager.connect(owner).withdrawProtocolRevenue(owner.address, ethers.parseEther("0.5"))
      ).to.not.be.reverted;
    });
  });

  describe("Views", function () {
    it("Should return correct sequencer bond", async function () {
      const { bondManager, sequencer } = await loadFixture(deployFixture);
      await bondManager.connect(sequencer).postSequencerBond({ value: ethers.parseEther("1.5") });
      expect(await bondManager.getSequencerBond(sequencer.address)).to.equal(ethers.parseEther("1.5"));
    });

    it("Should return correct challenger bond", async function () {
      const { bondManager, challenger } = await loadFixture(deployFixture);
      await bondManager.connect(challenger).postChallengerBond({ value: ethers.parseEther("0.3") });
      expect(await bondManager.getChallengerBond(challenger.address)).to.equal(ethers.parseEther("0.3"));
    });
  });
});
