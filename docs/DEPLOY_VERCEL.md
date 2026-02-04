# Deploy AgentL2 Web App on Vercel

This guide walks you through deploying the AgentL2 Next.js web app to [Vercel](https://vercel.com).

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- The AgentL2 repo connected to GitHub (or GitLab/Bitbucket)
- Contract addresses and RPC URL for the network you want the app to use (e.g. Sepolia or local devnet)

## Step 1: Import Project

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your Git repository (e.g. `AgentL2/agent-l2` or your fork).
3. **Important:** Set **Root Directory** to `web`:
   - Click **Edit** next to "Root Directory".
   - Enter `web` (or `agent-l2/web` if your repo root is the parent of `agent-l2`).
   - Confirm so Vercel uses the Next.js app inside `web/`.

## Step 2: Configure Build

Vercel should auto-detect Next.js. Defaults are fine:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (or `npm install && npm run build` if you need install)
- **Output Directory:** (leave default; Next.js uses `.next`)
- **Install Command:** `npm install`

No need to change these unless you use a monorepo tool (e.g. Turborepo).

## Step 3: Environment Variables

In your Vercel project: **Settings → Environment Variables**. Add at least:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_URL` | L2 RPC URL | `https://rpc.sepolia.org` or `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | L2 chain ID | `11155111` (Sepolia) or `1337` (local) |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | AgentRegistry contract | `0x...` |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | AgentMarketplace contract | `0x...` |
| `NEXT_PUBLIC_BRIDGE_ADDRESS` | L2Bridge contract | `0x...` |

Optional (for full bridge/marketplace UX):

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SEQUENCER_URL` | Sequencer API base URL | `https://your-sequencer.vercel.app` or leave empty |
| `NEXT_PUBLIC_L1_BRIDGE_ADDRESS` | L1Bridge (for "Deposit from L1") | `0x...` |
| `NEXT_PUBLIC_L1_RPC_URL` | L1 RPC | `https://rpc.sepolia.org` |
| `NEXT_PUBLIC_L1_CHAIN_ID` | L1 chain ID | `11155111` |

- Apply to **Production**, **Preview**, and **Development** as needed.
- Redeploy after changing env vars so the build picks them up.

## Step 4: Deploy

1. Click **Deploy**.
2. Wait for the build to finish. The first run installs dependencies and runs `next build`.
3. Open the generated URL (e.g. `your-project.vercel.app`).

## Step 5: Post-Deploy

- **Connect wallet:** Users must switch their wallet to the same network as `NEXT_PUBLIC_CHAIN_ID` (e.g. Sepolia).
- **Contract addresses:** Must be deployed on that network (e.g. via `npm run deploy:testnet` for Sepolia).
- **Sequencer:** If you use deposit intents or L1 bridge, run the sequencer somewhere (e.g. a separate Vercel serverless or a VPS) and set `NEXT_PUBLIC_SEQUENCER_URL` (and L1 vars if applicable).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails: "Cannot find module" | Ensure Root Directory is `web` and `npm install` runs in that folder. |
| Blank page or wrong chain | Check `NEXT_PUBLIC_CHAIN_ID` and `NEXT_PUBLIC_RPC_URL`; user must be on same network in wallet. |
| "Bridge not configured" | Set `NEXT_PUBLIC_BRIDGE_ADDRESS`. |
| API routes 404 | Confirm Root Directory is `web` so `src/app/api/*` is included. |
| Images from IPFS broken | `next.config.js` already allows `ipfs.io` and `gateway.pinata.cloud`; add other domains there if needed. |

## Custom Domain

In Vercel: **Settings → Domains** → add your domain and follow the DNS instructions.

## Summary

1. Import repo, set **Root Directory** to `web`.
2. Add **Environment Variables** (at least RPC, chain ID, and three contract addresses).
3. Deploy and open the app URL.
4. Point users to the correct network and contract set (e.g. Sepolia) for a shared testnet deployment.
