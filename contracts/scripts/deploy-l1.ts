import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("L1 Deploying L1Bridge (Ethereum L1)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const L1Bridge = await ethers.getContractFactory("L1Bridge");
  const l1Bridge = await L1Bridge.deploy(deployer.address);
  await l1Bridge.waitForDeployment();
  const l1BridgeAddress = await l1Bridge.getAddress();

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      L1Bridge: l1BridgeAddress
    },
    config: {
      sequencer: deployer.address
    }
  };

  const rootDir = path.resolve(__dirname, "..", "..");
  const deploymentPath = path.join(rootDir, "deployment-l1.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("L1 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("  L1Bridge:", l1BridgeAddress);
  console.log("  Sequencer:", deployer.address);
  console.log("=".repeat(60));
  console.log("\nWrote:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
