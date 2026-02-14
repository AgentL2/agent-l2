import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";

/**
 * End-to-end integration test: Full Agent Lifecycle
 *
 * Covers the complete flow through AgentRegistry + AgentMarketplace:
 *   register agent -> register service -> create order -> complete order
 *   -> verify payment distribution (seller + fee collector)
 *   -> cancel order -> verify refund
 */
describe("Agent Lifecycle (E2E)", function () {
  // ---------------------------------------------------------------------------
  // Shared fixture: deploys both contracts, registers an agent with a service,
  // and transfers registry ownership to the marketplace so recordEarnings /
  // recordSpending succeed.
  // ---------------------------------------------------------------------------
  async function deployFullFixture() {
    const [owner, sellerOwner, buyer, feeCollector, agent2Owner, agent3Owner] =
      await ethers.getSigners();

    // --- Deploy AgentRegistry (no constructor args) ---
    const RegistryFactory = await ethers.getContractFactory("AgentRegistry");
    const registry = await RegistryFactory.deploy();

    // --- Register agents & services BEFORE transferring ownership ----------
    // Agent 1 (seller)
    await registry
      .connect(sellerOwner)
      .registerAgent(
        sellerOwner.address,
        "did:key:zSeller1",
        "ipfs://seller-meta"
      );

    const pricePerUnit = ethers.parseEther("0.01"); // 10 000 000 000 000 000 wei
    await registry
      .connect(sellerOwner)
      .registerService(
        sellerOwner.address,
        "text-generation",
        pricePerUnit,
        "ipfs://svc-text-gen"
      );

    const sellerServices = await registry.getAgentServices(
      sellerOwner.address
    );
    const serviceId = sellerServices[0];

    // Agent 2 (competing seller)
    await registry
      .connect(agent2Owner)
      .registerAgent(
        agent2Owner.address,
        "did:key:zSeller2",
        "ipfs://seller2-meta"
      );

    const pricePerUnit2 = ethers.parseEther("0.02");
    await registry
      .connect(agent2Owner)
      .registerService(
        agent2Owner.address,
        "image-generation",
        pricePerUnit2,
        "ipfs://svc-image-gen"
      );

    const seller2Services = await registry.getAgentServices(
      agent2Owner.address
    );
    const serviceId2 = seller2Services[0];

    // --- Deploy AgentMarketplace (registry address, feeCollector address) ---
    const MarketFactory = await ethers.getContractFactory("AgentMarketplace");
    const marketplace = await MarketFactory.deploy(
      await registry.getAddress(),
      feeCollector.address
    );

    // Transfer registry ownership to marketplace so it can call
    // recordEarnings / recordSpending / updateReputation.
    await registry
      .connect(owner)
      .transferOwnership(await marketplace.getAddress());

    // Pre-compute useful constants
    const BPS_DENOMINATOR = 10_000n;
    const protocolFeeBps = 250n; // 2.5 %

    return {
      registry,
      marketplace,
      owner,
      sellerOwner,
      buyer,
      feeCollector,
      agent2Owner,
      agent3Owner,
      serviceId,
      serviceId2,
      pricePerUnit,
      pricePerUnit2,
      BPS_DENOMINATOR,
      protocolFeeBps,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Full lifecycle: register -> service -> order -> complete -> verify
  // ---------------------------------------------------------------------------
  describe("Full lifecycle: register, service, order, complete, verify balances", function () {
    it("should complete an order and distribute payment correctly", async function () {
      const {
        marketplace,
        registry,
        sellerOwner,
        buyer,
        feeCollector,
        serviceId,
        pricePerUnit,
        BPS_DENOMINATOR,
        protocolFeeBps,
      } = await loadFixture(deployFullFixture);

      const units = 3n;
      const totalPrice = pricePerUnit * units; // 0.03 ETH
      const expectedFee =
        (totalPrice * protocolFeeBps) / BPS_DENOMINATOR; // 0.00075 ETH
      const expectedSellerPayout = totalPrice - expectedFee; // 0.02925 ETH

      // Create order: buyer pays totalPrice
      const deadline = (await time.latest()) + 86_400; // +1 day
      const createTx = await marketplace
        .connect(buyer)
        .createOrder(serviceId, units, deadline, { value: totalPrice });

      await expect(createTx).to.emit(marketplace, "OrderCreated");

      // Retrieve the orderId from the seller's order list
      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      expect(sellerOrders.length).to.equal(1);
      const orderId = sellerOrders[0];

      // Verify order stored correctly
      const order = await marketplace.orders(orderId);
      expect(order.buyer).to.equal(buyer.address);
      expect(order.seller).to.equal(sellerOwner.address);
      expect(order.totalPrice).to.equal(totalPrice);
      expect(order.status).to.equal(0); // Pending

      // Seller completes the order
      const resultURI = "ipfs://QmResult123";
      const resultHash = ethers.randomBytes(32);

      const sellerBalBefore = await ethers.provider.getBalance(
        sellerOwner.address
      );

      const completeTx = await marketplace
        .connect(sellerOwner)
        .completeOrder(orderId, resultURI, resultHash);

      await expect(completeTx).to.emit(marketplace, "OrderCompleted");

      // Verify order state
      const completedOrder = await marketplace.orders(orderId);
      expect(completedOrder.status).to.equal(1); // Completed
      expect(completedOrder.resultURI).to.equal(resultURI);

      // Verify seller received payment (minus gas)
      const sellerBalAfter = await ethers.provider.getBalance(
        sellerOwner.address
      );
      const receipt = await completeTx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      expect(sellerBalAfter).to.equal(
        sellerBalBefore + expectedSellerPayout - gasUsed
      );

      // Verify protocol fees accumulated
      expect(await marketplace.collectedFees()).to.equal(expectedFee);

      // Verify registry recorded earnings & spending
      const sellerAgent = await registry.agents(sellerOwner.address);
      expect(sellerAgent.totalEarned).to.equal(expectedSellerPayout);

      // buyer spending should equal totalPrice
      const buyerAgent = await registry.agents(buyer.address);
      // buyer is not a registered agent, so totalSpent stays 0 on the struct
      // but the contract still calls recordSpending — since buyer isn't in the
      // registry struct it just adds to a zero-initialised slot.  We verify
      // the mapping value directly.
      // Actually recordSpending just does agents[agent].totalSpent += amount
      // even for non-registered agents — the value is stored regardless.
      expect(buyerAgent.totalSpent).to.equal(totalPrice);
    });

    it("should emit correct event args on OrderCreated", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const units = 1n;
      const totalPrice = pricePerUnit * units;
      const deadline = (await time.latest()) + 86_400;

      await expect(
        marketplace
          .connect(buyer)
          .createOrder(serviceId, units, deadline, { value: totalPrice })
      )
        .to.emit(marketplace, "OrderCreated")
        .withArgs(
          // orderId — any bytes32
          (v: any) => typeof v === "string" && v.length === 66,
          serviceId,
          buyer.address,
          sellerOwner.address,
          totalPrice
        );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Order cancellation with refund
  // ---------------------------------------------------------------------------
  describe("Order cancellation with refund", function () {
    it("should refund the buyer in full when order is cancelled", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const units = 2n;
      const totalPrice = pricePerUnit * units;
      const deadline = (await time.latest()) + 86_400;

      // Buyer creates order
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, units, deadline, { value: totalPrice });

      const buyerOrders = await marketplace.getAgentOrders(buyer.address);
      const orderId = buyerOrders[0];

      // Record buyer balance before cancel
      const buyerBalBefore = await ethers.provider.getBalance(buyer.address);

      // Buyer cancels
      const cancelTx = await marketplace.connect(buyer).cancelOrder(orderId);
      await expect(cancelTx).to.emit(marketplace, "OrderCancelled");

      const receipt = await cancelTx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      // Buyer should get full refund (minus gas)
      const buyerBalAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalAfter).to.equal(
        buyerBalBefore + totalPrice - gasUsed
      );

      // Order status should be Cancelled (3)
      const order = await marketplace.orders(orderId);
      expect(order.status).to.equal(3); // Cancelled

      // No fees should have been collected
      expect(await marketplace.collectedFees()).to.equal(0n);
    });

    it("should not allow seller to cancel order", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      const orderId = sellerOrders[0];

      await expect(
        marketplace.connect(sellerOwner).cancelOrder(orderId)
      ).to.be.revertedWithCustomError(marketplace, "NotBuyer");
    });

    it("should not allow cancelling a completed order", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      const orderId = sellerOrders[0];

      // Complete the order first
      await marketplace
        .connect(sellerOwner)
        .completeOrder(orderId, "ipfs://done", ethers.randomBytes(32));

      // Try to cancel — should fail
      await expect(
        marketplace.connect(buyer).cancelOrder(orderId)
      ).to.be.revertedWithCustomError(marketplace, "OrderNotPending");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Multiple agents competing for orders
  // ---------------------------------------------------------------------------
  describe("Multiple agents competing for orders", function () {
    it("should handle orders to different agents independently", async function () {
      const {
        marketplace,
        buyer,
        sellerOwner,
        agent2Owner,
        serviceId,
        serviceId2,
        pricePerUnit,
        pricePerUnit2,
        protocolFeeBps,
        BPS_DENOMINATOR,
      } = await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;

      // Buyer creates order for agent 1's text-generation service
      const totalPrice1 = pricePerUnit * 2n;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 2, deadline, { value: totalPrice1 });

      // Buyer creates order for agent 2's image-generation service
      const totalPrice2 = pricePerUnit2 * 1n;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId2, 1, deadline, { value: totalPrice2 });

      // Both agents should have 1 order each
      const agent1Orders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      const agent2Orders = await marketplace.getAgentOrders(
        agent2Owner.address
      );
      expect(agent1Orders.length).to.equal(1);
      expect(agent2Orders.length).to.equal(1);

      // Agent 1 completes their order
      await marketplace
        .connect(sellerOwner)
        .completeOrder(
          agent1Orders[0],
          "ipfs://text-result",
          ethers.randomBytes(32)
        );

      // Agent 2 completes their order
      await marketplace
        .connect(agent2Owner)
        .completeOrder(
          agent2Orders[0],
          "ipfs://image-result",
          ethers.randomBytes(32)
        );

      // Verify both orders completed
      expect((await marketplace.orders(agent1Orders[0])).status).to.equal(1);
      expect((await marketplace.orders(agent2Orders[0])).status).to.equal(1);

      // Verify total fees: sum of both order fees
      const expectedFee1 =
        (totalPrice1 * protocolFeeBps) / BPS_DENOMINATOR;
      const expectedFee2 =
        (totalPrice2 * protocolFeeBps) / BPS_DENOMINATOR;
      expect(await marketplace.collectedFees()).to.equal(
        expectedFee1 + expectedFee2
      );
    });

    it("should allow buyer to create multiple orders for the same service", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;

      // Create two orders for the same service
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 3, deadline, { value: pricePerUnit * 3n });

      // Buyer should see 2 orders, seller should see 2 orders
      const buyerOrders = await marketplace.getAgentOrders(buyer.address);
      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      expect(buyerOrders.length).to.equal(2);
      expect(sellerOrders.length).to.equal(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Service deactivation prevents new orders
  // ---------------------------------------------------------------------------
  describe("Service deactivation prevents new orders", function () {
    it("should reject orders for a deactivated service", async function () {
      // We need to deactivate a service, but after ownership transfer,
      // registry is owned by marketplace. deactivateService checks
      // agents[service.agent].owner == msg.sender — so the agent owner can
      // still deactivate.  But wait — registerService and deactivateService
      // only check NotAgentOwner, not onlyOwner.  So they work regardless of
      // contract ownership.  Good.

      const {
        registry,
        marketplace,
        buyer,
        sellerOwner,
        serviceId,
        pricePerUnit,
      } = await loadFixture(deployFullFixture);

      // Seller deactivates their own service
      // deactivateService is on registry, requires agent owner
      // But registry ownership has been transferred to marketplace.
      // deactivateService does NOT have onlyOwner — it checks
      // agents[service.agent].owner != msg.sender.  So sellerOwner can call it.
      //
      // However registry is owned by marketplace now. The deactivateService
      // function doesn't use onlyOwner, so it should still work from sellerOwner.
      //
      // Actually, let's check: the registry's transferOwnership only affects
      // onlyOwner-gated functions (recordEarnings, recordSpending, updateReputation,
      // pause, unpause).  deactivateService just checks agent.owner == msg.sender.
      await registry.connect(sellerOwner).deactivateService(serviceId);

      // Verify service is inactive
      const service = await registry.services(serviceId);
      expect(service.active).to.be.false;

      // Try to create an order — should fail
      const deadline = (await time.latest()) + 86_400;
      await expect(
        marketplace
          .connect(buyer)
          .createOrder(serviceId, 1, deadline, { value: pricePerUnit })
      ).to.be.revertedWithCustomError(marketplace, "ServiceNotActive");
    });

    it("should still allow completion of existing orders after service deactivation", async function () {
      const {
        registry,
        marketplace,
        buyer,
        sellerOwner,
        serviceId,
        pricePerUnit,
      } = await loadFixture(deployFullFixture);

      // Create an order while service is active
      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      const orderId = sellerOrders[0];

      // Deactivate the service
      await registry.connect(sellerOwner).deactivateService(serviceId);

      // Seller should still be able to complete the existing order
      await expect(
        marketplace
          .connect(sellerOwner)
          .completeOrder(orderId, "ipfs://late-result", ethers.randomBytes(32))
      ).to.emit(marketplace, "OrderCompleted");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Fee calculation verification
  // ---------------------------------------------------------------------------
  describe("Fee calculation verification (protocolFeeBps = 250 = 2.5%)", function () {
    it("should calculate 2.5% fee correctly on a round number", async function () {
      const {
        marketplace,
        buyer,
        sellerOwner,
        feeCollector,
        serviceId,
        pricePerUnit,
        protocolFeeBps,
        BPS_DENOMINATOR,
      } = await loadFixture(deployFullFixture);

      // 10 units @ 0.01 ETH = 0.1 ETH total
      const units = 10n;
      const totalPrice = pricePerUnit * units; // 0.1 ETH
      const expectedFee =
        (totalPrice * protocolFeeBps) / BPS_DENOMINATOR;
      const expectedSellerPayout = totalPrice - expectedFee;

      // Sanity: 2.5% of 0.1 ETH = 0.0025 ETH
      expect(expectedFee).to.equal(ethers.parseEther("0.0025"));
      expect(expectedSellerPayout).to.equal(ethers.parseEther("0.0975"));

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, units, deadline, { value: totalPrice });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );

      await marketplace
        .connect(sellerOwner)
        .completeOrder(
          sellerOrders[0],
          "ipfs://result",
          ethers.randomBytes(32)
        );

      expect(await marketplace.collectedFees()).to.equal(expectedFee);
    });

    it("should allow feeCollector to withdraw accumulated fees", async function () {
      const {
        marketplace,
        buyer,
        sellerOwner,
        feeCollector,
        serviceId,
        pricePerUnit,
        protocolFeeBps,
        BPS_DENOMINATOR,
      } = await loadFixture(deployFullFixture);

      const units = 5n;
      const totalPrice = pricePerUnit * units;
      const expectedFee =
        (totalPrice * protocolFeeBps) / BPS_DENOMINATOR;

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, units, deadline, { value: totalPrice });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      await marketplace
        .connect(sellerOwner)
        .completeOrder(
          sellerOrders[0],
          "ipfs://result",
          ethers.randomBytes(32)
        );

      // Record feeCollector balance
      const feeBalBefore = await ethers.provider.getBalance(
        feeCollector.address
      );

      // Withdraw fees
      const withdrawTx = await marketplace
        .connect(feeCollector)
        .withdrawFees();
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const feeBalAfter = await ethers.provider.getBalance(
        feeCollector.address
      );
      expect(feeBalAfter).to.equal(
        feeBalBefore + expectedFee - gasUsed
      );

      // Collected fees should be zero after withdrawal
      expect(await marketplace.collectedFees()).to.equal(0n);
    });

    it("should not allow non-feeCollector to withdraw fees", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      await marketplace
        .connect(sellerOwner)
        .completeOrder(
          sellerOrders[0],
          "ipfs://result",
          ethers.randomBytes(32)
        );

      await expect(
        marketplace.connect(buyer).withdrawFees()
      ).to.be.revertedWithCustomError(marketplace, "NotFeeCollector");
    });

    it("should handle fee correctly for small amounts (1 wei price)", async function () {
      // Edge case: if totalPrice is very small, fee truncates to 0
      // 1 wei * 250 / 10000 = 0 (integer division)
      // This is by design — seller gets the full 1 wei.

      // We need a service with 1 wei price; create a fresh fixture inline.
      const [, sellerOwner2, buyer2, feeCollector2] =
        await ethers.getSigners();

      const RegistryFactory =
        await ethers.getContractFactory("AgentRegistry");
      const reg = await RegistryFactory.deploy();

      await reg
        .connect(sellerOwner2)
        .registerAgent(
          sellerOwner2.address,
          "did:key:zSmall",
          "ipfs://small"
        );
      await reg
        .connect(sellerOwner2)
        .registerService(
          sellerOwner2.address,
          "tiny-service",
          1n, // 1 wei per unit
          "ipfs://tiny"
        );
      const svcIds = await reg.getAgentServices(sellerOwner2.address);
      const tinyServiceId = svcIds[0];

      const MarketFactory =
        await ethers.getContractFactory("AgentMarketplace");
      const mkt = await MarketFactory.deploy(
        await reg.getAddress(),
        feeCollector2.address
      );
      // Transfer registry ownership
      const regOwner = await reg.owner();
      // The deployer of reg is sellerOwner2? No — RegistryFactory.deploy()
      // uses the first default signer. Let's just use the actual owner.
      const [defaultSigner] = await ethers.getSigners();
      await reg
        .connect(defaultSigner)
        .transferOwnership(await mkt.getAddress());

      const deadline = (await time.latest()) + 86_400;
      await mkt
        .connect(buyer2)
        .createOrder(tinyServiceId, 1, deadline, { value: 1n });

      const orders = await mkt.getAgentOrders(sellerOwner2.address);
      await mkt
        .connect(sellerOwner2)
        .completeOrder(orders[0], "ipfs://tiny-result", ethers.randomBytes(32));

      // Fee should be 0 (1 * 250 / 10000 = 0)
      expect(await mkt.collectedFees()).to.equal(0n);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases & deadline enforcement
  // ---------------------------------------------------------------------------
  describe("Deadline enforcement", function () {
    it("should reject order completion after deadline", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      // Set a very short deadline
      const now = await time.latest();
      const deadline = now + 60; // 60 seconds from now

      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const sellerOrders = await marketplace.getAgentOrders(
        sellerOwner.address
      );
      const orderId = sellerOrders[0];

      // Advance time past deadline
      await time.increaseTo(deadline + 1);

      await expect(
        marketplace
          .connect(sellerOwner)
          .completeOrder(orderId, "ipfs://late", ethers.randomBytes(32))
      ).to.be.revertedWithCustomError(marketplace, "DeadlinePassed");
    });

    it("should reject order cancellation after deadline", async function () {
      const { marketplace, buyer, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const now = await time.latest();
      const deadline = now + 60;

      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const buyerOrders = await marketplace.getAgentOrders(buyer.address);
      const orderId = buyerOrders[0];

      // Advance time past deadline
      await time.increaseTo(deadline + 1);

      await expect(
        marketplace.connect(buyer).cancelOrder(orderId)
      ).to.be.revertedWithCustomError(marketplace, "DeadlinePassed");
    });

    it("should reject order with deadline in the past", async function () {
      const { marketplace, buyer, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const pastDeadline = (await time.latest()) - 1;

      await expect(
        marketplace
          .connect(buyer)
          .createOrder(serviceId, 1, pastDeadline, { value: pricePerUnit })
      ).to.be.revertedWithCustomError(marketplace, "InvalidDeadline");
    });
  });

  // ---------------------------------------------------------------------------
  // Overpayment refund
  // ---------------------------------------------------------------------------
  describe("Overpayment handling", function () {
    it("should refund excess payment on order creation", async function () {
      const { marketplace, buyer, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const units = 1n;
      const totalPrice = pricePerUnit * units;
      const overpayment = ethers.parseEther("1.0"); // way more than 0.01

      const buyerBalBefore = await ethers.provider.getBalance(buyer.address);
      const deadline = (await time.latest()) + 86_400;

      const tx = await marketplace
        .connect(buyer)
        .createOrder(serviceId, units, deadline, { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const buyerBalAfter = await ethers.provider.getBalance(buyer.address);

      // Buyer should only have paid totalPrice + gas (excess refunded)
      expect(buyerBalAfter).to.equal(
        buyerBalBefore - totalPrice - gasUsed
      );

      // Marketplace should only hold totalPrice in escrow
      const marketplaceBalance = await ethers.provider.getBalance(
        await marketplace.getAddress()
      );
      expect(marketplaceBalance).to.equal(totalPrice);
    });
  });

  // ---------------------------------------------------------------------------
  // Dispute flow (bonus — complements the cancel flow)
  // ---------------------------------------------------------------------------
  describe("Dispute resolution flow", function () {
    it("should allow buyer to dispute and feeCollector to refund", async function () {
      const {
        marketplace,
        buyer,
        sellerOwner,
        feeCollector,
        serviceId,
        pricePerUnit,
      } = await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const buyerOrders = await marketplace.getAgentOrders(buyer.address);
      const orderId = buyerOrders[0];

      // Buyer disputes
      await expect(
        marketplace.connect(buyer).disputeOrder(orderId, "Service not delivered")
      ).to.emit(marketplace, "OrderDisputed");

      const disputedOrder = await marketplace.orders(orderId);
      expect(disputedOrder.status).to.equal(2); // Disputed

      // feeCollector resolves in buyer's favor
      const buyerBalBefore = await ethers.provider.getBalance(buyer.address);

      await expect(
        marketplace.connect(feeCollector).resolveDispute(orderId, true)
      ).to.emit(marketplace, "OrderRefunded");

      const resolvedOrder = await marketplace.orders(orderId);
      expect(resolvedOrder.status).to.equal(4); // Refunded

      // Buyer should have received refund
      const buyerBalAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalAfter).to.be.gt(buyerBalBefore);
    });

    it("should reject dispute resolution by non-feeCollector", async function () {
      const { marketplace, buyer, sellerOwner, serviceId, pricePerUnit } =
        await loadFixture(deployFullFixture);

      const deadline = (await time.latest()) + 86_400;
      await marketplace
        .connect(buyer)
        .createOrder(serviceId, 1, deadline, { value: pricePerUnit });

      const buyerOrders = await marketplace.getAgentOrders(buyer.address);
      const orderId = buyerOrders[0];

      await marketplace
        .connect(buyer)
        .disputeOrder(orderId, "Bad service");

      await expect(
        marketplace.connect(sellerOwner).resolveDispute(orderId, true)
      ).to.be.revertedWithCustomError(marketplace, "NotFeeCollector");
    });
  });
});
