/**
 * AgentL2 Worker - Processes orders from the queue
 */

import 'dotenv/config';
import { pino } from 'pino';
import { ethers } from 'ethers';
import * as db from '../shared/db.js';
import { decrypt } from '../shared/crypto.js';
import { hash } from '../shared/crypto.js';
import { executeAgent } from './executor.js';
import type { Agent, Order, OrderResult } from '../shared/types.js';

const logger = pino({ name: 'worker' });

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '5', 10);
const POLL_INTERVAL_MS = parseInt(process.env.ORDER_POLL_INTERVAL_MS || '2000', 10);

// Marketplace ABI for completeOrder
const MARKETPLACE_ABI = [
  'function completeOrder(bytes32 orderId, string resultURI, bytes32 resultHash) external',
];

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let marketplace: ethers.Contract | null = null;

function initBlockchain() {
  const rpcUrl = process.env.L2_RPC_URL;
  const privateKey = process.env.RUNTIME_PRIVATE_KEY;
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;

  if (!rpcUrl || !privateKey || !marketplaceAddress) {
    logger.warn('Blockchain not configured - orders will be processed but not completed on-chain');
    return;
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, wallet);
  
  logger.info({ address: wallet.address, marketplace: marketplaceAddress }, 'Blockchain configured');
}

// Track active executions
let activeExecutions = 0;

async function processOrder(order: Order, agent: Agent): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info({ orderId: order.orderId, agentId: agent.id }, 'Processing order');
    
    // Mark as processing
    await db.updateOrderStatus(order.id, 'processing');
    await db.createLog({
      agentId: agent.id,
      orderId: order.id,
      level: 'info',
      message: 'Order execution started',
    });

    // Load agent secrets
    const secrets: Record<string, string> = {};
    const secretKeys = await db.getAgentSecretKeys(agent.id);
    for (const key of secretKeys) {
      const encrypted = await db.getAgentSecret(agent.id, key);
      if (encrypted) {
        secrets[key] = decrypt(encrypted);
      }
    }

    // Execute the agent
    const result = await executeAgent(agent, order.inputData, secrets);
    
    const executionTimeMs = Date.now() - startTime;
    
    // Generate result hash
    const resultJson = JSON.stringify(result);
    const resultHash = hash(resultJson);
    
    // For now, store result directly (in production, could upload to IPFS)
    const resultUri = `data:application/json;base64,${Buffer.from(resultJson).toString('base64')}`;
    
    // Update order as completed
    await db.updateOrderStatus(order.id, 'completed', {
      resultData: result,
      resultUri,
      resultHash,
      tokensUsed: result.tokensUsed?.total,
      executionTimeMs,
    });

    // Update agent stats
    await db.updateAgentStats(agent.id, {
      tokensUsed: result.tokensUsed?.total,
      success: true,
      earnings: order.priceWei,
    });

    await db.createLog({
      agentId: agent.id,
      orderId: order.id,
      level: 'info',
      message: 'Order completed successfully',
      metadata: { executionTimeMs, tokensUsed: result.tokensUsed },
    });

    // Complete on-chain
    if (marketplace && wallet) {
      try {
        logger.info({ orderId: order.orderId }, 'Completing order on-chain');
        const tx = await marketplace.completeOrder(order.orderId, resultUri, resultHash);
        const receipt = await tx.wait();
        
        await db.updateOrderStatus(order.id, 'completed', {
          completeTxHash: receipt.hash,
        });
        
        logger.info({ orderId: order.orderId, txHash: receipt.hash }, 'Order completed on-chain');
      } catch (chainErr) {
        logger.error({ err: chainErr, orderId: order.orderId }, 'Failed to complete order on-chain');
        // Order is still completed in our system, just not on-chain
        await db.createLog({
          agentId: agent.id,
          orderId: order.id,
          level: 'error',
          message: 'Failed to complete order on-chain',
          metadata: { error: String(chainErr) },
        });
      }
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, orderId: order.orderId }, 'Order execution failed');
    
    await db.updateOrderStatus(order.id, 'failed', {
      errorMessage,
      executionTimeMs: Date.now() - startTime,
    });

    await db.updateAgentStats(agent.id, { success: false });

    await db.createLog({
      agentId: agent.id,
      orderId: order.id,
      level: 'error',
      message: 'Order execution failed',
      metadata: { error: errorMessage },
    });
  }
}

async function pollForOrders(): Promise<void> {
  if (activeExecutions >= MAX_CONCURRENT) {
    return;
  }

  const slotsAvailable = MAX_CONCURRENT - activeExecutions;
  
  try {
    const orders = await db.getPendingOrders(slotsAvailable);
    
    for (const order of orders) {
      // Find the agent for this order
      const agent = order.agentId 
        ? await db.getAgentById(order.agentId)
        : await db.getAgentByServiceId(order.serviceId);
      
      if (!agent) {
        logger.warn({ orderId: order.orderId, serviceId: order.serviceId }, 'No agent found for order');
        await db.updateOrderStatus(order.id, 'failed', {
          errorMessage: 'No agent configured for this service',
        });
        continue;
      }

      if (agent.status !== 'active') {
        logger.warn({ orderId: order.orderId, agentId: agent.id, status: agent.status }, 'Agent not active');
        // Leave as pending, will retry later
        continue;
      }

      // Process in background
      activeExecutions++;
      processOrder(order, agent)
        .finally(() => {
          activeExecutions--;
        });
    }
  } catch (err) {
    logger.error({ err }, 'Error polling for orders');
  }
}

async function main() {
  logger.info({ maxConcurrent: MAX_CONCURRENT, pollInterval: POLL_INTERVAL_MS }, 'Worker starting');
  
  initBlockchain();

  // Start polling
  setInterval(pollForOrders, POLL_INTERVAL_MS);
  
  // Initial poll
  pollForOrders();

  logger.info('Worker running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker crashed');
  process.exit(1);
});
