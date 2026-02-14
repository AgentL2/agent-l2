/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit';
 *
 *   const limiter = rateLimit({ maxRequests: 60, windowMs: 60_000 });
 *
 *   export async function GET(request: Request) {
 *     const limited = limiter.check(request);
 *     if (limited) return limited;          // returns a 429 NextResponse
 *     // ... normal handler
 *   }
 *
 * Notes:
 *  - Each limiter instance maintains its own in-memory Map, keyed by client IP.
 *  - Stale entries are cleaned up automatically every 5 minutes.
 *  - Because Next.js API routes can run in a long-lived Node process (dev, custom
 *    server, standalone output) or in serverless functions, this is best-effort.
 *    For true distributed rate limiting, swap this with Redis/Upstash.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

interface RateLimiterInstance {
  /**
   * Check whether the request should be rate-limited.
   * Returns `null` if the request is allowed, or a 429 `NextResponse` if blocked.
   * When allowed, rate-limit headers are NOT set here (Next.js API routes return
   * NextResponse objects that are immutable). Instead callers can use `headers()`
   * to retrieve them if needed.
   */
  check: (request: Request) => NextResponse | null;

  /**
   * Return rate limit headers for the given client.
   */
  headers: (request: Request) => Record<string, string>;
}

/**
 * Extract a best-effort client identifier from a Next.js Request.
 * In production behind a reverse proxy the `x-forwarded-for` header is most
 * reliable. Falls back to `x-real-ip`, then to a constant.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first (original client)
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(config: RateLimitConfig): RateLimiterInstance {
  const { maxRequests, windowMs } = config;
  const clients = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of clients) {
        if (now > entry.resetTime) {
          clients.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  function getOrCreate(ip: string): RateLimitEntry {
    const now = Date.now();
    let entry = clients.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      clients.set(ip, entry);
    }
    return entry;
  }

  function headers(request: Request): Record<string, string> {
    const ip = getClientIp(request);
    const entry = getOrCreate(ip);
    const remaining = Math.max(0, maxRequests - entry.count);
    return {
      'X-RateLimit-Limit': String(maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
    };
  }

  function check(request: Request): NextResponse | null {
    const ip = getClientIp(request);
    const entry = getOrCreate(ip);
    entry.count++;

    if (entry.count > maxRequests) {
      const now = Date.now();
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
          },
        },
      );
    }

    return null;
  }

  return { check, headers };
}

// =============================================================================
// Pre-configured limiters for common use cases
// =============================================================================

/** General read endpoints: 100 requests per minute. */
export const generalLimiter = rateLimit({ maxRequests: 100, windowMs: 60_000 });

/** Sensitive / mutating endpoints: 20 requests per minute. */
export const sensitiveLimiter = rateLimit({ maxRequests: 20, windowMs: 60_000 });

/** Hosted agent management: 30 requests per minute. */
export const hostedLimiter = rateLimit({ maxRequests: 30, windowMs: 60_000 });
