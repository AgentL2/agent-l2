import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying AgentL2 Contracts...\n");

  const network = await ethers.provider.getNetwork().catch(() => null);
  if (!network) {
    console.error("❌ Cannot connect to the network (e.g. localhost:8545).");
    console.error("   Start the devnet first in another terminal: npm run devnet");
    console.error("   Then run this again: npm run deploy:local\n");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy AgentRegistry
  console.log("📝 Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ AgentRegistry deployed to:", registryAddress);

  // 2. Deploy AgentMarketplace
  console.log("\n💰 Deploying AgentMarketplace...");
  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(
    registryAddress,
    deployer.address // Fee collector
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ AgentMarketplace deployed to:", marketplaceAddress);

  // 3. Deploy L2Bridge
  console.log("\n🌉 Deploying L2Bridge...");
  const L2Bridge = await ethers.getContractFactory("L2Bridge");
  const bridge = await L2Bridge.deploy(deployer.address); // Deployer is sequencer initially
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ L2Bridge deployed to:", bridgeAddress);

  // 4. Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Transfer registry ownership to marketplace for earnings/spending tracking
  console.log("Setting marketplace as registry owner...");
  await registry.transferOwnership(marketplaceAddress);
  console.log("✅ Registry ownership transferred");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", await ethers.provider.getNetwork().then(n => n.name));
  console.log("Chain ID:", await ethers.provider.getNetwork().then(n => n.chainId));
  console.log("\nContract Addresses:");
  console.log("  AgentRegistry:     ", registryAddress);
  console.log("  AgentMarketplace:  ", marketplaceAddress);
  console.log("  L2Bridge:          ", bridgeAddress);
  console.log("\nConfiguration:");
  console.log("  Protocol Fee:      ", "2.5%");
  console.log("  Fee Collector:     ", deployer.address);
  console.log("  Sequencer:         ", deployer.address);
  console.log("=".repeat(60));

  // Save deployment info
  const deployment = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    chainId: await ethers.provider.getNetwork().then(n => Number(n.chainId)),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentRegistry: registryAddress,
      AgentMarketplace: marketplaceAddress,
      L2Bridge: bridgeAddress
    },
    config: {
      protocolFeeBps: 250,
      feeCollector: deployer.address,
      sequencer: deployer.address,
      withdrawalDelay: 604800 // 7 days in seconds
    }
  };

  const rootDir = path.resolve(__dirname, "..", "..");
  const deploymentPath = path.join(rootDir, "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  const chainId = deployment.chainId;
  const isSepolia = chainId === 11155111;
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org")
    : "http://127.0.0.1:8545";
  const envLabel = isSepolia ? "Sepolia testnet" : "local";

  const rootEnvLocal = [
    `# AgentL2 ${envLabel} deployment (auto-generated)`,
    `RPC_URL=${rpcUrl}`,
    `CHAIN_ID=${chainId}`,
    `REGISTRY_ADDRESS=${registryAddress}`,
    `MARKETPLACE_ADDRESS=${marketplaceAddress}`,
    `BRIDGE_ADDRESS=${bridgeAddress}`,
    "",
  ].join("\n");

  const webEnvLocal = [
    `# AgentL2 web ${envLabel} (auto-generated)`,
    `NEXT_PUBLIC_RPC_URL=${rpcUrl}`,
    `NEXT_PUBLIC_CHAIN_ID=${chainId}`,
    `NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`,
    `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`,
    `NEXT_PUBLIC_BRIDGE_ADDRESS=${bridgeAddress}`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(rootDir, ".env.local"), rootEnvLocal);
  fs.writeFileSync(path.join(rootDir, "web", ".env.local"), webEnvLocal);

  console.log("\n📄 Deployment Info:");
  console.log(JSON.stringify(deployment, null, 2));
  console.log("\n🧩 Wrote env files:");
  console.log(`- ${path.join(rootDir, ".env.local")}`);
  console.log(`- ${path.join(rootDir, "web", ".env.local")}`);

  console.log("\n💡 Next Steps:");
  console.log("1. If needed, copy .env.local values into your env files:");
  console.log(`   REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`   MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`   BRIDGE_ADDRESS=${bridgeAddress}`);
  const networkName = isSepolia ? "sepolia" : "localhost";
  console.log("\n2. Verify contracts on Etherscan (if on Sepolia, set ETHERSCAN_API_KEY):");
  console.log(`   npx hardhat verify --network ${networkName} ${registryAddress}`);
  console.log(`   npx hardhat verify --network ${networkName} ${marketplaceAddress} ${registryAddress} ${deployer.address}`);
  console.log(`   npx hardhat verify --network ${networkName} ${bridgeAddress} ${deployer.address}`);
  console.log("\n3. Start using the SDK:");
  console.log("   cd sdk && npm run example:register");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
