import "server-only";

import type { NextRequest } from "next/server";
import { rateLimitedError } from "@/shared/errors/app-error";

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

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req: NextRequest): string => getClientIp(req),
      ...config,
    };
  }

  check(req: NextRequest): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  } {
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
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return (req as unknown as { ip?: string }).ip || "unknown";
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
  "X-RateLimit-Limit": limiter.getConfig().maxRequests.toString(),
  "X-RateLimit-Remaining": result.remaining.toString(),
  "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
  "X-RateLimit-Window": limiter.getConfig().windowMs.toString(),
});

export const enforceRateLimit = (
  req: NextRequest,
  key: RateLimiterKey
): { headers: Record<string, string> } | never => {
  const limiter = rateLimiters[key] ?? rateLimiters.api;
  const result = limiter.check(req);
  const headers = buildRateLimitHeaders(limiter, result);
  if (!result.allowed) {
    const retryAfterMs = Math.max(0, result.resetTime - Date.now());
    throw rateLimitedError("Too many requests", retryAfterMs, {
      limit: limiter.getConfig().maxRequests,
      windowMs: limiter.getConfig().windowMs,
    });
  }
  return { headers };
};

if (typeof setInterval !== "undefined") {
  setInterval((): void => {
    Object.values(rateLimiters).forEach((limiter: RateLimiter): void => limiter.cleanup());
  }, 5 * 60 * 1000);
}
