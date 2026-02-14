import "dotenv/config";
import express, { Request, Response } from "express";
import { ethers } from "ethers";

const L2_BRIDGE_ABI = [
  "function processDeposit(bytes32 depositId, address l1Address, address l2Address, uint256 amount) external",
  "function finalizeWithdrawal(bytes32 withdrawalId) external",
  "function withdrawals(bytes32) view returns (address l2Address, address l1Address, uint256 amount, uint256 timestamp, bool finalized, bool challenged)",
  "function WITHDRAWAL_DELAY() view returns (uint256)",
  "event WithdrawalInitiated(bytes32 indexed withdrawalId, address indexed l2Address, address indexed l1Address, uint256 amount)",
];

const L1_BRIDGE_ABI = [
  "event DepositInitiated(bytes32 indexed depositId, address indexed l1Address, address indexed l2Address, uint256 amount)",
  "function proveWithdrawal(bytes32 withdrawalId, address l1Address, uint256 amount)",
];

const PORT = Number(process.env.PORT) || 3040;
const L2_RPC_URL = process.env.L2_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
const L2_BRIDGE_ADDRESS = process.env.L2_BRIDGE_ADDRESS || process.env.BRIDGE_ADDRESS;
const L1_RPC_URL = process.env.L1_RPC_URL;
const L1_BRIDGE_ADDRESS = process.env.L1_BRIDGE_ADDRESS;
const SEQUENCER_PRIVATE_KEY = process.env.SEQUENCER_PRIVATE_KEY;
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.POLL_INTERVAL_MS) || 60_000);
const L1_POLL_INTERVAL_MS = Math.max(5000, Number(process.env.L1_POLL_INTERVAL_MS) || 30_000);

const isL1Configured = !!(L1_RPC_URL && L1_BRIDGE_ADDRESS);

// Track last processed block to avoid re-scanning from genesis
let lastProcessedL2Block = 0;
let lastProcessedL1Block = 0;

function getConfirmationsL2(): number {
  const u = (L2_RPC_URL || "").toLowerCase();
  return u.includes("localhost") || u.includes("127.0.0.1") ? 0 : 1;
}

function getConfirmationsL1(): number {
  const u = (L1_RPC_URL || "").toLowerCase();
  return u.includes("localhost") || u.includes("127.0.0.1") ? 0 : 1;
}

