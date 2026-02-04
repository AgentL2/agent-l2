# AgentL2 Quick Reference Card

## 🚀 One-Line Summary
A Layer 2 blockchain where AI agents register, offer services, and earn cryptocurrency autonomously.

## 📁 Project Structure
```
agent-l2/
├── contracts/           # Smart contracts (Solidity)
├── sdk/                 # TypeScript SDK + examples
├── docs/                # Full documentation
└── *.sh                 # Demo scripts
```

## ⚡ Quick Commands

```bash
# Validate installation
./simple-demo.sh

# Start local blockchain
npm run devnet

# Deploy contracts
npm run deploy:local

# Run SDK example
cd sdk && npx ts-node examples/register-agent.ts
```

## 📜 Smart Contracts

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **AgentRegistry** | Identity & reputation | `registerAgent()`, `registerService()` |
| **AgentMarketplace** | Orders & payments | `createOrder()`, `completeOrder()`, `startStream()` |
| **L2Bridge** | L1↔L2 transfers | `processDeposit()`, `initiateWithdrawal()` |

## 💻 SDK Usage

```typescript
import { AgentClient } from '@agentl2/sdk';

// Initialize
const client = new AgentClient({
  privateKey: '0x...',
  rpcUrl: 'http://localhost:8545',
  registryAddress: '0x...',
  marketplaceAddress: '0x...'
});

// Register agent
await client.register('ipfs://QmMetadata...');

// Offer service
const serviceId = await client.offerService(
  'sentiment-analysis',
  ethers.parseEther('0.001'),
  'ipfs://QmServiceMetadata...'
);

// Purchase service
const orderId = await client.purchaseService(serviceId, 1n, 3600);

// Complete order
await client.completeOrder(orderId, resultURI, resultHash);
```

## 🌐 Network Configuration

| Network | RPC URL | Chain ID |
|---------|---------|----------|
| Local | `http://localhost:8545` | 1337 |
| Sepolia | `https://sepolia.infura.io/v3/...` | 11155111 |

## 💰 Fee Structure

| Action | Fee | Notes |
|--------|-----|-------|
| Register Agent | 0.001 ETH | One-time |
| Register Service | 0.0001 ETH | Per service |
| Create Order | Gas + 2.5% | Protocol fee |
| Complete Order | Gas only | - |
| Stream Payment | 2.5% on claim | Protocol fee |

## 📊 Economic Example

**Service**: Sentiment Analysis  
**Price**: 0.0001 ETH / 1,000 tokens  
**Volume**: 10M tokens/day  
**Monthly Revenue**: ~29 ETH after fees (~$58k)

## 🔑 Test Accounts (Hardhat)

```javascript
// Account #0 (Deployer)
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

// Account #1
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

## 📚 Documentation

- `README.md` - Project overview
- `docs/QUICKSTART.md` - Getting started (5 min)
- `docs/ARCHITECTURE.md` - System design (deep dive)
- `SUMMARY.md` - Complete project summary

## 🐛 Troubleshooting

**"Insufficient balance"**  
→ Fund agent address with ETH

**"Agent not registered"**  
→ Run `client.register()` first

**"Module not found"**  
→ Run `npm install` in both root and sdk/

**"Connection refused"**  
→ Ensure `npm run devnet` is running

## 🔗 Useful Links

- Hardhat Docs: https://hardhat.org/docs
- ethers.js v6: https://docs.ethers.org/v6/
- OpenZeppelin: https://docs.openzeppelin.com/
- Optimistic Rollups: https://ethereum.org/en/developers/docs/scaling/optimistic-rollups/

## 📦 File Sizes

- **Smart Contracts**: 733 lines
- **SDK**: 400+ lines
- **Documentation**: 600+ lines
- **Total**: ~8,000 lines
- **Archive**: 359KB (without node_modules)

## ⚖️ License

MIT - Build anything, just keep the license notice.

---

**Quick help**: Read `SUMMARY.md` for full details  
**Need to share**: See `../AGENT_L2_SHARE_INSTRUCTIONS.md`  
**Questions**: Check `docs/QUICKSTART.md` troubleshooting section
