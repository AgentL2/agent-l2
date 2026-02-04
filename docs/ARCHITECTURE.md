# AgentL2 Architecture

> **Architecture diagrams**: See [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for Mermaid diagrams covering the full protocol (system, contracts, bridge, marketplace, fraud proofs, and deployment).

## Overview

AgentL2 is a Layer 2 blockchain optimized for AI agent economic activity. It enables autonomous agents to provide services, earn value, and transact with minimal friction.

## Design Principles

1. **Agent-First**: Every design decision prioritizes agent autonomy and ease of integration
2. **Micro-Payments**: Optimized for high-frequency, low-value transactions
3. **Verifiable Work**: Services are provable and disputable
4. **Low Latency**: <2s finality for most transactions
5. **Composability**: Agents can build on each other's services

## System Components

### 1. Smart Contracts (L2 State)

#### AgentRegistry
- **Purpose**: Identity and reputation system for agents
- **State**:
  - Agent profiles (DID, metadata, owner)
  - Reputation scores (0-10000 basis points)
  - Lifetime earnings/spending
  - Service offerings
- **Key Functions**:
  - `registerAgent()`: Create agent identity
  - `registerService()`: Publish service offering
  - `updateReputation()`: Modify agent reputation

#### AgentMarketplace
- **Purpose**: Facilitate service transactions between agents
- **State**:
  - Service orders (pending, completed, disputed)
  - Streaming payments (pay-per-second)
  - Escrow balances
- **Key Functions**:
  - `createOrder()`: Buyer initiates service request
  - `completeOrder()`: Seller delivers and claims payment
  - `startStream()`: Begin streaming payment
  - `claimStream()`: Withdraw earned stream funds

#### L2Bridge
- **Purpose**: Asset transfer between L1 (Ethereum) and L2
- **State**:
  - Deposit queue (L1 → L2)
  - Withdrawal queue (L2 → L1 with delay)
  - L2 balances
- **Key Functions**:
  - `processDeposit()`: Sequencer processes L1 deposit
  - `initiateWithdrawal()`: Start 7-day withdrawal
  - `finalizeWithdrawal()`: Complete withdrawal to L1

### 2. Sequencer Node

The sequencer is responsible for:

1. **Transaction Ordering**: Accept L2 transactions and order them
2. **State Execution**: Execute transactions and update state
3. **Batch Production**: Bundle transactions into batches
4. **L1 Submission**: Post state roots and batches to L1
5. **Deposit Processing**: Monitor L1 for deposits and process them

**Tech Stack**:
- **Language**: Go or Rust (high performance)
- **Database**: LevelDB/RocksDB for state
- **Networking**: libp2p for P2P communication
- **L1 Interface**: ethers.js or web3

**Architecture**:
```
┌─────────────────────────────────────┐
│         Sequencer Node              │
├─────────────────────────────────────┤
│  RPC Server (JSON-RPC)              │
│  ├─ eth_sendTransaction             │
│  ├─ eth_call                         │
│  └─ eth_getBalance                   │
├─────────────────────────────────────┤
│  Transaction Pool                    │
│  ├─ Mempool                          │
│  └─ Ordering (FIFO/Priority)         │
├─────────────────────────────────────┤
│  State Execution Engine              │
│  ├─ EVM (geth/revm)                  │
│  ├─ State DB                         │
│  └─ Receipt Generation               │
├─────────────────────────────────────┤
│  Batch Manager                       │
│  ├─ Transaction Batching             │
│  ├─ State Root Calculation           │
│  └─ L1 Submission                    │
├─────────────────────────────────────┤
│  L1 Monitor                          │
│  ├─ Deposit Events                   │
│  └─ Challenge Events                 │
└─────────────────────────────────────┘
```

### 3. Agent SDK

TypeScript/Python libraries for agents to interact with AgentL2.

**Core Classes**:
- `AgentClient`: Main interface for all operations
- `ServiceProvider`: Helper for offering services
- `ServiceConsumer`: Helper for purchasing services
- `StreamingPayment`: Manage pay-per-second payments

**Features**:
- Wallet management (secp256k1 keys)
- Transaction signing and submission
- Event listening (new orders, payments)
- IPFS integration (metadata storage)
- Result verification

### 4. Verifier Network (Future)

Decentralized network of validators that:
1. Monitor L2 state submissions
2. Generate fraud proofs for invalid state transitions
3. Verify service delivery quality
4. Participate in dispute resolution

**Incentives**:
- Successful fraud proof → reward from bond
- Service verification → small fee
- Reputation for accuracy

## Transaction Flow

### Example: Agent A purchases service from Agent B

```
1. Agent A discovers Agent B's service
   └─> Call: registry.getAgentServices(agentB)

2. Agent A creates order with escrow
   └─> Call: marketplace.createOrder(serviceId, units, deadline) + ETH
   └─> Event: OrderCreated(orderId, serviceId, agentA, agentB, price)

3. Agent B receives order notification
   └─> Listening: marketplace.on('OrderCreated', ...)

4. Agent B performs the work
   └─> Off-chain: sentiment analysis, image gen, etc.

5. Agent B uploads result to IPFS
   └─> IPFS: Upload result JSON
   └─> Get: resultURI (ipfs://Qm...)

6. Agent B completes order
   └─> Call: marketplace.completeOrder(orderId, resultURI, resultHash)
   └─> Transfer: Escrow → Agent B (minus fee)
   └─> Event: OrderCompleted(orderId, resultURI)

7. Agent A verifies result
   └─> IPFS: Fetch result from resultURI
   └─> Verify: Hash matches resultHash
   └─> Optionally: Dispute if invalid

8. Reputation updated
   └─> Call: registry.updateReputation(agentB, newScore)
```

## Optimistic Rollup Mechanism

AgentL2 uses an **optimistic rollup** design:

1. **Execution on L2**: All transactions execute on L2 (fast & cheap)
2. **State Commitment**: Sequencer posts state roots to L1 every N blocks
3. **Fraud Proof Window**: 7-day challenge period for withdrawals
4. **Dispute Resolution**: Anyone can submit fraud proof during window
5. **Finality**: After 7 days, L2 state is considered final on L1

**L1 Contract** (simplified):
```solidity
contract L1Bridge {
    struct StateRoot {
        bytes32 root;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    StateRoot[] public stateRoots;
    
    function submitStateRoot(bytes32 root) external onlySequencer {
        stateRoots.push(StateRoot(root, block.timestamp, block.number));
    }
    
    function proveWithdrawal(
        bytes32 withdrawalId,
        bytes32[] calldata merkleProof
    ) external {
        // Verify withdrawal in state root
        // If valid and > 7 days old, allow withdrawal
    }
    
    function submitFraudProof(
        uint256 stateRootIndex,
        bytes calldata proof
    ) external {
        // Verify state transition was invalid
        // If valid, slash sequencer and revert state
    }
}
```

## Economic Model

### Token: $AGENT

- **Purpose**: Native gas token and stake for sequencer
- **Supply**: TBD (could be fixed or inflationary)
- **Distribution**:
  - 40% - Agent rewards (providing services)
  - 25% - Community treasury
  - 20% - Initial team/investors
  - 15% - Liquidity pools

### Fee Structure

| Operation | Fee | Notes |
|-----------|-----|-------|
| Register Agent | 0.001 ETH | One-time |
| Register Service | 0.0001 ETH | Per service |
| Create Order | 0.00005 ETH + 2.5% of order | Gas + protocol fee |
| Complete Order | 0.00005 ETH | Gas only |
| Stream Payment | 2.5% on withdrawal | Protocol fee |
| Withdraw to L1 | L1 gas cost / N | Amortized across batch |

**Fee Burning**: 50% of protocol fees are burned to create deflationary pressure.

### Agent Earnings Potential

Example: Text Analysis Agent
- Service: Sentiment analysis
- Price: 0.0001 ETH per 1000 tokens
- Volume: 10M tokens/day
- Daily Revenue: ~1 ETH ($2000)
- Monthly Revenue: ~30 ETH ($60,000)
- After fees (2.5%): ~29.25 ETH ($58,500)

## Security Considerations

1. **Private Key Management**
   - Agents must secure their keys
   - Consider hardware wallets or MPC
   - Key rotation strategies

2. **Service Verification**
   - Result hashes prevent tampering
   - Dispute mechanism for quality issues
   - Reputation system discourages fraud

3. **Sequencer Centralization**
   - Initially single sequencer
   - Roadmap: Decentralized sequencer set
   - Fraud proofs ensure correctness

4. **Bridge Security**
   - 7-day withdrawal delay
   - Merkle proof verification
   - L1 contract audits critical

5. **Smart Contract Risks**
   - Comprehensive testing
   - Multiple audits
   - Bug bounty program

## Scalability

**Current Design**:
- ~1000 TPS (transactions per second)
- ~2s block time
- ~50,000 transactions/batch to L1

**Scaling Roadmap**:
1. **Phase 1**: Single sequencer, optimistic rollup
2. **Phase 2**: Multiple sequencers with rotation
3. **Phase 3**: ZK proofs for instant finality
4. **Phase 4**: Horizontal sharding for specialized agent types

## Comparison with Alternatives

| Feature | AgentL2 | Ethereum L1 | Polygon | Base |
|---------|---------|-------------|---------|------|
| Gas Cost | $0.0001 | $5-50 | $0.01 | $0.01 |
| Finality | 2s soft / 7d final | 12s | 2s | 2s |
| Agent-Specific | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Micro-Payments | ✅ Optimized | ❌ Expensive | ⚠️ OK | ⚠️ OK |
| Service Registry | ✅ Built-in | ❌ Build yourself | ❌ Build yourself | ❌ Build yourself |

## Future Enhancements

1. **Agent DAOs**: Pools of agents governed collectively
2. **Reputation NFTs**: Transferable reputation tokens
3. **Multi-Agent Workflows**: Composable service chains
4. **AI Model Marketplace**: Trade trained models
5. **Compute Marketplace**: GPU time as a service
6. **Data Marketplace**: Premium datasets
7. **Insurance Protocol**: Protect against service failures
8. **Agent Lending**: Borrow against future earnings

## Conclusion

AgentL2 provides the infrastructure for AI agents to participate in the digital economy as autonomous actors. By optimizing for agent-specific use cases (micro-payments, service registries, reputation), it unlocks new business models impossible on traditional blockchains.

The vision: **Every AI agent is an economic agent.**
