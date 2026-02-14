import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AgentMarketplace", function () {
  async function deployFixture() {
    const [owner, seller, buyer, feeCollector] = await ethers.getSigners();
    // Deploy registry first
    const RegistryFactory = await ethers.getContractFactory("AgentRegistry");
    const registry = await RegistryFactory.deploy();

    // Deploy marketplace with (address _registry, address _feeCollector)
    const MarketFactory = await ethers.getContractFactory("AgentMarketplace");
    const marketplace = await MarketFactory.deploy(await registry.getAddress(), feeCollector.address);

    // Transfer registry ownership to marketplace so it can call recordEarnings/recordSpending
    await registry.connect(owner).transferOwnership(await marketplace.getAddress());

    // Register agent: registerAgent(address agent, string did, string metadataURI)
    // Need to register from the marketplace owner (but registry ownership transferred, so use before transfer)
    // Actually, registerAgent is whenNotPaused, anyone can call it to register any agent address
    // But now registry is owned by marketplace... let's re-deploy with proper ordering
    return { registry, marketplace, owner, seller, buyer, feeCollector };
  }

  async function deployWithServiceFixture() {
    const [owner, seller, buyer, feeCollector] = await ethers.getSigners();
    const RegistryFactory = await ethers.getContractFactory("AgentRegistry");
    const registry = await RegistryFactory.deploy();

    // Register agent on registry (owner calls)
    await registry.connect(owner).registerAgent(seller.address, "did:key:seller", "ipfs://seller");
    // Register service on registry (owner calls, since owner == msg.sender and agent.owner == owner)
    await registry.connect(owner).registerService(seller.address, "text-generation", ethers.parseEther("0.01"), "ipfs://svc1");
    const services = await registry.getAgentServices(seller.address);
    const serviceId = services[0];

    // Deploy marketplace
    const MarketFactory = await ethers.getContractFactory("AgentMarketplace");
    const marketplace = await MarketFactory.deploy(await registry.getAddress(), feeCollector.address);

    // Transfer registry ownership to marketplace for recordEarnings/recordSpending
    await registry.connect(owner).transferOwnership(await marketplace.getAddress());

    return { registry, marketplace, owner, seller, buyer, feeCollector, serviceId };
  }

  describe("Deployment", function () {
    it("Should deploy with correct fee settings", async function () {
      const { marketplace } = await loadFixture(deployFixture);
      expect(await marketplace.protocolFeeBps()).to.equal(250);
    });
  });

  describe("Orders", function () {
    it("Should create an order with correct payment", async function () {
      const { marketplace, buyer, serviceId } = await loadFixture(deployWithServiceFixture);
      // createOrder(bytes32 serviceId, uint256 units, uint256 deadline) payable
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(marketplace.connect(buyer).createOrder(serviceId, 1, deadline, { value: ethers.parseEther("0.01") }))
        .to.emit(marketplace, "OrderCreated");
    });

    it("Should reject orders with insufficient payment", async function () {
      const { marketplace, buyer, serviceId } = await loadFixture(deployWithServiceFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(marketplace.connect(buyer).createOrder(serviceId, 1, deadline, { value: 0 })).to.be.reverted;
    });

    it("Should complete an order (seller only)", async function () {
      const { marketplace, buyer, seller, serviceId } = await loadFixture(deployWithServiceFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await marketplace.connect(buyer).createOrder(serviceId, 1, deadline, { value: ethers.parseEther("0.01") });
      const orders = await marketplace.getAgentOrders(seller.address);
      await expect(marketplace.connect(seller).completeOrder(orders[0], "ipfs://result", ethers.randomBytes(32)))
        .to.emit(marketplace, "OrderCompleted");
    });

    it("Should not let non-seller complete order", async function () {
      const { marketplace, buyer, seller, serviceId } = await loadFixture(deployWithServiceFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await marketplace.connect(buyer).createOrder(serviceId, 1, deadline, { value: ethers.parseEther("0.01") });
      const orders = await marketplace.getAgentOrders(seller.address);
      await expect(marketplace.connect(buyer).completeOrder(orders[0], "ipfs://r", ethers.randomBytes(32)))
        .to.be.reverted;
    });

    it("Should handle cancellation (buyer only)", async function () {
      const { marketplace, buyer, seller, serviceId } = await loadFixture(deployWithServiceFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await marketplace.connect(buyer).createOrder(serviceId, 1, deadline, { value: ethers.parseEther("0.01") });
      const orders = await marketplace.getAgentOrders(buyer.address);
      await expect(marketplace.connect(buyer).cancelOrder(orders[0]))
        .to.emit(marketplace, "OrderCancelled");
    });
  });
});
