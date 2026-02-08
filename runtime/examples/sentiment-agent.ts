/**
 * Sentiment Analysis Agent
 * A complete example of an autonomous agent that:
 * 1. Registers on AgentL2
 * 2. Offers sentiment analysis service
 * 3. Runs continuously, processing orders
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { AgentRuntime, OpenAIExecutor } from '../src/index.js';

// Simplified SDK functions (inline for demo)
const REGISTRY_ABI = [
  'function registerAgent(address agent, string did, string metadataURI)',
  'function registerService(address agent, string serviceType, uint256 pricePerUnit, string metadataURI) returns (bytes32)',
  'function isActiveAgent(address agent) view returns (bool)',
  'event ServiceRegistered(bytes32 indexed serviceId, address indexed agent, string serviceType)',
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SENTIMENT ANALYSIS AGENT');
  console.log('  Autonomous AI agent that analyzes text sentiment');
  console.log('═══════════════════════════════════════════════════════\n');

  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!PRIVATE_KEY || !REGISTRY_ADDRESS || !MARKETPLACE_ADDRESS) {
    console.error('Missing required environment variables:');
    console.error('  PRIVATE_KEY (or AGENT_PRIVATE_KEY)');
    console.error('  REGISTRY_ADDRESS (or NEXT_PUBLIC_REGISTRY_ADDRESS)');
    console.error('  MARKETPLACE_ADDRESS (or NEXT_PUBLIC_MARKETPLACE_ADDRESS)');
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required for sentiment analysis');
    process.exit(1);
  }

  // Setup
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  console.log(`Agent Address: ${wallet.address}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log('');

  // Step 1: Register agent if not already registered
  const isRegistered = await registry.isActiveAgent(wallet.address);
  
  if (!isRegistered) {
    console.log('📝 Registering agent...');
    const did = `did:agentl2:${wallet.address.slice(2, 42)}`;
    const metadata = JSON.stringify({
      name: 'Sentiment Analysis Agent',
      description: 'Analyzes text sentiment using GPT-4',
      version: '1.0.0',
      capabilities: ['sentiment-analysis'],
      pricing: {
        model: 'per-request',
        basePrice: '0.001 ETH',
      },
    });
    
    const tx = await registry.registerAgent(wallet.address, did, `data:application/json,${encodeURIComponent(metadata)}`);
    await tx.wait();
    console.log('✅ Agent registered!\n');
  } else {
    console.log('✅ Agent already registered\n');
  }

  // Step 2: Register sentiment analysis service
  console.log('📝 Registering sentiment-analysis service...');
  const serviceType = 'sentiment-analysis';
  const pricePerUnit = ethers.parseEther('0.001'); // 0.001 ETH per analysis
  const serviceMetadata = JSON.stringify({
    name: 'Sentiment Analysis',
    description: 'Analyzes text sentiment (positive/negative/neutral) with confidence score',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        explanation: { type: 'string' },
      },
    },
  });

  try {
    const tx = await registry.registerService(
      wallet.address,
      serviceType,
      pricePerUnit,
      `data:application/json,${encodeURIComponent(serviceMetadata)}`
    );
    const receipt = await tx.wait();
    
    // Parse ServiceRegistered event
    const iface = new ethers.Interface(REGISTRY_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'ServiceRegistered') {
          console.log(`✅ Service registered: ${parsed.args.serviceId.slice(0, 10)}...`);
          break;
        }
      } catch { /* skip */ }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already registered') || message.includes('Service exists')) {
      console.log('✅ Service already registered\n');
    } else {
      throw error;
    }
  }

  // Step 3: Start the runtime
  console.log('\n🚀 Starting autonomous runtime...\n');

  const runtime = new AgentRuntime({
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    contracts: {
      registry: REGISTRY_ADDRESS,
      marketplace: MARKETPLACE_ADDRESS,
    },
    openaiApiKey: OPENAI_API_KEY,
    pollInterval: 3000,
    maxConcurrent: 5,
    autoComplete: true,
  });

  // Event logging
  runtime.on((event) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    switch (event.type) {
      case 'order_received':
        console.log(`[${timestamp}] 📥 New order: ${event.orderId.slice(0, 16)}...`);
        break;
      case 'execution_completed':
        console.log(`[${timestamp}] ✅ Completed in ${event.result.metadata.durationMs}ms`);
        if (event.result.metadata.tokensUsed) {
          console.log(`           Tokens used: ${event.result.metadata.tokensUsed}`);
        }
        break;
      case 'order_completed':
        console.log(`[${timestamp}] 💰 Paid! TX: ${event.txHash.slice(0, 16)}...`);
        break;
      case 'execution_failed':
        console.log(`[${timestamp}] ❌ Failed: ${event.error}`);
        break;
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down agent...');
    await runtime.stop();
    process.exit(0);
  });

  await runtime.start();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  AGENT IS NOW AUTONOMOUS');
  console.log('  Waiting for orders... (Ctrl+C to stop)');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
