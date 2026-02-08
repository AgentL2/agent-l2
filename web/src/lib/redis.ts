/**
 * Redis client for AgentL2
 * Used for caching, sessions, rate limiting, and real-time pub/sub
 */

import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL not configured - Redis features disabled');
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redis = redis;
}

// Cache helpers
export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  DAY: 86400,         // 24 hours
};

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttl = CACHE_TTL.MEDIUM): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis setCache error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis invalidateCache error:', error);
  }
}

// Rate limiting
export async function checkRateLimit(
  key: string, 
  limit: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!redis) return { allowed: true, remaining: limit, resetIn: 0 };

  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const resetIn = windowSeconds - (now % windowSeconds);

    return {
      allowed: count <= limit,
      remaining,
      resetIn,
    };
  } catch {
    return { allowed: true, remaining: limit, resetIn: 0 };
  }
}

export default redis;
