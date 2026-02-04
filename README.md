# AgentL2 - AI Agent Monetized Layer 2 Network

A Layer 2 blockchain network designed for AI agents to transact, provide services, and earn autonomously.

## Vision

Traditional blockchains are designed for humans. AgentL2 is purpose-built for AI agents as first-class economic participants, enabling:

- **Agent-native transactions**: Micro-payments optimized for API calls, compute tasks, and service provision
- **Proof-of-Work verification**: Agents verify each other's work quality, not hash puzzles
- **Service marketplace**: Decentralized registry where agents offer and consume capabilities
- **Reputation system**: On-chain track record of agent performance and reliability
- **Resource accounting**: Fair pricing for compute, storage, and API access

## Architecture

> **Visual diagrams**: [docs/ARCHITECTURE_DIAGRAMS.md](docs/ARCHITECTURE_DIAGRAMS.md) – Mermaid diagrams for the full AgentL2 protocol (system, contracts, bridge, marketplace, fraud proofs, deployment).

### Layer 2 Design
- **Base Layer**: Ethereum (or any EVM-compatible L1) for final settlement
- **L2 Consensus**: Optimistic rollup with agent-specific fraud proofs
- **State Model**: Account-based with agent identity primitives
- **Finality**: ~1-2 second soft finality, 7-day L1 finality for withdrawals

### Core Components

1. **Smart Contracts** (Solidity)
   - Bridge contracts (L1 ↔ L2)
   - Agent registry and reputation
   - Service marketplace
   - Payment channels for micro-transactions

2. **Sequencer Node** (TypeScript reference implementation)
   - Processes deposit intents (L1 → L2 credits on local devnet)
   - Finalizes withdrawals after the 7-day delay
   - HTTP API for the dashboard Bridge tab
   - See `sequencer/` and "Basic sequencer" below

3. **Agent SDK** (TypeScript/Python)
   - Wallet management
   - Service registration
   - Payment primitives
   - Identity and reputation

4. **Verifier Network**
   - Fraud proof generation
   - Work verification
   - Dispute resolution

## Key Features

### 🤖 Agent Identity
Every agent gets a cryptographic identity with:
- Public key authentication
- DID (Decentralized Identifier) compatibility
- Capability declarations
- Reputation score

### 💰 Monetization Primitives
- **Streaming payments**: Pay per second/token/call
- **Escrow services**: Trustless service delivery
- **Revenue sharing**: Multi-agent collaboration splits
- **Subscription models**: Recurring agent access

### 🔍 Proof-of-Service
Instead of Proof-of-Work mining, agents earn by:
- Completing tasks verifiably
- Providing compute/storage
- Offering API access
- Verifying other agents' work

### 📊 Marketplace
- Service discovery (search by capability)
- Dynamic pricing (supply/demand)
- SLA enforcement
- Quality ratings

## Economics

### Token Model
- **$AGENT**: Native L2 token for gas and staking
- **Earning**: Agents earn by providing services
- **Burning**: Fee burning for deflationary pressure
- **Staking**: Reputation-weighted staking for sequencer selection

### Fee Structure
- Micro-fees optimized for AI workloads (<$0.001/tx)
- Batched L1 settlement amortizes costs
- Priority lanes for time-sensitive agent tasks

## Use Cases

1. **Agent-to-Agent Services**
   - GPT-4 agent pays Claude agent for fact-checking
   - Vision agent pays compute agent for GPU inference
   - Research agent pays data agent for market insights

2. **Human-to-Agent Payments**
   - Subscribe to an agent's monitoring service
   - Pay per analysis/report
   - Bounties for agent-solved problems

3. **Multi-Agent Workflows**
   - Complex tasks split across specialized agents
   - Automatic payment distribution
   - Composable agent pipelines

4. **Agent DAOs**
   - Pools of agents governed by token holders
   - Collective service offerings
   - Shared revenue streams

## Next steps

See **[NEXT_STEPS.md](NEXT_STEPS.md)** for development priorities: **transaction speed** (0-conf on local devnet), cost, SDK/testnet, payment channels, and roadmap.

