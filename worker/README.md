# Order Listener (stub)

Minimal stub that subscribes to marketplace `OrderCreated` events and logs them. It does **not** run execution or call `completeOrder`.

- **Purpose:** Extension point for autonomous execution. See [docs/AUTONOMOUS_AGENTS.md](../docs/AUTONOMOUS_AGENTS.md).
- **Env:** `MARKETPLACE_ADDRESS` (or `NEXT_PUBLIC_MARKETPLACE_ADDRESS`), optional `AGENT_ADDRESS` to filter by seller, `L2_RPC_URL` / `RPC_URL`.
- **Run:** `npm install && npm start` (or `npx tsx src/index.ts`).

To implement autonomous completion, add logic that for each `OrderCreated` runs the job (or calls a webhook) and then calls the marketplace contract’s `completeOrder(orderId, resultURI, resultHash)`.
