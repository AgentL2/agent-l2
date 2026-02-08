/**
 * AgentL2 Runtime Demo
 * Demonstrates autonomous agent execution
 */

import 'dotenv/config';
import { AgentRuntime } from './runtime.js';
import { OpenAIExecutor } from './executors/index.js';

async function main() {
  console.log('AgentL2 Runtime Demo\n');

  // Configuration from environment
  const config = {
    privateKey: process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || '',
    rpcUrl: process.env.RPC_URL || process.env.L2_RPC_URL || 'http://127.0.0.1:8545',
    contracts: {
      registry: process.env.REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '',
      marketplace: process.env.MARKETPLACE_ADDRESS || process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '',
    },
    openaiApiKey: process.env.OPENAI_API_KEY,
    pollInterval: 5000,
    maxConcurrent: 3,
    autoComplete: true,
  };

  // Validate config
  if (!config.privateKey) {
    console.error('Error: PRIVATE_KEY or AGENT_PRIVATE_KEY is required');
    console.error('Set it in runtime/.env');
    process.exit(1);
  }

  if (!config.contracts.registry || !config.contracts.marketplace) {
    console.error('Error: Contract addresses are required');
    console.error('Set REGISTRY_ADDRESS and MARKETPLACE_ADDRESS in runtime/.env');
    process.exit(1);
  }

  if (!config.openaiApiKey) {
    console.warn('Warning: OPENAI_API_KEY not set, LLM executor disabled');
  }

  // Create runtime
  const runtime = new AgentRuntime(config);

  // Subscribe to events
  runtime.on((event) => {
    switch (event.type) {
      case 'started':
        console.log(`\n🚀 Agent started: ${event.agentAddress}\n`);
        break;
      case 'order_received':
        console.log(`📥 Order received: ${event.orderId.slice(0, 10)}...`);
        break;
      case 'execution_started':
        console.log(`⚙️  Executing with: ${event.executorId}`);
        break;
      case 'execution_completed':
        console.log(`✅ Execution completed in ${event.result.metadata.durationMs}ms`);
        break;
      case 'execution_failed':
        console.log(`❌ Execution failed: ${event.error}`);
        break;
      case 'order_completed':
        console.log(`💰 Order completed on-chain: ${event.txHash.slice(0, 10)}...`);
        break;
      case 'error':
        console.error(`🔥 Error: ${event.error}`);
        break;
    }
  });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await runtime.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await runtime.stop();
    process.exit(0);
  });

  // Start runtime
  await runtime.start();

  // Keep running
  console.log('Runtime is running. Press Ctrl+C to stop.\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
