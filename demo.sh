#!/bin/bash
# AgentL2 Demo Script
# This script demonstrates the full flow of AgentL2

set -e

echo "🚀 AgentL2 Demo - AI Agent Monetized Layer 2"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() {
    echo -e "${BLUE}▶ $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Step 1: Install dependencies
step "Installing dependencies..."
npm install --silent
success "Dependencies installed"
echo ""

# Step 2: Start local blockchain in background
step "Starting local Hardhat node..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
info "Hardhat node PID: $HARDHAT_PID"
sleep 3
success "Local blockchain running on http://localhost:8545"
echo ""

# Step 3: Deploy contracts (writes deployment.json and .env.local)
step "Deploying AgentL2 contracts..."
sleep 2
npm run deploy:local || {
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
}

# Extract contract addresses from deployment.json
REGISTRY_ADDR=$(node -e "console.log(require('./deployment.json').contracts.AgentRegistry)")
MARKETPLACE_ADDR=$(node -e "console.log(require('./deployment.json').contracts.AgentMarketplace)")
BRIDGE_ADDR=$(node -e "console.log(require('./deployment.json').contracts.L2Bridge)")

success "Contracts deployed:"
echo "   Registry:     $REGISTRY_ADDR"
echo "   Marketplace:  $MARKETPLACE_ADDR"
echo "   Bridge:       $BRIDGE_ADDR"
echo ""

# Step 4: Set up environment for SDK
step "Configuring SDK environment..."
export RPC_URL=http://localhost:8545
export REGISTRY_ADDRESS=$REGISTRY_ADDR
export MARKETPLACE_ADDRESS=$MARKETPLACE_ADDR
export BRIDGE_ADDRESS=$BRIDGE_ADDR
export AGENT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
success "SDK environment configured"
echo ""

# Step 5: Install SDK dependencies
step "Installing SDK dependencies..."
cd sdk
npm install --silent
cd ..
success "SDK ready"
echo ""

# Step 6: Demo flow
step "Running full demo flow..."
echo ""

info "Demo Scenario:"
echo "   1. Register Agent A (Service Provider)"
echo "   2. Agent A offers 'sentiment-analysis' service"
echo "   3. Register Agent B (Customer)"
echo "   4. Agent B purchases service from Agent A"
echo "   5. Agent A completes the order"
echo "   6. Verify earnings and reputation"
echo ""

# Create demo script with actual addresses
cat > sdk/demo-flow.ts << DEMO_EOF
import { AgentClient } from './src/AgentClient';
import { ethers } from 'ethers';

async function demo() {
  console.log('🤖 Agent A: Service Provider\n');
  
  // Agent A (seller) - using first Hardhat account
  const agentA = new AgentClient({
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    rpcUrl: 'http://localhost:8545',
    registryAddress: '$REGISTRY_ADDR',
    marketplaceAddress: '$MARKETPLACE_ADDR'
  });

  console.log('Address:', agentA.address);
  
  // Register Agent A
  console.log('\n📝 Registering Agent A...');
  await agentA.register('ipfs://QmAgentAMetadata');
  console.log('✓ Agent A registered\n');

  // Offer service
  console.log('💼 Agent A offers sentiment-analysis service');
  const serviceId = await agentA.offerService(
    'sentiment-analysis',
    ethers.parseEther('0.001'), // 0.001 ETH per analysis
    'ipfs://QmSentimentServiceMetadata'
  );
  console.log('✓ Service registered:', serviceId.slice(0, 16) + '...\n');

  // Agent B (buyer) - using second Hardhat account
  console.log('🤖 Agent B: Customer\n');
  
  const agentB = new AgentClient({
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    rpcUrl: 'http://localhost:8545',
    registryAddress: '$REGISTRY_ADDR',
    marketplaceAddress: '$MARKETPLACE_ADDR'
  });

  console.log('Address:', agentB.address);
  
  // Register Agent B
  console.log('\n📝 Registering Agent B...');
  await agentB.register('ipfs://QmAgentBMetadata');
  console.log('✓ Agent B registered\n');

  // Agent B purchases service
  console.log('💰 Agent B purchases service from Agent A');
  const orderId = await agentB.purchaseService(
    serviceId,
    1n, // 1 analysis
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
  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(result)));
  
  console.log('✓ Analysis complete');
  console.log('  Result:', result.sentiment, '(', result.score, ')');
  console.log('\n📤 Agent A submits result...');
  await agentA.completeOrder(orderId, resultURI, ethers.getBytes(resultHash));
  console.log('✓ Order completed and payment released!\n');

  // Check final stats
  console.log('📊 Final Statistics\n');
  
  const identityA = await agentA.getIdentity();
  console.log('Agent A (Seller):');
  console.log('  Earned:', ethers.formatEther(identityA.totalEarned), 'ETH');
  console.log('  Reputation:', identityA.reputationScore / 100, '%\n');

  const identityB = await agentB.getIdentity();
  console.log('Agent B (Buyer):');
  console.log('  Spent:', ethers.formatEther(identityB.totalSpent), 'ETH');
  console.log('  Reputation:', identityB.reputationScore / 100, '%\n');

  console.log('✅ Demo Complete!\n');
  console.log('Summary:');
  console.log('  - 2 agents registered');
  console.log('  - 1 service offered');
  console.log('  - 1 order completed');
  console.log('  - ' + ethers.formatEther(identityA.totalEarned) + ' ETH earned by Agent A');
}

demo().catch(console.error).finally(() => process.exit(0));
DEMO_EOF

# Run the demo
cd sdk
npx ts-node demo-flow.ts
cd ..

echo ""
success "Demo completed successfully!"
echo ""

# Cleanup
step "Cleaning up..."
kill $HARDHAT_PID 2>/dev/null || true
success "Local blockchain stopped"
echo ""

echo "=============================================="
echo "🎉 AgentL2 Demo Complete!"
echo ""
info "Next steps:"
echo "  1. Explore the contracts in contracts/"
echo "  2. Check out the SDK examples in sdk/examples/"
echo "  3. Read the docs in docs/"
echo "  4. Deploy to testnet: npm run deploy:testnet"
echo ""
echo "For more info: https://github.com/agentl2/agent-l2"
echo "=============================================="
