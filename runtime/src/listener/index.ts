/**
 * Blockchain Listener - Watches for on-chain events and queues orders
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { pino } from 'pino';
import * as db from '../shared/db.js';

const logger = pino({ name: 'listener' });

const MARKETPLACE_ABI = [
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address indexed buyer, address seller, uint256 totalPrice, bytes32 inputHash)',
  'event OrderCompleted(bytes32 indexed orderId, string resultURI, bytes32 resultHash)',
  'event OrderCancelled(bytes32 indexed orderId)',
];

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

async function main() {
  const rpcUrl = process.env.L2_RPC_URL;
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;

  if (!rpcUrl || !marketplaceAddress) {
    logger.fatal('L2_RPC_URL and MARKETPLACE_ADDRESS must be set');
    process.exit(1);
  }

  logger.info({ rpcUrl, marketplaceAddress }, 'Starting blockchain listener');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider);

  // Track last processed block
  let lastBlock = await provider.getBlockNumber();
  logger.info({ lastBlock }, 'Starting from block');

  // Listen for OrderCreated events
  marketplace.on('OrderCreated', async (
    orderId: string,
    serviceId: string,
    buyer: string,
    seller: string,
    totalPrice: bigint,
    inputHash: string,
    event: ethers.ContractEventPayload
  ) => {
    logger.info({ orderId, serviceId, buyer, seller, totalPrice: totalPrice.toString() }, 'OrderCreated event');

    try {
      // Check if order already exists
      const existing = await db.getOrderByChainId(orderId);
      if (existing) {
        logger.info({ orderId }, 'Order already exists, skipping');
        return;
      }

      // Find the agent for this service
      const agent = await db.getAgentByServiceId(serviceId);

      // Fetch input data from inputHash (in real impl, this would fetch from IPFS or similar)
      // For now, we'll store a placeholder and expect the buyer to provide input via API
      const inputData = {
        prompt: 'Input data not yet fetched',
        _inputHash: inputHash,
        _note: 'Buyer should submit actual input via API',
      };

      // Create order in database
      const order = await db.createOrder({
        orderId,
        serviceId,
        agentId: agent?.id || null,
        buyerAddress: buyer,
        sellerAddress: seller,
        priceWei: totalPrice.toString(),
        inputData,
        inputHash,
      });

      logger.info({ orderId, dbId: order.id }, 'Order created in database');

      await db.createLog({
        agentId: agent?.id,
        orderId: order.id,
        level: 'info',
        message: 'Order received from blockchain',
        metadata: { txHash: event.log.transactionHash, block: event.log.blockNumber },
      });

    } catch (err) {
      logger.error({ err, orderId }, 'Failed to process OrderCreated event');
    }
  });

  // Listen for OrderCancelled events
  marketplace.on('OrderCancelled', async (orderId: string) => {
    logger.info({ orderId }, 'OrderCancelled event');

    try {
      const order = await db.getOrderByChainId(orderId);
      if (order && order.status === 'pending') {
        await db.updateOrderStatus(order.id, 'cancelled');
        logger.info({ orderId }, 'Order marked as cancelled');
      }
    } catch (err) {
      logger.error({ err, orderId }, 'Failed to process OrderCancelled event');
    }
  });

  // Periodic health check
  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock > lastBlock) {
        logger.debug({ lastBlock, currentBlock, behind: currentBlock - lastBlock }, 'Block sync');
        lastBlock = currentBlock;
      }
    } catch (err) {
      logger.error({ err }, 'Health check failed');
    }
  }, POLL_INTERVAL_MS);

  logger.info('Blockchain listener running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Listener crashed');
  process.exit(1);
});
