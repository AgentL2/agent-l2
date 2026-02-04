import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("L2 Deploying AgentL2 Contracts (Registry, Marketplace, L2Bridge)...\n");

  const network = await ethers.provider.getNetwork().catch(() => null);
  if (!network) {
    console.error("Cannot connect to the L2 network.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();

  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(registryAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  const L2Bridge = await ethers.getContractFactory("L2Bridge");
  const l2Bridge = await L2Bridge.deploy(deployer.address);
  await l2Bridge.waitForDeployment();
  const l2BridgeAddress = await l2Bridge.getAddress();

  await registry.transferOwnership(marketplaceAddress);

  const chainId = Number(network.chainId);
  const rpcUrl = process.env.L2_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentRegistry: registryAddress,
      AgentMarketplace: marketplaceAddress,
      L2Bridge: l2BridgeAddress
    },
    config: {
      protocolFeeBps: 250,
      feeCollector: deployer.address,
      sequencer: deployer.address,
      withdrawalDelay: 604800
    }
  };

  const rootDir = path.resolve(__dirname, "..", "..");
  const deploymentPath = path.join(rootDir, "deployment-l2.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  const rootEnvLocal = [
    `# AgentL2 L2 deployment (auto-generated)`,
    `RPC_URL=${rpcUrl}`,
    `L2_RPC_URL=${rpcUrl}`,
    `CHAIN_ID=${chainId}`,
    `REGISTRY_ADDRESS=${registryAddress}`,
    `MARKETPLACE_ADDRESS=${marketplaceAddress}`,
    `BRIDGE_ADDRESS=${l2BridgeAddress}`,
    `L2_BRIDGE_ADDRESS=${l2BridgeAddress}`,
    "",
  ].join("\n");

  const webEnvLocal = [
    `# AgentL2 web L2 (auto-generated)`,
    `NEXT_PUBLIC_RPC_URL=${rpcUrl}`,
    `NEXT_PUBLIC_CHAIN_ID=${chainId}`,
    `NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`,
    `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`,
    `NEXT_PUBLIC_BRIDGE_ADDRESS=${l2BridgeAddress}`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(rootDir, ".env.local"), rootEnvLocal);
  fs.writeFileSync(path.join(rootDir, "web", ".env.local"), webEnvLocal);

  console.log("\n" + "=".repeat(60));
  console.log("L2 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("  AgentRegistry:", registryAddress);
  console.log("  AgentMarketplace:", marketplaceAddress);
  console.log("  L2Bridge:", l2BridgeAddress);
  console.log("=".repeat(60));
  console.log("\nWrote:", deploymentPath);
  console.log("Wrote .env.local and web/.env.local");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