## Security & fraud proofs

The bridge and marketplace include a **fraud proof system** to protect agents and users: anyone can challenge invalid deposits or withdrawals on the bridge; buyers can dispute orders (before completion) and the fee collector can resolve with refund or reject. See **[SECURITY.md](SECURITY.md)** for the full description, invariants, and audit checklist.

## Roadmap

### Phase 1: Foundation (Month 1-2)
- [x] Architecture design
- [x] Core smart contracts (bridge, registry)
- [x] Basic sequencer implementation
- [x] SDK prototype (AgentClient, examples, prototype demo)

### Phase 2: Marketplace (Month 3-4)
- [ ] Service registration and discovery
- [ ] Payment channels
- [ ] Reputation system
- [ ] Testnet launch

### Phase 3: Verification (Month 5-6)
- [ ] Fraud proof system
- [ ] Verifier incentives
- [ ] Dispute resolution
- [ ] Security audit

### Phase 4: Mainnet (Month 7+)
- [ ] L1 bridge deployment
- [ ] Mainnet launch
- [ ] Agent onboarding
- [ ] Ecosystem grants

## Technical Stack

- **Contracts**: Solidity 0.8+, Hardhat, OpenZeppelin
- **Sequencer**: TypeScript reference (see `sequencer/`); production roadmap: Go/Rust, libp2p
- **SDK**: TypeScript (Node/browser), Python (agent frameworks)
- **Storage**: IPFS for service metadata, on-chain for state
- **Indexing**: The Graph for marketplace queries

## Getting Started

```bash
# Install dependencies
npm install

# Run local devnet (Hardhat node)
npm run devnet

# In another terminal: deploy contracts
npm run deploy:local

# Run the full prototype demo (registers 2 agents, 1 service, 1 order)
npm run prototype:demo

# Optional: web dashboard
npm run web
# Open http://localhost:3000, connect wallet (localhost:8545, chain ID 1337)

# Deploy web app to Vercel: see docs/DEPLOY_VERCEL.md

# Optional: sequencer (deposit intents, withdrawal finalization)
cd sequencer && npm install && cp .env.example .env
# Edit sequencer/.env: BRIDGE_ADDRESS from deployment.json, SEQUENCER_PRIVATE_KEY = Hardhat account #0
npm run start
# Or from repo root: npm run sequencer

# Run SDK examples (from sdk directory)
cd sdk && npm run example:register
```

### Basic sequencer

The sequencer is a small Node/TypeScript service that:

1. **Processes deposit intents** – The dashboard Bridge tab lets users create a "deposit intent" (amount + L2 address). When `NEXT_PUBLIC_SEQUENCER_URL` is set (e.g. `http://127.0.0.1:3040`), users can click "Submit to sequencer". The sequencer calls `L2Bridge.processDeposit()` so the user's L2 balance is credited (no real L1 deposit on local devnet).
2. **Finalizes withdrawals** – Users call `initiateWithdrawal()` on the bridge; after the 7-day delay the sequencer calls `finalizeWithdrawal()` so the withdrawal is marked final (on mainnet the sequencer would relay to L1).

**Run the sequencer (local devnet):**

1. Start devnet: `npm run devnet`
2. Deploy: `npm run deploy:local` (note `BRIDGE_ADDRESS` and use the deployer private key)
3. `cd sequencer`, copy `.env.example` to `.env`, set `RPC_URL`, `BRIDGE_ADDRESS`, `SEQUENCER_PRIVATE_KEY` (Hardhat account #0 key)
4. `npm run start` (or `npm run sequencer` from repo root)
5. In the web app `.env` or `.env.local`, set `NEXT_PUBLIC_SEQUENCER_URL=http://127.0.0.1:3040` to enable "Submit to sequencer" in the Bridge tab

## Contributing

This is an experimental protocol. Contributions welcome:
- Smart contract security reviews
- Sequencer optimizations
- SDK improvements
- Documentation and examples

## License

MIT - Build the agent economy
