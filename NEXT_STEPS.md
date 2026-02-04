# Next Steps for Development

Suggested priorities for further development, including **transaction speed**, cost, and product roadmap.

---

## 1. Transaction speed (implemented)

Speed on local devnet is already improved:

- **Hardhat default**: The devnet (`npm run devnet`) uses **automining**: each transaction gets its own block immediately. No fixed block interval.
- **0 confirmations on local**: The web app and sequencer use **0 confirmations** when `NEXT_PUBLIC_CHAIN_ID === 1337` (or when the sequencer RPC is localhost). So we don’t wait for an extra block; we return as soon as the tx is mined. On testnet/mainnet we still use 1 confirmation for safety.

**If you still see slow txs:**

- Ensure the devnet is the only heavy user of the node (no other scripts hammering it).
- Check that `NEXT_PUBLIC_CHAIN_ID=1337` is set in `web/.env.local` so the app uses 0-conf wait.
- For the sequencer, ensure `RPC_URL` points to localhost so it uses 0-conf.

**Future speed (beyond local):**

- **Dedicated L2 execution layer**: A real L2 (e.g. custom sequencer + execution env like revm/geth) with sub-second block time and batched L1 submission would give “L2 speed” in production. The current repo is contracts on a single chain; the sequencer only processes deposits/withdrawals.
- **Testnet**: On Sepolia (or similar), block time is fixed (~12s); we can’t change that. We still use 1 confirmation there.

---

## 2. Cost

Cost is already low on local (gas is free) and will stay low on L2-style chains. Optional improvements:

- **Gas profiling**: Use Hardhat’s gas reporter in tests to catch regressions.
- **Batching**: If we add “batch” operations (e.g. register agent + service in one tx), we could expose them in the SDK or contracts to reduce total gas for multi-step flows.

---

## 3. Product & roadmap

| Priority | Item | Notes |
|----------|------|--------|
| **High** | **SDK polish** | Finish SDK prototype: clear docs, `resolveDispute` for fee collector, streaming payment helpers, error handling. |
| **High** | **Testnet launch** | Deploy to Sepolia (or other testnet), document RPC and contract addresses, add “Switch to testnet” in the web app. |
| **Medium** | **Payment channels** | Off-chain or state-channel style flows for high-frequency, low-value payments (see roadmap Phase 2). |
| **Medium** | **Reputation system** | On-chain or hybrid reputation (e.g. `updateReputation` usage, dispute outcomes, completion rate). |
| **Medium** | **Indexing / subgraph** | The Graph or custom indexer for marketplace queries (orders, agents, services) for faster dashboards and discovery. |
| **Lower** | **L1 bridge + real L2** | Deploy L1 bridge contract, connect sequencer to it, and (optionally) run a dedicated L2 execution layer for true rollup-style speed. |
| **Lower** | **ZK / instant finality** | Research ZK proofs for faster finality (Phase 3+ in architecture). |

---

## 4. Security & ops

- **Audit**: Use [SECURITY.md](SECURITY.md) and the audit checklist before an external review.
- **Monitoring**: Add health checks and alerting for the sequencer (e.g. deposit-intent failures, RPC errors).
- **Rate limiting**: Optional rate limits on the sequencer HTTP API to avoid abuse.

---

## 5. Quick reference

- **Speed on local**: Automining + 0-conf wait in web and sequencer when chain is local (1337 / localhost).
- **Speed on testnet/mainnet**: Block time is fixed; we use 1 confirmation. Real “L2 speed” needs a dedicated execution layer and batching to L1.
- **Cost**: Already low; optional batching and gas profiling for further savings.
- **Next features**: SDK polish, testnet launch, payment channels, reputation, indexing.
