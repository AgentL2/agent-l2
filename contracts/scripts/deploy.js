"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function main() {
    console.log("🚀 Deploying AgentL2 Contracts...\n");
    const network = await hardhat_1.ethers.provider.getNetwork().catch(() => null);
    if (!network) {
        console.error("❌ Cannot connect to the network (e.g. localhost:8545).");
        console.error("   Start the devnet first in another terminal: npm run devnet");
        console.error("   Then run this again: npm run deploy:local\n");
        process.exit(1);
    }
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("Deploying from account:", deployer.address);
    console.log("Account balance:", hardhat_1.ethers.formatEther(await hardhat_1.ethers.provider.getBalance(deployer.address)), "ETH\n");
    // 1. Deploy AgentRegistry
    console.log("📝 Deploying AgentRegistry...");
    const AgentRegistry = await hardhat_1.ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ AgentRegistry deployed to:", registryAddress);
    // 2. Deploy AgentMarketplace
    console.log("\n💰 Deploying AgentMarketplace...");
    const AgentMarketplace = await hardhat_1.ethers.getContractFactory("AgentMarketplace");
    const marketplace = await AgentMarketplace.deploy(registryAddress, deployer.address // Fee collector
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ AgentMarketplace deployed to:", marketplaceAddress);
    // 3. Deploy L2Bridge
    console.log("\n🌉 Deploying L2Bridge...");
    const L2Bridge = await hardhat_1.ethers.getContractFactory("L2Bridge");
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
    console.log("Network:", await hardhat_1.ethers.provider.getNetwork().then(n => n.name));
    console.log("Chain ID:", await hardhat_1.ethers.provider.getNetwork().then(n => n.chainId));
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
        network: await hardhat_1.ethers.provider.getNetwork().then(n => n.name),
        chainId: await hardhat_1.ethers.provider.getNetwork().then(n => Number(n.chainId)),
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
    const rootDir = path_1.default.resolve(__dirname, "..", "..");
    const deploymentPath = path_1.default.join(rootDir, "deployment.json");
    fs_1.default.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    const rootEnvLocal = [
        "# AgentL2 local deployment (auto-generated)",
        "RPC_URL=http://localhost:8545",
        `CHAIN_ID=${deployment.chainId}`,
        `REGISTRY_ADDRESS=${registryAddress}`,
        `MARKETPLACE_ADDRESS=${marketplaceAddress}`,
        `BRIDGE_ADDRESS=${bridgeAddress}`,
        "",
    ].join("\n");
    const webEnvLocal = [
        "# AgentL2 web local deployment (auto-generated)",
        "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545",
        `NEXT_PUBLIC_CHAIN_ID=${deployment.chainId}`,
        `NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`,
        `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`,
        `NEXT_PUBLIC_BRIDGE_ADDRESS=${bridgeAddress}`,
        "",
    ].join("\n");
    fs_1.default.writeFileSync(path_1.default.join(rootDir, ".env.local"), rootEnvLocal);
    fs_1.default.writeFileSync(path_1.default.join(rootDir, "web", ".env.local"), webEnvLocal);
    console.log("\n📄 Deployment Info:");
    console.log(JSON.stringify(deployment, null, 2));
    console.log("\n🧩 Wrote env files:");
    console.log(`- ${path_1.default.join(rootDir, ".env.local")}`);
    console.log(`- ${path_1.default.join(rootDir, "web", ".env.local")}`);
    console.log("\n💡 Next Steps:");
    console.log("1. If needed, copy .env.local values into your env files:");
    console.log(`   REGISTRY_ADDRESS=${registryAddress}`);
    console.log(`   MARKETPLACE_ADDRESS=${marketplaceAddress}`);
    console.log(`   BRIDGE_ADDRESS=${bridgeAddress}`);
    console.log("\n2. Verify contracts on Etherscan (if on testnet/mainnet):");
    console.log(`   npx hardhat verify --network <network> ${registryAddress}`);
    console.log(`   npx hardhat verify --network <network> ${marketplaceAddress} ${registryAddress} ${deployer.address}`);
    console.log(`   npx hardhat verify --network <network> ${bridgeAddress} ${deployer.address}`);
    console.log("\n3. Start using the SDK:");
    console.log("   cd sdk && npm run example:register");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
