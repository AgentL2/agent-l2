#!/usr/bin/env ts-node
/**
 * Run the full prototype demo using deployment.json from repo root.
 * Usage: from repo root, ensure devnet is running and deploy is done, then:
 *   npm run prototype:demo
 * Or from sdk: npx ts-node run-prototype-demo.ts
 */

import { AgentClient } from './src/AgentClient';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

function loadDeployment(): { AgentRegistry: string; AgentMarketplace: string; L2Bridge: string } {
  const root = path.resolve(__dirname, '..');
  const p = path.join(root, 'deployment.json');
  if (!fs.existsSync(p)) {
    throw new Error(`deployment.json not found at ${p}. Run: npm run deploy:local (with devnet running).`);
  }
  const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return d.contracts;
}

async function main() {
  const { AgentRegistry: registryAddress, AgentMarketplace: marketplaceAddress } = loadDeployment();
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';

  console.log('🤖 Agent A: Service Provider\n');
  const agentA = new AgentClient({
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    rpcUrl,
    registryAddress,
    marketplaceAddress,
    chainId: 1337,
  });
  console.log('Address:', agentA.address);

  console.log('\n📝 Registering Agent A...');
  await agentA.register('ipfs://QmAgentAMetadata');
  console.log('✓ Agent A registered\n');

  console.log('💼 Agent A offers sentiment-analysis service');
  const serviceId = await agentA.offerService(
    'sentiment-analysis',
    ethers.parseEther('0.001'),
    'ipfs://QmSentimentServiceMetadata'
  );
  console.log('✓ Service registered:', serviceId.slice(0, 16) + '...\n');

  console.log('🤖 Agent B: Customer\n');
  const agentB = new AgentClient({
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    rpcUrl,
    registryAddress,
    marketplaceAddress,
    chainId: 1337,
  });
  console.log('Address:', agentB.address);

  console.log('\n📝 Registering Agent B...');
  await agentB.register('ipfs://QmAgentBMetadata');
  console.log('✓ Agent B registered\n');

  console.log('💰 Agent B purchases service from Agent A');
  const orderId = await agentB.purchaseService(serviceId, 1n, 3600);
  console.log('✓ Order created:', orderId.slice(0, 16) + '...\n');

  console.log('⚙️  Agent A performs sentiment analysis...');
  await new Promise((r) => setTimeout(r, 500));
  const result = { sentiment: 'positive', score: 0.92, keywords: ['excellent', 'innovative', 'revolutionary'] };
  const resultURI = 'ipfs://QmResultData';
  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(result)));
  console.log('✓ Analysis complete');
  console.log('  Result:', result.sentiment, '(', result.score, ')');
  console.log('\n📤 Agent A submits result...');
  await agentA.completeOrder(orderId, resultURI, ethers.getBytes(resultHash));
  console.log('✓ Order completed and payment released!\n');

  console.log('📊 Final Statistics\n');
  const identityA = await agentA.getIdentity();
  const identityB = await agentB.getIdentity();
  console.log('Agent A (Seller):');
  console.log('  Earned:', ethers.formatEther(identityA.totalEarned), 'ETH');
  console.log('  Reputation:', identityA.reputationScore / 100, '%\n');
  console.log('Agent B (Buyer):');
  console.log('  Spent:', ethers.formatEther(identityB.totalSpent), 'ETH');
  console.log('  Reputation:', identityB.reputationScore / 100, '%\n');

  console.log('✅ Prototype demo complete!\n');
  console.log('Summary: 2 agents, 1 service, 1 order,', ethers.formatEther(identityA.totalEarned), 'ETH earned by Agent A');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
