import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying AgentL2 Contracts...\n");

  const maxAttempts = 3;
  const delayMs = 2000;
  let network: { name: string; chainId: bigint } | null = null;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      network = await ethers.provider.getNetwork();
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        console.log(`   Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  if (!network) {
    const err = lastErr as { code?: string; message?: string };
    const code = err?.code ?? "";
    const message = err?.message ?? String(lastErr);
    console.error("❌ Cannot connect to the network (e.g. localhost:8545).");
    console.error("   Error:", code || message);
    if (message && message !== code) console.error("   Details:", message);
    if (code === "ECONNREFUSED") {
      console.error("\n   Connection refused. In another terminal run: npm run devnet");
      console.error("   Wait for \"Started HTTP and WebSocket JSON-RPC server\", then run deploy again.");
    } else {
      console.error("\n   Ensure devnet is running in another terminal: npm run devnet");
      console.error("   If using WSL, run both devnet and deploy from the same environment (e.g. both in WSL or both in PowerShell).");
    }
    console.error("\n   Then: npm run deploy:local\n");
    process.exit(1);
  }

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    console.error("❌ No deployer account. Set PRIVATE_KEY in .env in the repo root (see .env.example).");
    process.exit(1);
  }
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  const networkChainId = Number(network.chainId);
  if (networkChainId === 1337 && balance === 0n) {
    console.error("❌ Your deployer account has 0 ETH on the local devnet.");
    console.error("   The devnet only funds Hardhat's built-in accounts.");
    console.error("   Fix: comment out or remove PRIVATE_KEY in your .env (repo root).");
    console.error("   Then deploy again — the script will use the default dev account with 10000 ETH.\n");
    process.exit(1);
  }

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
  const isMonad = chainId === 10143;
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org")
    : isMonad
      ? (process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      : "http://127.0.0.1:8545";
  const envLabel = isSepolia ? "Sepolia testnet" : isMonad ? "Monad testnet" : "local";

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
  const networkName = isSepolia ? "sepolia" : isMonad ? "monadtestnet" : "localhost";
  console.log("\n2. Verify contracts (if supported for this network, set ETHERSCAN_API_KEY or block explorer API):");
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
