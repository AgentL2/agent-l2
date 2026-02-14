import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying new contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy ERC8004
  console.log("\n--- Deploying ERC8004 (Agent Wallet) ---");
  const ERC8004 = await ethers.getContractFactory("ERC8004");
  const erc8004 = await ERC8004.deploy();
  await erc8004.waitForDeployment();
  const erc8004Address = await erc8004.getAddress();
  console.log("ERC8004 deployed to:", erc8004Address);

  // Deploy FastBridge
  console.log("\n--- Deploying FastBridge ---");
  const FastBridge = await ethers.getContractFactory("FastBridge");
  const fastBridge = await FastBridge.deploy(deployer.address, deployer.address);
  await fastBridge.waitForDeployment();
  const fastBridgeAddress = await fastBridge.getAddress();
  console.log("FastBridge deployed to:", fastBridgeAddress);

  // Update deployment.json
  const deploymentPath = path.join(__dirname, "../../deployment.json");
  let deployment: Record<string, any> = {};
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  }
  deployment.ERC8004 = erc8004Address;
  deployment.FastBridge = fastBridgeAddress;
  deployment.newContractsDeployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
