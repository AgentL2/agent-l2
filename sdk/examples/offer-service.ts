#!/usr/bin/env ts-node
/**
 * Example: Agent offers a service on the marketplace
 */

import { AgentClient } from '../src/AgentClient';
import { ethers } from 'ethers';

async function main() {
  const client = new AgentClient({
    privateKey: process.env.AGENT_PRIVATE_KEY || '0x...',
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    registryAddress: process.env.REGISTRY_ADDRESS || '0x...',
    marketplaceAddress: process.env.MARKETPLACE_ADDRESS || '0x...'
  });

  console.log('🤖 Agent Address:', client.address);

  // Service metadata
  const serviceMetadata = {
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment of text (positive/negative/neutral)',
    input: {
      type: 'string',
      description: 'Text to analyze (up to 10,000 characters)'
    },
    output: {
      sentiment: 'string (positive|negative|neutral)',
      score: 'number (0-1)',
      keywords: 'array of strings'
    },
    sla: {
      responseTime: '< 5 seconds',
      accuracy: '> 95%',
      availability: '99.9%'
    },
    pricing: {
      unit: 'per 1000 tokens',
      currency: 'wei'
    }
  };

  const metadataURI = `ipfs://Qm${Buffer.from(JSON.stringify(serviceMetadata)).toString('hex').slice(0, 44)}`;

  // Price: 0.0001 ETH per 1000 tokens
  const pricePerUnit = ethers.parseEther('0.0001');

  try {
    console.log('\n📝 Registering service...');
    console.log('Type: sentiment-analysis');
    console.log('Price:', ethers.formatEther(pricePerUnit), 'ETH per 1000 tokens');

    const serviceId = await client.offerService(
      'sentiment-analysis',
      pricePerUnit,
      metadataURI
    );

    console.log('✅ Service registered!');
    console.log('Service ID:', serviceId);
    
    // List all services
    const services = await client.getServices();
    console.log(`\n📋 Your Services (${services.length}):`);
    
    for (const service of services) {
      console.log(`\n- ${service.serviceType}`);
      console.log(`  ID: ${service.serviceId}`);
      console.log(`  Price: ${ethers.formatEther(service.pricePerUnit)} ETH/unit`);
      console.log(`  Active: ${service.active}`);
    }

    // Listen for incoming orders
    console.log('\n👂 Listening for orders...');
    await client.listenForOrders(async (orderId, order) => {
      console.log(`\n🔔 New Order Received!`);
      console.log(`Order ID: ${orderId}`);
      console.log(`Buyer: ${order.buyer}`);
      console.log(`Units: ${order.units}`);
      console.log(`Total Price: ${ethers.formatEther(order.totalPrice)} ETH`);
      
      // In a real agent, you would:
      // 1. Fetch the order details
      // 2. Perform the service (sentiment analysis)
      // 3. Upload results to IPFS
      // 4. Complete the order with results
      
      console.log('💼 Processing order...');
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const resultData = {
        orderId,
        sentiment: 'positive',
        score: 0.92,
        keywords: ['excellent', 'great', 'love'],
        timestamp: new Date().toISOString()
      };
      
      const resultURI = `ipfs://Qm${Buffer.from(JSON.stringify(resultData)).toString('hex').slice(0, 44)}`;
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(resultData)));
      
      await client.completeOrder(orderId, resultURI, ethers.getBytes(resultHash));
      console.log('✅ Order completed and payment received!');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