async function main() {
  if (!L2_BRIDGE_ADDRESS || !SEQUENCER_PRIVATE_KEY) {
    console.error("Set BRIDGE_ADDRESS (or L2_BRIDGE_ADDRESS) and SEQUENCER_PRIVATE_KEY (see .env.example)");
    process.exit(1);
  }

  const l2Provider = new ethers.JsonRpcProvider(L2_RPC_URL);
  const l2Wallet = new ethers.Wallet(SEQUENCER_PRIVATE_KEY, l2Provider);
  const l2Bridge = new ethers.Contract(L2_BRIDGE_ADDRESS, L2_BRIDGE_ABI, l2Wallet);

  const withdrawalDelay = await l2Bridge.WITHDRAWAL_DELAY().catch(() => BigInt(7 * 24 * 60 * 60));
  console.log("Sequencer started");
  console.log("  L2 RPC:", L2_RPC_URL);
  console.log("  L2 Bridge:", L2_BRIDGE_ADDRESS);
  console.log("  Sequencer:", l2Wallet.address);
  console.log("  Withdrawal delay:", Number(withdrawalDelay), "s");
  if (isL1Configured) {
    console.log("  L1 RPC:", L1_RPC_URL);
    console.log("  L1 Bridge:", L1_BRIDGE_ADDRESS);
  }

  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
    const origin = _req.headers.origin || "";
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  app.options("*", (_req, res) => res.sendStatus(204));

  // Optional API key authentication for mutating endpoints
  const API_KEY = process.env.SEQUENCER_API_KEY;
  if (API_KEY) {
    app.use((req, res, next) => {
      if (req.path === "/health") return next();
      const key = req.headers["x-api-key"] || req.query.apiKey;
      if (key !== API_KEY) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", l2Bridge: L2_BRIDGE_ADDRESS, l1Bridge: L1_BRIDGE_ADDRESS || null });
  });

  app.post("/deposit-intent", async (req: Request, res: Response) => {
    try {
      const { intentId, l2Address, amountEth, l1Address } = req.body as {
        intentId?: string;
        l2Address?: string;
        amountEth?: string;
        l1Address?: string;
      };
      if (!intentId || !l2Address || amountEth == null || amountEth === "") {
        res.status(400).json({
          error: "Missing or invalid body: intentId, l2Address, amountEth required",
        });
        return;
      }
      if (!ethers.isAddress(l2Address)) {
        res.status(400).json({ error: "Invalid l2Address" });
        return;
      }
      const amount = ethers.parseEther(String(amountEth));
      if (amount <= 0n) {
        res.status(400).json({ error: "amountEth must be positive" });
        return;
      }
      const l1 = l1Address && ethers.isAddress(l1Address) ? l1Address : l2Address;
      const depositId = ethers.keccak256(ethers.toUtf8Bytes(intentId));

      const tx = await l2Bridge.processDeposit(depositId, l1, l2Address, amount);
      const receipt = await tx.wait(getConfirmationsL2());
      res.status(200).json({
        depositId,
        txHash: receipt!.hash,
        blockNumber: Number(receipt!.blockNumber),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("deposit-intent error:", message);
      res.status(500).json({ error: message });
    }
  });

  app.listen(PORT, () => {
    console.log("  API: http://127.0.0.1:" + PORT);
  });

  let withdrawalPollHandle: ReturnType<typeof setInterval> | null = null;
  let l1DepositPollHandle: ReturnType<typeof setInterval> | null = null;

  async function pollAndFinalizeWithdrawals() {
    try {
      const block = await l2Provider.getBlock("latest");
      if (!block) return;
      const now = BigInt(block.timestamp);
      const fromBlock = lastProcessedL2Block || Math.max(0, block.number - 10000);
      const events = await l2Bridge.queryFilter(
        l2Bridge.filters.WithdrawalInitiated(),
        fromBlock,
        "latest"
      );
      for (const ev of events) {
        const withdrawalId = (ev as ethers.EventLog).args?.withdrawalId;
        if (!withdrawalId) continue;
        const w = await l2Bridge.withdrawals(withdrawalId);
        const l1Addr = w[1] as string;
        const amount = w[2] as bigint;
        const timestamp = w[3] as bigint;
        const finalized = w[4] as boolean;
        const challenged = w[5] as boolean;
        if (finalized || challenged) continue;
        if (now < timestamp + withdrawalDelay) continue;
        try {
          const tx = await l2Bridge.finalizeWithdrawal(withdrawalId);
          await tx.wait(getConfirmationsL2());
          console.log("Finalized L2 withdrawal:", withdrawalId, "tx:", tx.hash);
          if (isL1Configured && L1_BRIDGE_ADDRESS && L1_RPC_URL) {
            const l1Wallet = new ethers.Wallet(SEQUENCER_PRIVATE_KEY!, new ethers.JsonRpcProvider(L1_RPC_URL!));
            const l1BridgeWrite = new ethers.Contract(L1_BRIDGE_ADDRESS, L1_BRIDGE_ABI, l1Wallet);
            const proveTx = await l1BridgeWrite.proveWithdrawal(withdrawalId, l1Addr, amount);
            await proveTx.wait(getConfirmationsL1());
            console.log("Proved L1 withdrawal:", withdrawalId, "tx:", proveTx.hash);
          }
        } catch (err) {
          console.error("finalizeWithdrawal failed for", withdrawalId, err);
        }
      }
      if (block) lastProcessedL2Block = block.number;
    } catch (e) {
      console.error("pollAndFinalizeWithdrawals error:", e);
    }
  }

  async function pollL1Deposits() {
    if (!isL1Configured || !L1_BRIDGE_ADDRESS || !L1_RPC_URL) return;
    try {
      const l1Provider = new ethers.JsonRpcProvider(L1_RPC_URL);
      const l1BridgeRead = new ethers.Contract(L1_BRIDGE_ADDRESS, L1_BRIDGE_ABI, l1Provider);
      const l1Block = await l1Provider.getBlock("latest");
      const fromBlock = lastProcessedL1Block || Math.max(0, (l1Block?.number ?? 0) - 10000);
      const events = await l1BridgeRead.queryFilter(
        l1BridgeRead.filters.DepositInitiated(),
        fromBlock,
        "latest"
      );
      for (const ev of events) {
        const args = (ev as ethers.EventLog).args;
        if (!args) continue;
        const depositId = args.depositId;
        const l1Address = args.l1Address;
        const l2Address = args.l2Address;
        const amount = args.amount;
        try {
          const tx = await l2Bridge.processDeposit(depositId, l1Address, l2Address, amount);
          await tx.wait(getConfirmationsL2());
          console.log("Processed L1 deposit:", depositId, "tx:", tx.hash);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Already processed") || msg.includes("DepositAlreadyProcessed")) continue;
          console.error("processDeposit failed for", depositId, err);
        }
      }
      if (l1Block) lastProcessedL1Block = l1Block.number;
    } catch (e) {
      console.error("pollL1Deposits error:", e);
    }
  }

  withdrawalPollHandle = setInterval(pollAndFinalizeWithdrawals, POLL_INTERVAL_MS);
  await pollAndFinalizeWithdrawals();

  if (isL1Configured) {
    l1DepositPollHandle = setInterval(pollL1Deposits, L1_POLL_INTERVAL_MS);
    await pollL1Deposits();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
