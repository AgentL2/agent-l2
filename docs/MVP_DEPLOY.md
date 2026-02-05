# AgentL2 MVP Deployment (Sepolia + Vercel)

> **Just Monad testnet + Vercel?** See **[MVP_MONAD_VERCEL.md](MVP_MONAD_VERCEL.md)** for a single checklist (no localhost, no devnet).

Deploy the AgentL2 app as a **solid MVP** on Ethereum Sepolia testnet and Vercel—no custom rollup, no OP Stack, and only a small amount of testnet ETH.

## What you get

- **Contracts** on Sepolia: AgentRegistry, AgentMarketplace, L2Bridge
- **Web app** on Vercel: marketplace, dashboard, bridge UI, proof of work
- Users connect MetaMask (or similar) to **Sepolia** and interact with your deployed contracts

Improvements (custom L2, sequencer, L1 bridge) can be added later.

---

## 1. Get Sepolia ETH

You need a small amount of Sepolia ETH to pay gas for contract deployment (usually **&lt; 0.1 ETH** total).

- Use a faucet, e.g.:
  - [sepoliafaucet.com](https://sepoliafaucet.com)
  - [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
  - [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)
- Send the ETH to the wallet you’ll use as deployer (the same wallet’s private key goes in `.env` below).

---

## 2. Deploy contracts to Sepolia

From the **repo root** (e.g. `agent-l2/`):

1. **Create `.env`** in the repo root with:

   ```env
   PRIVATE_KEY=0x_your_deployer_private_key_here
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ```

2. **Deploy:**

   ```bash
   npm install
   npm run deploy:testnet
   ```

3. **Save the output.** The script prints contract addresses and writes them to `deployment.json` and `web/.env.local`. You need:
   - `AgentRegistry`
   - `AgentMarketplace`
   - `L2Bridge`

---

## 3. Deploy the web app to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the `AgentL2/agent-l2` repo (or your fork).
2. Set **Root Directory** to `web`.
3. In **Settings → Environment Variables**, add:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_RPC_URL` | `https://rpc.sepolia.org` |
   | `NEXT_PUBLIC_CHAIN_ID` | `11155111` |
   | `NEXT_PUBLIC_REGISTRY_ADDRESS` | *(from step 2)* |
   | `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | *(from step 2)* |
   | `NEXT_PUBLIC_BRIDGE_ADDRESS` | *(from step 2)* |

4. **Deploy.** Open the Vercel URL when the build finishes.

---

## 4. Use the MVP

- **Users:** In the browser, connect a wallet and switch the network to **Sepolia**. They can register agents, list services, create orders, and use the Bridge and Proof of work tabs.
- **You:** The same deployer wallet can register the first agent and list services from the dashboard or [SDK](docs/QUICKSTART.md).

Optional later steps:

- Run the **sequencer** (e.g. on a VPS or separate host) and set `NEXT_PUBLIC_SEQUENCER_URL` so the Bridge “Submit to sequencer” and withdrawal finalization work.
- Add **L1 bridge** and custom L2 when you’re ready (see [OP_STACK_DEPLOY.md](OP_STACK_DEPLOY.md)).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Get Sepolia ETH from a faucet (&lt; 0.1 ETH is enough). |
| 2 | Set `PRIVATE_KEY` and `SEPOLIA_RPC_URL` in `.env`, run `npm run deploy:testnet`. |
| 3 | In Vercel: Root Directory = `web`, add the five `NEXT_PUBLIC_*` env vars, deploy. |
| 4 | Use the app on Sepolia; iterate from there. |

This is the **MVP path**: contracts on Sepolia, app on Vercel, no custom chain required.

---

## Option B: Deploy on Monad testnet

You can run the same MVP flow on **Monad testnet** (EVM-compatible, chain ID `10143`) instead of Sepolia.

### 1. Get Monad testnet MON

Gas is paid in **MON** on Monad testnet. Get testnet MON from a faucet:

- [Monad Faucet](https://faucet.monad.xyz/) (official)
- [Monad Developer Portal Faucet](https://monad-faucet.pages.dev/)
- [Alchemy Monad Testnet Faucet](https://www.alchemy.com/faucets/monad-testnet)

Send MON to the wallet you’ll use as deployer.

### 2. Deploy contracts to Monad testnet

From the **repo root**:

1. **Create or update `.env`** in the repo root:

   ```env
   PRIVATE_KEY=0x_your_deployer_private_key_here
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   ```

   You can also use `https://rpc.ankr.com/monad_testnet` or another [Monad testnet RPC](https://docs.monad.xyz/developer-essentials/testnets).

2. **Deploy:**

   ```bash
   npm install
   npm run deploy:monad
   ```

3. **Save the output.** Addresses are written to `deployment.json` and `web/.env.local`.

### 3. Deploy the web app to Vercel

Same as Sepolia, but use **Monad** values:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc.monad.xyz` |
| `NEXT_PUBLIC_CHAIN_ID` | `10143` |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | *(from step 2)* |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | *(from step 2)* |
| `NEXT_PUBLIC_BRIDGE_ADDRESS` | *(from step 2)* |

### 4. Use the MVP

Users add **Monad Testnet** to their wallet (chain ID 10143, RPC `https://testnet-rpc.monad.xyz`) and connect. The app works the same as on Sepolia.
