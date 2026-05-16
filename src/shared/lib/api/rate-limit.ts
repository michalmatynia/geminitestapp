/**
 * Rate Limiting
 * 
 * Redis-based rate limiting for API endpoints.
 * Provides:
 * - Request rate limiting per client
 * - Redis-backed rate limit storage
 * - Configurable time windows
 * - Rate limit error responses
 * - Server-only rate limit enforcement
 */

import 'server-only';

import { rateLimitedError } from '@/shared/errors/app-error';
import { getRedisClient } from '@/shared/lib/redis';
import { safeClearTimeout, safeSetInterval, safeSetTimeout } from '@/shared/lib/timers';
import { logger } from '@/shared/utils/logger';

import type { NextRequest } from 'next/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Configuration for a rate limiter instance.
 */
type RateLimitConfig = {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Optional function to generate a unique key for the request (defaults to IP). */
  keyGenerator?: (req: NextRequest) => string;
};

/**
 * Internal entry for in-memory rate limiting fallback.
 */
type RateLimitEntry = {
  /** Current count of requests in the window. */
  count: number;
  /** Timestamp when the current window resets. */
  resetTime: number;
  /** Array of request timestamps for precise window calculation. */
  requests: number[];
};

/**
 * Result of a rate limit check.
 */
type RateLimitResult = {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of remaining requests in the window. */
  remaining: number;
  /** Timestamp when the window resets. */
  resetTime: number;
  /** Total number of hits in the current window. */
  totalHits: number;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const RATE_LIMIT_REDIS_TIMEOUT_MS = parsePositiveInt(
  process.env['RATE_LIMIT_REDIS_TIMEOUT_MS'],
  750
);

class RateLimitRedisTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Rate limit Redis check timed out after ${timeoutMs}ms.`);
    this.name = 'RateLimitRedisTimeoutError';
  }
}

const isRateLimitRedisTimeoutError = (error: unknown): error is RateLimitRedisTimeoutError =>
  error instanceof RateLimitRedisTimeoutError;

const withRateLimitRedisTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  if (RATE_LIMIT_REDIS_TIMEOUT_MS <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof safeSetTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = safeSetTimeout(() => {
          reject(new RateLimitRedisTimeoutError(RATE_LIMIT_REDIS_TIMEOUT_MS));
        }, RATE_LIMIT_REDIS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      safeClearTimeout(timeoutId);
    }
  }
};

/**
 * Lua script for atomic rate limiting in Redis using a sorted set.
 * 
 * Logic:
 * 1. Remove expired request IDs from the sorted set (older than now - window).
 * 2. Count remaining request IDs in the set.
 * 3. If count < max, add new request ID and set expiration on the key.
 * 4. Return [1, remaining_count] if allowed, [0, 0] otherwise.
 */
const RATE_LIMIT_LUA_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local max = tonumber(ARGV[3])
  local requestId = ARGV[4]
  
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  local count = redis.call('ZCARD', key)
  
  if count < max then
    redis.call('ZADD', key, now, requestId)
    redis.call('PEXPIRE', key, window)
    return {1, max - count - 1}
  else
    return {0, 0}
  end
`;

/**
 * RateLimiter class that supports Redis with an in-memory fallback.
 */
class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  /**
   * @param config - Rate limiter configuration.
   */
  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req: NextRequest): string => getClientIp(req),
      ...config,
    };
  }

  /**
   * Checks if a request should be rate limited.
   * 
   * @param req - The Next.js request object.
   * @param prefix - A prefix for the rate limit key (e.g. 'auth').
   * @returns A promise resolving to the rate limit result.
   */
  async check(req: NextRequest, prefix: string): Promise<RateLimitResult> {
    const key = `${prefix}:${this.config.keyGenerator(req)}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        const now = Date.now();
        const requestId = `${now}-${Math.random()}`;

        // Use Lua script for atomic execution to prevent race conditions
        const results = (await withRateLimitRedisTimeout(
          redis.eval(
            RATE_LIMIT_LUA_SCRIPT,
            1,
            key,
            now.toString(),
            this.config.windowMs.toString(),
            this.config.maxRequests.toString(),
            requestId
          ) as Promise<unknown>
        )) as [number, number];

        const [allowed, remaining] = results;

        return {
          allowed: allowed === 1,
          remaining: remaining ?? 0,
          resetTime: now + this.config.windowMs,
          totalHits: this.config.maxRequests - (remaining ?? 0),
        };
      } catch (error) {
        if (!isRateLimitRedisTimeoutError(error)) {
          void ErrorSystem.captureException(error);
        }
        logger.warn('[rate-limit] Redis failure, falling back to memory', { error });
      }
    }

    // Fallback to in-memory store if Redis is unavailable or fails
    return this.checkInMemory(req);
  }

  /**
   * Internal in-memory rate limit check.
   */
  private checkInMemory(req: NextRequest): RateLimitResult {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { count: 0, resetTime: now + this.config.windowMs, requests: [] };
      this.store.set(key, entry);
    }

    // Slide the window by removing old timestamps
    entry.requests = entry.requests.filter((time: number) => time > windowStart);
    entry.count = entry.requests.length;
    if (now > entry.resetTime) {
      entry.resetTime = now + this.config.windowMs;
    }

    const allowed = entry.count < this.config.maxRequests;
    if (allowed) {
      entry.requests.push(now);
      entry.count += 1;
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalHits: entry.count,
    };
  }

  /**
   * @returns The active configuration for this limiter.
   */
  getConfig(): Required<RateLimitConfig> {
    return this.config;
  }

  /**
   * Cleans up expired entries from the in-memory store.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime && entry.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Resolves the client IP from request headers or the request object.
 */
const getClientIp = (req: NextRequest): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  if ('ip' in req && typeof req.ip === 'string' && req.ip) {
    return req.ip;
  }
  return 'unknown';
};

/**
 * Predefined rate limiters for different endpoint types.
 */
export const rateLimiters = {
  api: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 120 }),
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 8 }),
  write: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 40 }),
  upload: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 6 }),
  search: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 60 }),
} as const;

export type RateLimiterKey = keyof typeof rateLimiters;

/**
 * Builds standard rate limit headers for the response.
 * 
 * @param limiter - The limiter instance used.
 * @param result - The result of the rate limit check.
 * @returns A record of headers.
 */
export const buildRateLimitHeaders = (
  limiter: RateLimiter,
  result: { remaining: number; resetTime: number }
): Record<string, string> => ({
  'X-RateLimit-Limit': limiter.getConfig().maxRequests.toString(),
  'X-RateLimit-Remaining': result.remaining.toString(),
  'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  'X-RateLimit-Window': limiter.getConfig().windowMs.toString(),
});

/**
 * Enforces a rate limit for a request.
 * Throws a rate limited error if the limit is exceeded.
 * 
 * @param req - The Next.js request object.
 * @param key - The key identifying which rate limiter to use.
 * @returns The rate limit headers if allowed.
 */
export const enforceRateLimit = async (
  req: NextRequest,
  key: RateLimiterKey
): Promise<{ headers: Record<string, string> }> => {
  const limiter = rateLimiters[key] ?? rateLimiters.api;
  const result = await limiter.check(req, key);
  const headers = buildRateLimitHeaders(limiter, result);
  if (!result.allowed) {
    const retryAfterMs = Math.max(0, result.resetTime - Date.now());
    throw rateLimitedError('Too many requests', retryAfterMs, {
      limit: limiter.getConfig().maxRequests,
      windowMs: limiter.getConfig().windowMs,
    });
  }
  return { headers };
};

// Periodic cleanup of the in-memory fallback store
if (typeof setInterval !== 'undefined') {
  safeSetInterval(
    (): void => {
      Object.values(rateLimiters).forEach((limiter: RateLimiter): void => limiter.cleanup());
    },
    5 * 60 * 1000
  );
}
