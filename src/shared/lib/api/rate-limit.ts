import 'server-only';

import { rateLimitedError } from '@/shared/errors/app-error';
import { closeRedisClient, getRedisClient } from '@/shared/lib/redis';
import { safeSetInterval } from '@/shared/lib/timers';
import { logger } from '@/shared/utils/logger';

import type { NextRequest } from 'next/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
  requests: number[];
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
};

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

const REDIS_RATE_LIMIT_TIMEOUT_MS = (() => {
  const raw = process.env['REDIS_RATE_LIMIT_TIMEOUT_MS'];
  if (!raw) return 400;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 400;
  return parsed;
})();

const REDIS_RATE_LIMIT_COOLDOWN_MS = (() => {
  const raw = process.env['REDIS_RATE_LIMIT_COOLDOWN_MS'];
  if (!raw) return 30_000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30_000;
  return parsed;
})();

let redisRateLimitDisabledUntilMs = 0;

const isRedisRateLimitTemporarilyDisabled = (now: number): boolean =>
  redisRateLimitDisabledUntilMs > now;

const disableRedisRateLimitTemporarily = (now: number): void => {
  redisRateLimitDisabledUntilMs = now + REDIS_RATE_LIMIT_COOLDOWN_MS;
  void closeRedisClient().catch((error) => {
    void ErrorSystem.captureException(error);
  });
};

const withRedisRateLimitTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Redis rate limit timed out after ${REDIS_RATE_LIMIT_TIMEOUT_MS}ms`));
        }, REDIS_RATE_LIMIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req: NextRequest): string => getClientIp(req),
      ...config,
    };
  }

  async check(req: NextRequest, prefix: string): Promise<RateLimitResult> {
    const key = `${prefix}:${this.config.keyGenerator(req)}`;
    const now = Date.now();

    if (isRedisRateLimitTemporarilyDisabled(now)) {
      return this.checkInMemory(req);
    }

    const redis = getRedisClient();

    if (redis) {
      try {
        const requestId = `${now}-${Math.random()}`;

        // Use Lua script for atomic execution
        const results = (await withRedisRateLimitTimeout(
          redis.eval(
            RATE_LIMIT_LUA_SCRIPT,
            1,
            key,
            now.toString(),
            this.config.windowMs.toString(),
            this.config.maxRequests.toString(),
            requestId
          )
        )) as [number, number];

        const [allowed, remaining] = results;
        redisRateLimitDisabledUntilMs = 0;

        return {
          allowed: allowed === 1,
          remaining: remaining ?? 0,
          resetTime: now + this.config.windowMs,
          totalHits: this.config.maxRequests - (remaining ?? 0),
        };
      } catch (error) {
        disableRedisRateLimitTemporarily(now);
        void ErrorSystem.captureException(error);
        logger.warn('[rate-limit] Redis failure, falling back to memory', { error });
      }
    }

    return this.checkInMemory(req);
  }

  private checkInMemory(req: NextRequest): RateLimitResult {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { count: 0, resetTime: now + this.config.windowMs, requests: [] };
      this.store.set(key, entry);
    }

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

  getConfig(): Required<RateLimitConfig> {
    return this.config;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime && entry.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

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

export const rateLimiters = {
  api: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 120 }),
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 8 }),
  write: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 40 }),
  upload: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 6 }),
  search: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 60 }),
} as const;

export type RateLimiterKey = keyof typeof rateLimiters;

export const buildRateLimitHeaders = (
  limiter: RateLimiter,
  result: { remaining: number; resetTime: number }
): Record<string, string> => ({
  'X-RateLimit-Limit': limiter.getConfig().maxRequests.toString(),
  'X-RateLimit-Remaining': result.remaining.toString(),
  'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  'X-RateLimit-Window': limiter.getConfig().windowMs.toString(),
});

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

export const resetRedisRateLimitFallbackState = (): void => {
  redisRateLimitDisabledUntilMs = 0;
};

if (typeof setInterval !== 'undefined') {
  safeSetInterval(
    (): void => {
      Object.values(rateLimiters).forEach((limiter: RateLimiter): void => limiter.cleanup());
    },
    5 * 60 * 1000
  );
}
