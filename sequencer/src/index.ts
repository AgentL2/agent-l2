import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";

// =============================================================================
// Structured Logger (JSON output, no external dependencies)
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

function createLogger(service: string) {
  const minLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || "info"] || 20;

  function log(level: LogLevel, msg: string, metadata?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < minLevel) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      msg,
      ...metadata,
    };
    const line = JSON.stringify(entry);
    if (level === "error" || level === "fatal") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
    fatal: (msg: string, meta?: Record<string, unknown>) => log("fatal", msg, meta),
  };
}

const logger = createLogger("sequencer");

// =============================================================================
// In-memory rate limiter (no external dependencies)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const clients = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (now > entry.resetTime) {
        clients.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let entry = clients.get(clientIp);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      clients.set(clientIp, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests",
        retryAfter,
      });
      return;
    }

    next();
  };
}

// General endpoints: 100 req/min
const generalLimiter = createRateLimiter(100, 60 * 1000);
// Admin/sequencer operations: 10 req/min
const adminLimiter = createRateLimiter(10, 60 * 1000);

const L2_BRIDGE_ABI = [
  "function processDeposit(bytes32 depositId, address l1Address, address l2Address, uint256 amount) external",
  "function finalizeWithdrawal(bytes32 withdrawalId) external",
  "function withdrawals(bytes32) view returns (address l2Address, address l1Address, uint256 amount, uint256 timestamp, bool finalized, bool challenged)",
  "function WITHDRAWAL_DELAY() view returns (uint256)",
  "function paused() view returns (bool)",
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

// =============================================================================
// Metrics counters
// =============================================================================

const startedAt = Date.now();
let blocksProcessed = 0;
let depositsProcessed = 0;
let withdrawalsProcessed = 0;
let lastL2BlockSeen = 0;

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
    logger.fatal("Set BRIDGE_ADDRESS (or L2_BRIDGE_ADDRESS) and SEQUENCER_PRIVATE_KEY (see .env.example)");
    process.exit(1);
  }

  const l2Provider = new ethers.JsonRpcProvider(L2_RPC_URL);
  const l2Wallet = new ethers.Wallet(SEQUENCER_PRIVATE_KEY, l2Provider);
  const l2Bridge = new ethers.Contract(L2_BRIDGE_ADDRESS, L2_BRIDGE_ABI, l2Wallet);

  const withdrawalDelay = await l2Bridge.WITHDRAWAL_DELAY().catch(() => BigInt(7 * 24 * 60 * 60));
  logger.info("Sequencer started", {
    l2Rpc: L2_RPC_URL,
    l2Bridge: L2_BRIDGE_ADDRESS,
    sequencer: l2Wallet.address,
    withdrawalDelay: Number(withdrawalDelay),
    l1Configured: isL1Configured,
    l1Rpc: L1_RPC_URL || null,
    l1Bridge: L1_BRIDGE_ADDRESS || null,
  });

  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
    const origin = _req.headers.origin || "";
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    next();
  });
  app.options("*", (_req, res) => res.sendStatus(204));

  // Optional API key authentication for mutating endpoints
  const API_KEY = process.env.SEQUENCER_API_KEY;
  if (API_KEY) {
    app.use((req, res, next) => {
      if (req.path === "/health" || req.path === "/ready" || req.path === "/metrics") return next();
      const key = req.headers["x-api-key"] || req.query.apiKey;
      if (key !== API_KEY) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  // =========================================================================
  // Health, Readiness & Metrics endpoints
  // =========================================================================

  // /health - basic liveness (always returns 200 if the process is running)
  app.get("/health", generalLimiter, (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      l2Bridge: L2_BRIDGE_ADDRESS,
      l1Bridge: L1_BRIDGE_ADDRESS || null,
    });
  });

  // /ready - readiness check (verifies L2 provider, wallet balance, bridge accessibility)
  app.get("/ready", generalLimiter, async (_req: Request, res: Response) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    // Check L2 provider connection
    try {
      const blockNumber = await l2Provider.getBlockNumber();
      checks.l2Provider = { ok: true, detail: `block ${blockNumber}` };
      lastL2BlockSeen = blockNumber;
    } catch (e) {
      checks.l2Provider = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }

    // Check wallet balance
    try {
      const balance = await l2Provider.getBalance(l2Wallet.address);
      const balanceEth = ethers.formatEther(balance);
      const isLow = balance < ethers.parseEther("0.01");
      checks.walletBalance = {
        ok: !isLow,
        detail: `${balanceEth} ETH${isLow ? " (LOW)" : ""}`,
      };
    } catch (e) {
      checks.walletBalance = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }

    // Check bridge contract accessibility
    try {
      await l2Bridge.WITHDRAWAL_DELAY();
      checks.bridgeContract = { ok: true };
    } catch (e) {
      checks.bridgeContract = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }

    // Check if bridge is paused
    try {
      const paused = await l2Bridge.paused().catch(() => false);
      checks.bridgePaused = { ok: !paused, detail: paused ? "PAUSED" : "active" };
    } catch {
      // paused() may not exist on all bridge contracts - skip
      checks.bridgePaused = { ok: true, detail: "unknown (no paused() function)" };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    res.status(allOk ? 200 : 503).json({
      ready: allOk,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // /metrics - operational metrics
  app.get("/metrics", generalLimiter, (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
    res.json({
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      startedAt: new Date(startedAt).toISOString(),
      blocksProcessed,
      depositsProcessed,
      withdrawalsProcessed,
      lastL2BlockSeen,
      lastProcessedL2Block,
      lastProcessedL1Block,
      l1Configured: isL1Configured,
    });
  });

  // Rate limiting: admin/sequencer operations (10 req/min)
  app.post("/deposit-intent", adminLimiter, async (req: Request, res: Response) => {
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
      depositsProcessed++;
      logger.info("Deposit intent processed", { depositId, txHash: receipt!.hash });
      res.status(200).json({
        depositId,
        txHash: receipt!.hash,
        blockNumber: Number(receipt!.blockNumber),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error("deposit-intent error", { error: message });
      res.status(500).json({ error: message });
    }
  });

  app.listen(PORT, () => {
    logger.info("API server listening", { port: PORT, url: `http://127.0.0.1:${PORT}` });
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
          withdrawalsProcessed++;
          logger.info("Finalized L2 withdrawal", { withdrawalId, txHash: tx.hash });
          if (isL1Configured && L1_BRIDGE_ADDRESS && L1_RPC_URL) {
            const l1Wallet = new ethers.Wallet(SEQUENCER_PRIVATE_KEY!, new ethers.JsonRpcProvider(L1_RPC_URL!));
            const l1BridgeWrite = new ethers.Contract(L1_BRIDGE_ADDRESS, L1_BRIDGE_ABI, l1Wallet);
            const proveTx = await l1BridgeWrite.proveWithdrawal(withdrawalId, l1Addr, amount);
            await proveTx.wait(getConfirmationsL1());
            logger.info("Proved L1 withdrawal", { withdrawalId, txHash: proveTx.hash });
          }
        } catch (err) {
          logger.error("finalizeWithdrawal failed", { withdrawalId, error: err instanceof Error ? err.message : String(err) });
        }
      }
      if (block) {
        lastProcessedL2Block = block.number;
        blocksProcessed++;
      }
    } catch (e) {
      logger.error("pollAndFinalizeWithdrawals error", { error: e instanceof Error ? e.message : String(e) });
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
          depositsProcessed++;
          logger.info("Processed L1 deposit", { depositId, txHash: tx.hash });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Already processed") || msg.includes("DepositAlreadyProcessed")) continue;
          logger.error("processDeposit failed", { depositId, error: msg });
        }
      }
      if (l1Block) lastProcessedL1Block = l1Block.number;
    } catch (e) {
      logger.error("pollL1Deposits error", { error: e instanceof Error ? e.message : String(e) });
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
  logger.fatal("Sequencer crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
