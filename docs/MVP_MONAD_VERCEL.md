# Deploy AgentL2 MVP: Monad Testnet + Vercel

One path to get your **MVP live**: contracts on **Monad testnet**, web app on **Vercel**. No localhost or devnet.

---

## Step 1: Get Monad testnet MON

You need a small amount of **MON** (testnet) to pay gas for contract deployment.

1. Use a faucet and send MON to the wallet you’ll use as deployer:
   - [Monad Faucet](https://faucet.monad.xyz/) (official)
   - [Monad Developer Portal Faucet](https://monad-faucet.pages.dev/)
   - [Alchemy Monad Testnet Faucet](https://www.alchemy.com/faucets/monad-testnet)
2. That wallet’s **private key** will go in `.env` in the next step (same wallet you use in MetaMask for deployment).

---

## Step 2: Deploy contracts to Monad testnet

From the **repo root** (the `agent-l2` folder):

1. **Create or edit `.env`** in the repo root (same folder as `package.json`):

   ```env
   PRIVATE_KEY=0x_your_deployer_private_key_here
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   ```

   Replace `0x_your_deployer_private_key_here` with your real key (the wallet that has the MON from Step 1).

2. **Install and deploy:**

   ```bash
   npm install
   npm run deploy:monad
   ```

3. **Copy the contract addresses** from the terminal output (or from `deployment.json` and `web/.env.local`). You need:
   - **AgentRegistry**
   - **AgentMarketplace**
   - **L2Bridge**

---

## Step 3: Deploy the web app to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your Git repo (e.g. `AgentL2/agent-l2` or your fork).
2. Set **Root Directory** to **`web`** (Edit → enter `web` → Confirm).
3. Before deploying, go to **Settings → Environment Variables** and add:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc.monad.xyz` |
   | `NEXT_PUBLIC_CHAIN_ID` | `10143` |
   | `NEXT_PUBLIC_REGISTRY_ADDRESS` | *(AgentRegistry address from Step 2)* |
   | `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | *(AgentMarketplace address from Step 2)* |
   | `NEXT_PUBLIC_BRIDGE_ADDRESS` | *(L2Bridge address from Step 2)* |

4. Click **Deploy**. When the build finishes, open your Vercel URL.

---

## Step 4: Use the MVP

- **You:** Open the Vercel app, connect your wallet, and switch the network to **Monad Testnet** (chain ID **10143**, RPC `https://testnet-rpc.monad.xyz`). If your wallet doesn’t have Monad Testnet, add it (e.g. [Monad docs](https://docs.monad.xyz/developer-essentials/testnets)).
- **Users:** Same: add Monad Testnet, connect, and use the marketplace, dashboard, bridge, and proof of work.

---

## Quick reference

| What | Where |
|------|--------|
| Contracts | Monad testnet (chain ID 10143) |
| Web app | Vercel (your project URL) |
| RPC | `https://testnet-rpc.monad.xyz` |
| Gas | MON from faucet (Step 1) |

No localhost or devnet needed for this path.
