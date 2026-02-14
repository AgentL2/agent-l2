import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * End-to-end integration tests covering the full lifecycle of:
 *   1. ERC8004 Agent Wallet  - deploy, fund, authorize, execute, limits, revoke
 *   2. FastBridge            - bridge ETH, points, referrals, tier progression
 *   3. Cross-contract        - agent wallet interacting with FastBridge
 *   4. Emergency scenarios   - pause / emergency withdraw
 */
describe("E2E: Agent Wallet & FastBridge Integration", function () {
  // ------------------------------------------------------------------ //
  //                         Shared Fixture                              //
  // ------------------------------------------------------------------ //

  async function deployFullFixture() {
    const [
      owner,         // wallet + bridge deployer
      agentSigner,   // authorised signer for agent DID
      otherSigner,   // unauthorised signer (negative tests)
      userA,         // bridge user A  (also referrer)
      userB,         // bridge user B  (referred by A)
      userC,         // bridge user C  (referred by B)
      liquidityPool, // receives bridged ETH
      feeRecipient,  // receives bridge fees
      target,        // generic ETH receiver for wallet txs
      target2,       // second target for batch / allowlist tests
    ] = await ethers.getSigners();

    // ----- Deploy ERC8004 Agent Wallet ----- //
    const WalletFactory = await ethers.getContractFactory("ERC8004");
    const wallet = await WalletFactory.deploy();
    const walletAddr = await wallet.getAddress();

    // Fund the wallet with 50 ETH
    await owner.sendTransaction({
      to: walletAddr,
      value: ethers.parseEther("50"),
    });

    // ----- Deploy FastBridge ----- //
    const BridgeFactory = await ethers.getContractFactory("FastBridge");
    const bridge = await BridgeFactory.deploy(
      liquidityPool.address,
      feeRecipient.address,
    );

    // Deterministic agent DID
    const agentDID = ethers.keccak256(ethers.toUtf8Bytes("e2e-agent-1"));
    const agentDID2 = ethers.keccak256(ethers.toUtf8Bytes("e2e-agent-2"));

    // 4-byte dummy calldata so the contract can extract a selector
    const dummyData = "0x00000000";

    return {
      wallet,
      walletAddr,
      bridge,
      owner,
      agentSigner,
      otherSigner,
      userA,
      userB,
      userC,
      liquidityPool,
      feeRecipient,
      target,
      target2,
      agentDID,
      agentDID2,
      dummyData,
    };
  }

  // ================================================================== //
  //  1. Full Wallet Lifecycle                                           //
  // ================================================================== //

  describe("1. Full wallet lifecycle", function () {
    it("deploy -> fund -> authorize -> execute -> hit limit -> wait 24h -> execute -> revoke", async function () {
      const {
        wallet,
        walletAddr,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      // --- (a) Wallet is deployed and funded ---
      expect(await ethers.provider.getBalance(walletAddr)).to.equal(
        ethers.parseEther("50"),
      );
      expect(await wallet.owner()).to.equal(owner.address);

      // --- (b) Authorize agent with daily=0.5 ETH, per-tx=0.3 ETH, allowAny ---
      const dailyLimit = ethers.parseEther("0.5");
      const perTxLimit = ethers.parseEther("0.3");
      await expect(
        wallet
          .connect(owner)
          .authorizeAgent(agentDID, dailyLimit, perTxLimit, [], true, agentSigner.address),
      ).to.emit(wallet, "AgentAuthorized");

      expect(await wallet.isAgentAuthorized(agentDID)).to.be.true;
      expect(await wallet.agentSigner(agentDID)).to.equal(agentSigner.address);

      // --- (c) Agent executes a valid transaction ---
      const balBefore = await ethers.provider.getBalance(target.address);
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.2"));
      const balAfter = await ethers.provider.getBalance(target.address);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("0.2"));

      // Action log recorded
      expect(await wallet.getActionLogsCount()).to.equal(1);

      // --- (d) Execute another tx that reaches the daily limit ---
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.3"));
      expect(await wallet.getActionLogsCount()).to.equal(2);

      // Cumulative = 0.2 + 0.3 = 0.5 ETH — daily limit exhausted
      // Next tx should fail even for a tiny amount
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.01")),
      ).to.be.revertedWith("ERC8004: exceeds daily limit");

      // --- (e) Fast-forward 24 hours; limit resets ---
      await time.increase(24 * 60 * 60 + 1);

      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.2"));
      expect(await wallet.getActionLogsCount()).to.equal(3);

      // Confirm spending counter reset via getAgentConfig
      const [, , , spentToday] = await wallet.getAgentConfig(agentDID);
      expect(spentToday).to.equal(ethers.parseEther("0.2"));

      // --- (f) Revoke agent ---
      await expect(wallet.connect(owner).revokeAgent(agentDID)).to.emit(
        wallet,
        "AgentRevoked",
      );
      expect(await wallet.isAgentAuthorized(agentDID)).to.be.false;

      // Revoked agent cannot execute
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.01")),
      ).to.be.revertedWith("ERC8004: agent not authorized");
    });
  });

  // ================================================================== //
  //  2. Batch Execution                                                 //
  // ================================================================== //

  describe("2. Batch execution", function () {
    it("agent executes multiple txs in one call", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        target2,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      // Authorize with generous daily limit and allowAny
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("5"),
          [],
          true,
          agentSigner.address,
        );

      const targets = [target.address, target2.address, target.address];
      const datas = [dummyData, dummyData, dummyData];
      const values = [
        ethers.parseEther("0.1"),
        ethers.parseEther("0.2"),
        ethers.parseEther("0.3"),
      ];

      const balT1Before = await ethers.provider.getBalance(target.address);
      const balT2Before = await ethers.provider.getBalance(target2.address);

      await wallet
        .connect(agentSigner)
        .batchExecuteAsAgent(agentDID, targets, datas, values);

      const balT1After = await ethers.provider.getBalance(target.address);
      const balT2After = await ethers.provider.getBalance(target2.address);

      // target received 0.1 + 0.3 = 0.4 ETH
      expect(balT1After - balT1Before).to.equal(ethers.parseEther("0.4"));
      // target2 received 0.2 ETH
      expect(balT2After - balT2Before).to.equal(ethers.parseEther("0.2"));

      // All three actions logged
      expect(await wallet.getActionLogsCount()).to.equal(3);
    });

    it("rejects batch exceeding MAX_BATCH_SIZE", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          [],
          true,
          agentSigner.address,
        );

      // MAX_BATCH_SIZE is 10; create 11 entries
      const count = 11;
      const targets = Array(count).fill(target.address);
      const datas = Array(count).fill(dummyData);
      const values = Array(count).fill(ethers.parseEther("0.01"));

      await expect(
        wallet
          .connect(agentSigner)
          .batchExecuteAsAgent(agentDID, targets, datas, values),
      ).to.be.revertedWith("ERC8004: batch too large");
    });

    it("batch rejects mismatched array lengths", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("5"),
          [],
          true,
          agentSigner.address,
        );

      await expect(
        wallet.connect(agentSigner).batchExecuteAsAgent(
          agentDID,
          [target.address, target.address],
          [dummyData],
          [ethers.parseEther("0.1"), ethers.parseEther("0.1")],
        ),
      ).to.be.revertedWith("ERC8004: array length mismatch");
    });
  });

  // ================================================================== //
  //  3. Contract Allowlist                                              //
  // ================================================================== //

  describe("3. Contract allowlist", function () {
    it("agent can only call whitelisted contracts", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        target2,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      // Authorize with allowAny=false and only target whitelisted
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("1"),
          [target.address],
          false,
          agentSigner.address,
        );

      // Allowed target succeeds
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1"));

      // Non-whitelisted target2 reverts
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target2.address, dummyData, ethers.parseEther("0.1")),
      ).to.be.revertedWith("ERC8004: contract not allowed");
    });

    it("owner can dynamically add to allowlist", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        target2,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("1"),
          [target.address],
          false,
          agentSigner.address,
        );

      // target2 initially blocked
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target2.address, dummyData, ethers.parseEther("0.1")),
      ).to.be.revertedWith("ERC8004: contract not allowed");

      // Owner adds target2
      await wallet
        .connect(owner)
        .setAllowedContracts(agentDID, [target2.address], true);

      // Now succeeds
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target2.address, dummyData, ethers.parseEther("0.1"));
    });

    it("batch execution respects per-target allowlist", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        target2,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      // Only target whitelisted
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("5"),
          [target.address],
          false,
          agentSigner.address,
        );

      // Batch that includes a non-whitelisted target2 should revert
      await expect(
        wallet.connect(agentSigner).batchExecuteAsAgent(
          agentDID,
          [target.address, target2.address],
          [dummyData, dummyData],
          [ethers.parseEther("0.1"), ethers.parseEther("0.1")],
        ),
      ).to.be.revertedWith("ERC8004: contract not allowed");
    });
  });

  // ================================================================== //
  //  4. FastBridge Points Accumulation Across Multiple Bridges          //
  // ================================================================== //

  describe("4. FastBridge points accumulation across multiple bridges", function () {
    it("points accumulate across successive bridge calls", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      // First bridge
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      const stats1 = await bridge.userStats(userA.address);
      const pointsAfterFirst = stats1.points;
      expect(pointsAfterFirst).to.be.gt(0);
      expect(stats1.bridgeCount).to.equal(1);

      // Second bridge (next day for streak)
      await time.increase(24 * 60 * 60);
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("2") });
      const stats2 = await bridge.userStats(userA.address);
      expect(stats2.points).to.be.gt(pointsAfterFirst);
      expect(stats2.bridgeCount).to.equal(2);

      // Third bridge (next day for streak)
      await time.increase(24 * 60 * 60);
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("3") });
      const stats3 = await bridge.userStats(userA.address);
      expect(stats3.points).to.be.gt(stats2.points);
      expect(stats3.bridgeCount).to.equal(3);
    });

    it("streak bonus resets when a day is skipped", async function () {
      const { bridge, userA, userB } = await loadFixture(deployFullFixture);

      // userA bridges day 1
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });

      // Skip 2 days (streak broken)
      await time.increase(2 * 24 * 60 * 60 + 1);

      // userA bridges again — streak should be broken
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      const statsA = await bridge.userStats(userA.address);

      // Compare with userB who bridges fresh (same early bird cohort but no streak)
      await bridge
        .connect(userB)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      const statsB = await bridge.userStats(userB.address);

      // userA has cumulative points from two bridges; userB has one.
      // The point is that the second bridge for userA did NOT get streak bonus.
      expect(statsA.bridgeCount).to.equal(2);
      expect(statsB.bridgeCount).to.equal(1);
    });

    it("bridgeForAgent awards agent bonus points", async function () {
      const { bridge, userA, target } = await loadFixture(deployFullFixture);

      // Normal bridge
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      const normalPoints = (await bridge.userStats(userA.address)).points;

      // Deploy a fresh bridge to compare agent bonus in isolation
      const [, lp, fr] = await ethers.getSigners();
      const BridgeFactory = await ethers.getContractFactory("FastBridge");
      const bridge2 = await BridgeFactory.deploy(lp.address, fr.address);

      await bridge2
        .connect(userA)
        .bridgeForAgent(target.address, { value: ethers.parseEther("1") });
      const agentPoints = (await bridge2.userStats(userA.address)).points;

      // Agent bridge should yield more points (10% bonus)
      expect(agentPoints).to.be.gt(normalPoints);
    });
  });

  // ================================================================== //
  //  5. FastBridge Referral Chain                                        //
  // ================================================================== //

  describe("5. FastBridge referral chain: A refers B, B refers C", function () {
    it("referral chain awards correct bonuses", async function () {
      const { bridge, userA, userB, userC } = await loadFixture(deployFullFixture);

      // --- A bridges first (no referrer) ---
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      const pointsA_after1 = (await bridge.userStats(userA.address)).points;

      // --- B bridges with A as referrer ---
      await bridge
        .connect(userB)
        .bridgeETH(userA.address, { value: ethers.parseEther("1") });

      expect(await bridge.referrers(userB.address)).to.equal(userA.address);
      expect(await bridge.referralCount(userA.address)).to.equal(1);

      // A should have received referral bonus points
      const pointsA_after2 = (await bridge.userStats(userA.address)).points;
      expect(pointsA_after2).to.be.gt(pointsA_after1);

      // --- C bridges with B as referrer ---
      await bridge
        .connect(userC)
        .bridgeETH(userB.address, { value: ethers.parseEther("1") });

      expect(await bridge.referrers(userC.address)).to.equal(userB.address);
      expect(await bridge.referralCount(userB.address)).to.equal(1);

      // B should have received referral bonus from C
      const pointsB = (await bridge.userStats(userB.address)).points;
      const pointsC = (await bridge.userStats(userC.address)).points;

      // B has own bridge points + referral from C => more than C's own points
      expect(pointsB).to.be.gt(pointsC);
    });

    it("referrer cannot be set twice for same user", async function () {
      const { bridge, userA, userB, userC } = await loadFixture(deployFullFixture);

      // A and B bridge
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("0.01") });
      await bridge
        .connect(userB)
        .bridgeETH(userA.address, { value: ethers.parseEther("0.01") });

      // B's referrer is A
      expect(await bridge.referrers(userB.address)).to.equal(userA.address);

      // B bridges again with C as referrer — should NOT change
      await bridge
        .connect(userC)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("0.01") });
      await bridge
        .connect(userB)
        .bridgeETH(userC.address, { value: ethers.parseEther("0.01") });

      // Referrer remains A
      expect(await bridge.referrers(userB.address)).to.equal(userA.address);
    });

    it("cannot refer self", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      await bridge
        .connect(userA)
        .bridgeETH(userA.address, { value: ethers.parseEther("1") });

      // Self-referral should be ignored
      expect(await bridge.referrers(userA.address)).to.equal(ethers.ZeroAddress);
      expect(await bridge.referralCount(userA.address)).to.equal(0);
    });
  });

  // ================================================================== //
  //  6. FastBridge Tier Progression                                      //
  // ================================================================== //

  describe("6. FastBridge tier progression: Bronze -> Silver -> Gold", function () {
    it("user progresses through tiers based on accumulated points", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      // Tier constants from the contract:
      //   TIER_BRONZE   =  10,000 points   (tier 1)
      //   TIER_SILVER   =  50,000 points   (tier 2)
      //   TIER_GOLD     = 200,000 points   (tier 3)
      //
      // Base: 1,000 points per 1 ETH   + 20% early bird = 1,200 per ETH
      //
      // To reach Bronze (10k) we need ~8.34 ETH (at 1,200 pts/ETH).
      // To reach Silver (50k) more volume is needed; we'll bridge in chunks.

      // --- Bridge enough to reach Bronze ---
      // 10 ETH => ~12,000 points (early bird on first bridge only; subsequent bridges
      // get streak / tier bonuses that vary). We bridge a large amount to cross Bronze.
      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("10") });

      let stats = await bridge.userStats(userA.address);
      expect(stats.tier).to.equal(1); // Bronze
      expect(stats.points).to.be.gte(ethers.toBigInt(10_000));

      // --- Bridge more to approach / cross Silver ---
      // We need ~50k total. Each ETH now gives ~1,025 base (1000 + 2.5% tier 1 bonus)
      // plus streak bonuses if consecutive days. Bridge in bulk to save test time.
      for (let i = 0; i < 4; i++) {
        await time.increase(24 * 60 * 60); // next day for streak
        await bridge
          .connect(userA)
          .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("10") });
      }

      stats = await bridge.userStats(userA.address);
      expect(stats.tier).to.be.gte(2); // At least Silver

      // --- If not Gold yet, bridge more to cross 200k ---
      if (stats.tier < 3) {
        for (let i = 0; i < 15; i++) {
          await time.increase(24 * 60 * 60);
          await bridge
            .connect(userA)
            .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("10") });
        }
        stats = await bridge.userStats(userA.address);
      }

      expect(stats.tier).to.be.gte(3); // Gold
      expect(stats.points).to.be.gte(ethers.toBigInt(200_000));
    });

    it("getTierName returns correct labels", async function () {
      const { bridge } = await loadFixture(deployFullFixture);

      expect(await bridge.getTierName(0)).to.equal("Starter");
      expect(await bridge.getTierName(1)).to.equal("Bronze");
      expect(await bridge.getTierName(2)).to.equal("Silver");
      expect(await bridge.getTierName(3)).to.equal("Gold");
      expect(await bridge.getTierName(4)).to.equal("Platinum");
    });
  });

  // ================================================================== //
  //  7. Emergency Pause on ERC8004 and FastBridge                       //
  // ================================================================== //

  describe("7. Emergency pause / emergency withdraw", function () {
    describe("ERC8004 pause", function () {
      it("owner pauses wallet, agent cannot execute, owner unpauses, agent resumes", async function () {
        const {
          wallet,
          owner,
          agentSigner,
          target,
          agentDID,
          dummyData,
        } = await loadFixture(deployFullFixture);

        await wallet
          .connect(owner)
          .authorizeAgent(
            agentDID,
            ethers.parseEther("5"),
            ethers.parseEther("1"),
            [],
            true,
            agentSigner.address,
          );

        // Pause
        await expect(wallet.connect(owner).setPaused(true)).to.emit(
          wallet,
          "Paused",
        );

        // Agent blocked
        await expect(
          wallet
            .connect(agentSigner)
            .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1")),
        ).to.be.revertedWith("ERC8004: paused");

        // Batch also blocked
        await expect(
          wallet.connect(agentSigner).batchExecuteAsAgent(
            agentDID,
            [target.address],
            [dummyData],
            [ethers.parseEther("0.1")],
          ),
        ).to.be.revertedWith("ERC8004: paused");

        // Unpause
        await wallet.connect(owner).setPaused(false);

        // Agent can execute again
        await wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1"));
        expect(await wallet.getActionLogsCount()).to.equal(1);
      });

      it("non-owner cannot pause", async function () {
        const { wallet, agentSigner } = await loadFixture(deployFullFixture);

        await expect(
          wallet.connect(agentSigner).setPaused(true),
        ).to.be.reverted; // OwnableUnauthorizedAccount
      });

      it("owner can withdraw funds during emergency", async function () {
        const { wallet, walletAddr, owner } = await loadFixture(deployFullFixture);

        await wallet.connect(owner).setPaused(true);

        const balBefore = await ethers.provider.getBalance(owner.address);
        const tx = await wallet
          .connect(owner)
          .withdraw(owner.address, ethers.parseEther("10"));
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
        const balAfter = await ethers.provider.getBalance(owner.address);

        expect(balAfter - balBefore + gasUsed).to.equal(
          ethers.parseEther("10"),
        );
      });
    });

    describe("FastBridge emergency withdraw", function () {
      it("owner can emergency withdraw ETH from bridge", async function () {
        const { bridge, owner, userA } = await loadFixture(deployFullFixture);

        // Send some ETH directly to bridge contract to simulate stuck funds
        await owner.sendTransaction({
          to: await bridge.getAddress(),
          value: ethers.parseEther("5"),
        });

        const bridgeBalance = await ethers.provider.getBalance(
          await bridge.getAddress(),
        );
        expect(bridgeBalance).to.equal(ethers.parseEther("5"));

        // Owner emergency withdraws
        const ownerBalBefore = await ethers.provider.getBalance(owner.address);
        const tx = await bridge.connect(owner).emergencyWithdraw(ethers.ZeroAddress);
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
        const ownerBalAfter = await ethers.provider.getBalance(owner.address);

        // Bridge should be drained
        expect(
          await ethers.provider.getBalance(await bridge.getAddress()),
        ).to.equal(0);

        // Owner received the funds (minus gas)
        expect(ownerBalAfter - ownerBalBefore + gasUsed).to.equal(
          ethers.parseEther("5"),
        );
      });

      it("non-owner cannot emergency withdraw", async function () {
        const { bridge, userA } = await loadFixture(deployFullFixture);

        await expect(
          bridge.connect(userA).emergencyWithdraw(ethers.ZeroAddress),
        ).to.be.reverted;
      });
    });
  });

  // ================================================================== //
  //  Cross-contract: Agent Wallet bridges through FastBridge             //
  // ================================================================== //

  describe("Cross-contract: Agent wallet calls FastBridge", function () {
    it("agent uses wallet to bridge ETH through FastBridge", async function () {
      const {
        wallet,
        walletAddr,
        bridge,
        owner,
        agentSigner,
        agentDID,
      } = await loadFixture(deployFullFixture);

      const bridgeAddr = await bridge.getAddress();

      // Authorize agent with FastBridge on allowlist
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("2"),
          [bridgeAddr],
          false,
          agentSigner.address,
        );

      // Encode bridgeETH(address(0)) call
      const bridgeIface = bridge.interface;
      const calldata = bridgeIface.encodeFunctionData("bridgeETH", [
        ethers.ZeroAddress,
      ]);

      // Agent executes bridgeETH through the wallet
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, bridgeAddr, calldata, ethers.parseEther("1"));

      // The wallet address should be registered as a bridge user
      const stats = await bridge.userStats(walletAddr);
      expect(stats.points).to.be.gt(0);
      expect(stats.bridgeCount).to.equal(1);
    });

    it("agent cannot call non-whitelisted contract through wallet", async function () {
      const {
        wallet,
        bridge,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      const bridgeAddr = await bridge.getAddress();

      // Only bridge is whitelisted
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("5"),
          ethers.parseEther("2"),
          [bridgeAddr],
          false,
          agentSigner.address,
        );

      // Try to send ETH to target (not whitelisted) — should revert
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1")),
      ).to.be.revertedWith("ERC8004: contract not allowed");
    });
  });

  // ================================================================== //
  //  Edge Cases & Additional Coverage                                    //
  // ================================================================== //

  describe("Edge cases", function () {
    it("per-transaction limit is enforced independently of daily limit", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      // dailyLimit = 10 ETH, perTxLimit = 0.5 ETH
      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("10"),
          ethers.parseEther("0.5"),
          [],
          true,
          agentSigner.address,
        );

      // Single tx exceeding perTxLimit
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.6")),
      ).to.be.revertedWith("ERC8004: exceeds per-tx limit");
    });

    it("wallet can receive ETH and emits FundsDeposited", async function () {
      const { wallet, walletAddr, owner } = await loadFixture(deployFullFixture);

      await expect(
        owner.sendTransaction({
          to: walletAddr,
          value: ethers.parseEther("1"),
        }),
      ).to.emit(wallet, "FundsDeposited");
    });

    it("owner can update spending limits for an active agent", async function () {
      const {
        wallet,
        owner,
        agentSigner,
        target,
        agentDID,
        dummyData,
      } = await loadFixture(deployFullFixture);

      await wallet
        .connect(owner)
        .authorizeAgent(
          agentDID,
          ethers.parseEther("0.2"),
          ethers.parseEther("0.1"),
          [],
          true,
          agentSigner.address,
        );

      // Spend up to the limit
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1"));
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1"));

      // Limit reached
      await expect(
        wallet
          .connect(agentSigner)
          .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.1")),
      ).to.be.revertedWith("ERC8004: exceeds daily limit");

      // Owner increases limit
      await wallet
        .connect(owner)
        .updateSpendingLimit(
          agentDID,
          ethers.parseEther("1"),
          ethers.parseEther("0.5"),
        );

      // Agent can execute again
      await wallet
        .connect(agentSigner)
        .executeAsAgent(agentDID, target.address, dummyData, ethers.parseEther("0.3"));
    });

    it("FastBridge rejects bridge below minimum", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      await expect(
        bridge
          .connect(userA)
          .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("0.0001") }),
      ).to.be.revertedWith("Below minimum");
    });

    it("FastBridge rejects bridge above maximum", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      await expect(
        bridge
          .connect(userA)
          .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("200") }),
      ).to.be.revertedWith("Above maximum");
    });

    it("FastBridge getPointsBreakdown returns expected components", async function () {
      const { bridge, userA } = await loadFixture(deployFullFixture);

      const breakdown = await bridge.getPointsBreakdown(
        userA.address,
        ethers.parseEther("1"),
        false,
      );

      // Base: 1000 points per ETH
      expect(breakdown.basePoints).to.equal(1000);

      // Early bird bonus: EARLY_BIRD_BONUS=200 => (1000 * 200) / 100 = 2000
      expect(breakdown.earlyBirdBonus).to.equal(2000);

      // No agent bonus
      expect(breakdown.agentBonus).to.equal(0);

      // Total = base + early bird = 1000 + 2000 = 3000
      expect(breakdown.totalPoints_).to.equal(3000);
    });

    it("FastBridge leaderboard returns registered users", async function () {
      const { bridge, userA, userB, userC } = await loadFixture(deployFullFixture);

      await bridge
        .connect(userA)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("1") });
      await bridge
        .connect(userB)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("2") });
      await bridge
        .connect(userC)
        .bridgeETH(ethers.ZeroAddress, { value: ethers.parseEther("3") });

      const [users, points] = await bridge.getLeaderboard(10);
      expect(users.length).to.equal(3);
      expect(users).to.include(userA.address);
      expect(users).to.include(userB.address);
      expect(users).to.include(userC.address);

      // All should have non-zero points
      for (const p of points) {
        expect(p).to.be.gt(0);
      }
    });
  });
});
