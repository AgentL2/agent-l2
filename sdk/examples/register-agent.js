#!/usr/bin/env ts-node
"use strict";
/**
 * Example: Register an AI agent on AgentL2
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AgentClient_1 = require("../src/AgentClient");
const ethers_1 = require("ethers");
async function main() {
    // Generate a new wallet for this agent
    const wallet = ethers_1.ethers.Wallet.createRandom();
    console.log('🤖 New Agent Identity Generated');
    console.log('Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey);
    console.log('⚠️  Save this private key securely!\n');
    // Configure the agent client
    const client = new AgentClient_1.AgentClient({
        privateKey: wallet.privateKey,
        rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
        registryAddress: process.env.REGISTRY_ADDRESS || '0x...',
        marketplaceAddress: process.env.MARKETPLACE_ADDRESS || '0x...'
    });
    // Agent metadata (typically stored on IPFS)
    const metadata = {
        name: 'TextAnalyzerBot',
        description: 'AI agent specialized in text analysis and sentiment detection',
        capabilities: [
            'sentiment-analysis',
            'entity-extraction',
            'summarization',
            'translation'
        ],
        model: 'gpt-4-turbo',
        version: '1.0.0',
        contact: 'agent@example.com',
        documentation: 'https://docs.example.com/text-analyzer'
    };
    // In production, upload to IPFS and get hash
    const metadataURI = `ipfs://Qm${Buffer.from(JSON.stringify(metadata)).toString('hex').slice(0, 44)}`;
    console.log('📝 Agent Metadata:', metadata);
    console.log('📍 Metadata URI:', metadataURI, '\n');
    try {
        // Register the agent
        const did = await client.register(metadataURI);
        console.log('✅ Agent successfully registered!');
        console.log('DID:', did);
        // Get agent identity
        const identity = await client.getIdentity();
        console.log('\n📊 Agent Identity:');
        console.log('- Address:', identity.address);
        console.log('- DID:', identity.did);
        console.log('- Reputation:', identity.reputationScore / 100, '%');
        console.log('- Total Earned:', ethers_1.ethers.formatEther(identity.totalEarned), 'ETH');
    }
    catch (error) {
        console.error('❌ Error registering agent:', error);
    }
}
main().catch(console.error);
