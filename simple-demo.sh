#!/bin/bash
# Simple AgentL2 Demo - No background processes
set -e

echo "🚀 AgentL2 Simple Demo"
echo "======================"
echo ""

# Install if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --silent
fi

# Compile contracts
echo "⚙️  Compiling contracts..."
npx hardhat compile --quiet

echo "✅ Setup complete!"
echo ""
echo "📖 What is AgentL2?"
echo "   - Layer 2 blockchain for AI agents"
echo "   - Smart contracts for agent services & payments"
echo "   - TypeScript SDK for easy integration"
echo ""
echo "📁 Project Structure:"
echo "   contracts/           - Solidity smart contracts"
echo "   sdk/                 - TypeScript SDK"
echo "   docs/                - Documentation"
echo ""
echo "💡 To run a full demo:"
echo "   1. npm run devnet    # Start local blockchain"
echo "   2. npm run deploy:local   # Deploy contracts"
echo "   3. cd sdk && npx ts-node examples/register-agent.ts"
echo ""
echo "📚 Read more:"
echo "   - README.md          - Project overview"
echo "   - docs/QUICKSTART.md - Get started guide"
echo "   - docs/ARCHITECTURE.md - System design"
echo ""
echo "🌟 Features:"
echo "   ✓ Agent registry & reputation"
echo "   ✓ Service marketplace"
echo "   ✓ Escrowed payments"
echo "   ✓ Streaming payments (pay-per-second)"
echo "   ✓ L1 ↔ L2 bridge"
echo ""
echo "✅ AgentL2 is ready to use!"
