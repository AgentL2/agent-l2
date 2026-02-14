/**
 * AgentL2 Runtime API Server
 */

import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { pino } from 'pino';
import { agentRoutes } from './routes/agents.js';
import { orderRoutes } from './routes/orders.js';
import { pool } from '../shared/db.js';
import { errorTracker } from '../utils/errors.js';

const logger = pino({ name: 'api' });
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// =============================================================================
// Metrics counters
// =============================================================================

const serverStartedAt = Date.now();
let tasksProcessed = 0;
let totalRequests = 0;
let failedRequests = 0;

/** Increment task-processed counter (can be called from worker) */
export function incrementTasksProcessed(): void {
  tasksProcessed++;
}

/** Get current metrics snapshot */
export function getMetricsSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartedAt) / 1000),
    startedAt: new Date(serverStartedAt).toISOString(),
    tasksProcessed,
    totalRequests,
    failedRequests,
    errorRate: errorTracker.getErrorRate(),
    recentErrors: errorTracker.getRecentErrors(5),
  };
}

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

  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = clients.get(clientIp);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      clients.set(clientIp, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
      return;
    }

    next();
  };
}

// General endpoints: 100 req/min
const generalLimiter = createRateLimiter(100, 60 * 1000);
// Sensitive operations (agent execution, order processing): 10 req/min
const sensitiveLimiter = createRateLimiter(10, 60 * 1000);

// =============================================================================
// API key authentication middleware
// =============================================================================

const RUNTIME_API_KEY = process.env.RUNTIME_API_KEY;

function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!RUNTIME_API_KEY) {
    // If no API key is configured, skip authentication (development mode)
    next();
    return;
  }

  // Skip auth for health / readiness / metrics checks
  if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics') {
    next();
    return;
  }

  const key = req.headers['x-api-key'] as string | undefined || req.query.apiKey as string | undefined;
  if (key !== RUNTIME_API_KEY) {
    res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }

  next();
}

// =============================================================================
// Request validation middleware
// =============================================================================

function validateRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
  // Check Content-Type for requests with bodies
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json')) {
      res.status(415).json({ error: 'Unsupported Media Type: Content-Type must be application/json' });
      return;
    }
  }

  next();
}

// =============================================================================
// Middleware
// =============================================================================

app.use(cors());

// Body size limit: 1mb for general use (reduced from 10mb for security)
app.use(express.json({ limit: '1mb' }));

// Request validation
app.use(validateRequest);

// API key authentication for sensitive endpoints
app.use(apiKeyAuth);

// Request logging and metrics collection
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  totalRequests++;
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });
    if (res.statusCode >= 400) {
      failedRequests++;
    }
    if (res.statusCode >= 500) {
      errorTracker.track(
        `HTTP ${res.statusCode} on ${req.method} ${req.url}`,
        'api',
        { method: req.method, url: req.url, status: res.statusCode, duration }
      );
    }
  });
  next();
});

// =========================================================================
// Health, Readiness & Metrics endpoints
// =========================================================================

// /health - basic liveness (always returns 200 if the process is running)
app.get('/health', generalLimiter, (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartedAt) / 1000),
  });
});

// /ready - readiness check (verifies DB, Redis, and queue health)
app.get('/ready', generalLimiter, async (_req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check PostgreSQL connection
  try {
    const result = await pool.query('SELECT 1 AS ping');
    checks.database = { ok: result.rows.length > 0, detail: 'connected' };
  } catch (e) {
    checks.database = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  // Check Redis connection (used by BullMQ)
  try {
    const RedisModule = await import('ioredis');
    const Redis = RedisModule.default || RedisModule;
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redis = new (Redis as any)(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
    await redis.connect();
    const pong = await redis.ping();
    checks.redis = { ok: pong === 'PONG', detail: 'connected' };
    await redis.quit();
  } catch (e) {
    checks.redis = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  // Queue health - check if BullMQ queue is accessible
  try {
    const { Queue } = await import('bullmq');
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const queue = new Queue('agent-tasks', {
      connection: { host: new URL(redisUrl).hostname, port: parseInt(new URL(redisUrl).port || '6379') },
    });
    const counts = await queue.getJobCounts('waiting', 'active', 'failed');
    checks.queue = {
      ok: true,
      detail: `waiting=${counts.waiting} active=${counts.active} failed=${counts.failed}`,
    };
    await queue.close();
  } catch (e) {
    // BullMQ queue may not be set up yet - not fatal
    checks.queue = { ok: true, detail: `queue check skipped: ${e instanceof Error ? e.message : String(e)}` };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    ready: allOk,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// /metrics - operational metrics
app.get('/metrics', generalLimiter, (_req: Request, res: Response) => {
  res.json(getMetricsSnapshot());
});

// Routes with rate limiting
// Agent routes: sensitive limiter for mutations, general for reads
app.use('/api/agents', (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    sensitiveLimiter(req, res, next);
  } else {
    generalLimiter(req, res, next);
  }
}, agentRoutes);

// Order routes: sensitive limiter for mutations, general for reads
app.use('/api/orders', (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    sensitiveLimiter(req, res, next);
  } else {
    generalLimiter(req, res, next);
  }
}, orderRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, url: req.url }, 'Unhandled error');
  errorTracker.track(err, 'api.unhandled', { method: req.method, url: req.url });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'API server started');
  if (RUNTIME_API_KEY) {
    logger.info('API key authentication enabled');
  } else {
    logger.warn('No RUNTIME_API_KEY set - API authentication is disabled (development mode)');
  }
});
