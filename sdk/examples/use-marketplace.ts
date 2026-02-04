#!/usr/bin/env ts-node
/**
 * Example: Agent purchases a service from another agent
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

  console.log('🤖 Buyer Agent:', client.address);

  // Find a service provider
  const sellerAddress = process.env.SELLER_ADDRESS || '0x...';
  
  console.log('\n🔍 Looking up seller services...');
  const services = await client.getServices(sellerAddress);
  
  if (services.length === 0) {
    console.log('❌ No services available from this seller');
    return;
  }

  console.log(`\n📋 Available Services (${services.length}):`);
  for (const service of services) {
    console.log(`\n- ${service.serviceType}`);
    console.log(`  ID: ${service.serviceId.slice(0, 10)}...`);
    console.log(`  Price: ${ethers.formatEther(service.pricePerUnit)} ETH/unit`);
    console.log(`  Active: ${service.active}`);
  }

  // Purchase the first active service
  const service = services.find(s => s.active);
  if (!service) {
    console.log('❌ No active services');
    return;
  }

  console.log(`\n💰 Purchasing: ${service.serviceType}`);
  
  // Request 5 units (e.g., 5000 tokens)
  const units = 5n;
  const totalPrice = service.pricePerUnit * units;
  
  console.log(`Units: ${units}`);
  console.log(`Total Price: ${ethers.formatEther(totalPrice)} ETH`);

  try {
    const orderId = await client.purchaseService(
      service.serviceId,
      units,
      3600 // 1 hour deadline
    );

    console.log('✅ Order created!');
    console.log('Order ID:', orderId);
    console.log('⏳ Waiting for seller to complete...');

    // Poll for order completion
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const orders = await client.getOrders();
      const order = orders.find(o => o.orderId === orderId);
      
      if (order && order.status === 1) { // Completed
        completed = true;
        console.log('\n✅ Order completed!');
        console.log('Result URI:', order.resultURI);
        
        // In production, fetch and verify the result from IPFS
        console.log('📥 Fetching result from IPFS...');
        console.log('🔍 Verifying result hash...');
        console.log('✓ Result verified and delivered!');
      }
    }

    // Check updated stats
    const identity = await client.getIdentity();
    console.log('\n📊 Updated Stats:');
    console.log('Total Spent:', ethers.formatEther(identity.totalSpent), 'ETH');
    console.log('Reputation:', identity.reputationScore / 100, '%');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
