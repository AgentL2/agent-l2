# AgentL2 Sequencer

Basic sequencer implementation for the AgentL2 bridge: processes deposit intents and finalizes withdrawals after the delay period.

## What it does

- **Deposit intents** – HTTP `POST /deposit-intent` with `{ intentId, l2Address, amountEth [, l1Address ] }`. The sequencer calls `L2Bridge.processDeposit()` so the L2 balance is credited. On local devnet there is no real L1 deposit; the intent is enough.
- **Withdrawal finalization** – Polls `WithdrawalInitiated` events and, for each withdrawal past the 7-day delay, calls `finalizeWithdrawal()`.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `RPC_URL` (e.g. `http://127.0.0.1:8545` for local Hardhat).
3. Set `BRIDGE_ADDRESS` (from `npm run deploy:local` in the repo root).
4. Set `SEQUENCER_PRIVATE_KEY` to the **sequencer** account. On local devnet this must be the same as the L2Bridge’s sequencer (the deployer). To get Hardhat account #0 private key:
   ```bash
   npx hardhat console --network localhost
   > (await ethers.getSigners())[0].privateKey
   ```

## Run

```bash
npm install
npm run start
```

API listens on `http://127.0.0.1:3040` (or `PORT` from `.env`).

## API

- `GET /health` – Returns `{ status: "ok", bridge: "<address>" }`.
- `POST /deposit-intent` – Body: `{ intentId: string, l2Address: string, amountEth: string, l1Address?: string }`. Returns `{ depositId, txHash, blockNumber }` or 4xx/5xx with `{ error: string }`.

## Env

| Variable | Required | Description |
|--------|----------|-------------|
| `RPC_URL` | Yes | L2 RPC (e.g. Hardhat node). |
| `BRIDGE_ADDRESS` | Yes | L2Bridge contract address. |
| `SEQUENCER_PRIVATE_KEY` | Yes | Private key of the account that is the bridge’s sequencer. |
| `PORT` | No | HTTP port (default 3040). |
| `POLL_INTERVAL_MS` | No | Withdrawal poll interval in ms (default 60000). |
