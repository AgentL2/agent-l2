"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentClient_1 = require("./src/AgentClient");
const ethers_1 = require("ethers");
async function demo() {
    console.log('🤖 Agent A: Service Provider\n');
    // Agent A (seller) - using first Hardhat account
    const agentA = new AgentClient_1.AgentClient({
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        rpcUrl: 'http://localhost:8545',
        registryAddress: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
        marketplaceAddress: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
    });
    console.log('Address:', agentA.address);
    // Register Agent A
    console.log('\n📝 Registering Agent A...');
    await agentA.register('ipfs://QmAgentAMetadata');
    console.log('✓ Agent A registered\n');
    // Offer service
    console.log('💼 Agent A offers sentiment-analysis service');
    const serviceId = await agentA.offerService('sentiment-analysis', ethers_1.ethers.parseEther('0.001'), // 0.001 ETH per analysis
    'ipfs://QmSentimentServiceMetadata');
    console.log('✓ Service registered:', serviceId.slice(0, 16) + '...\n');
    // Agent B (buyer) - using second Hardhat account
    console.log('🤖 Agent B: Customer\n');
    const agentB = new AgentClient_1.AgentClient({
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        rpcUrl: 'http://localhost:8545',
        registryAddress: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
        marketplaceAddress: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
    });
    console.log('Address:', agentB.address);
    // Register Agent B
    console.log('\n📝 Registering Agent B...');
    await agentB.register('ipfs://QmAgentBMetadata');
    console.log('✓ Agent B registered\n');
    // Agent B purchases service
    console.log('💰 Agent B purchases service from Agent A');
    const orderId = await agentB.purchaseService(serviceId, 1n, // 1 analysis
    3600 // 1 hour deadline
    );
    console.log('✓ Order created:', orderId.slice(0, 16) + '...\n');
    // Agent A completes the order
    console.log('⚙️  Agent A performs sentiment analysis...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = {
        sentiment: 'positive',
        score: 0.92,
        keywords: ['excellent', 'innovative', 'revolutionary']
    };
    const resultURI = 'ipfs://QmResultData';
    const resultHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(JSON.stringify(result)));
    console.log('✓ Analysis complete');
    console.log('  Result:', result.sentiment, '(', result.score, ')');
    console.log('\n📤 Agent A submits result...');
    await agentA.completeOrder(orderId, resultURI, ethers_1.ethers.getBytes(resultHash));
    console.log('✓ Order completed and payment released!\n');
    // Check final stats
    console.log('📊 Final Statistics\n');
    const identityA = await agentA.getIdentity();
    console.log('Agent A (Seller):');
    console.log('  Earned:', ethers_1.ethers.formatEther(identityA.totalEarned), 'ETH');
    console.log('  Reputation:', identityA.reputationScore / 100, '%\n');
    const identityB = await agentB.getIdentity();
    console.log('Agent B (Buyer):');
    console.log('  Spent:', ethers_1.ethers.formatEther(identityB.totalSpent), 'ETH');
    console.log('  Reputation:', identityB.reputationScore / 100, '%\n');
    console.log('✅ Demo Complete!\n');
    console.log('Summary:');
    console.log('  - 2 agents registered');
    console.log('  - 1 service offered');
    console.log('  - 1 order completed');
    console.log('  - ' + ethers_1.ethers.formatEther(identityA.totalEarned) + ' ETH earned by Agent A');
}
demo().catch(console.error).finally(() => process.exit(0));
