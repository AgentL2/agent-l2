import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AgentRegistry", function () {
  async function deployFixture() {
    const [owner, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentRegistry");
    const registry = await Factory.deploy();
    return { registry, owner, agent1, agent2 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe("Agent Registration", function () {
    it("Should register an agent", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      // registerAgent(address agent, string did, string metadataURI)
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z123", "ipfs://meta");
      const agent = await registry.agents(agent1.address);
      expect(agent.did).to.equal("did:key:z123");
      expect(agent.active).to.be.true;
      expect(agent.registeredAt).to.be.gt(0);
    });

    it("Should not allow duplicate registration", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z123", "ipfs://meta");
      await expect(registry.connect(owner).registerAgent(agent1.address, "did:key:z456", "ipfs://meta2")).to.be.reverted;
    });

    it("Should emit AgentRegistered event", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await expect(registry.connect(owner).registerAgent(agent1.address, "did:key:z123", "ipfs://meta"))
        .to.emit(registry, "AgentRegistered");
    });

    it("Should track agent count", async function () {
      const { registry, owner, agent1, agent2 } = await loadFixture(deployFixture);
      expect(await registry.getAgentCount()).to.equal(0);
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://m1");
      expect(await registry.getAgentCount()).to.equal(1);
      await registry.connect(owner).registerAgent(agent2.address, "did:key:z2", "ipfs://m2");
      expect(await registry.getAgentCount()).to.equal(2);
    });

    it("Should update agent metadata", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://old");
      // updateAgent(address agent, string metadataURI) - called by agent owner
      await registry.connect(owner).updateAgent(agent1.address, "ipfs://new");
      const agent = await registry.agents(agent1.address);
      expect(agent.metadataURI).to.equal("ipfs://new");
    });

    it("Should deactivate agents", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://m");
      await registry.connect(owner).deactivateAgent(agent1.address);
      expect((await registry.agents(agent1.address)).active).to.be.false;
    });
  });

  describe("Services", function () {
    it("Should register a service for a registered agent", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://m");
      // registerService(address agent, string serviceType, uint256 pricePerUnit, string metadataURI)
      await registry.connect(owner).registerService(agent1.address, "text-generation", ethers.parseEther("0.01"), "ipfs://svc");
      const services = await registry.getAgentServices(agent1.address);
      expect(services.length).to.equal(1);
    });

    it("Should not register a service for unregistered agent", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await expect(registry.connect(owner).registerService(agent1.address, "text-gen", ethers.parseEther("0.01"), "ipfs://svc"))
        .to.be.reverted;
    });
  });

  describe("Pausable", function () {
    it("Should pause and unpause (owner only)", async function () {
      const { registry, owner, agent1 } = await loadFixture(deployFixture);
      await registry.connect(owner).pause();
      await expect(registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://m")).to.be.reverted;
      await registry.connect(owner).unpause();
      await registry.connect(owner).registerAgent(agent1.address, "did:key:z1", "ipfs://m");
    });
  });
});
