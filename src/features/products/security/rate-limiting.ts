import { NextRequest } from 'next/server';

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
  requests: number[];
};

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req: NextRequest): string => this.getClientIP(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  checkLimit(req: NextRequest): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  } {
    const key: string = this.config.keyGenerator(req);
    const now: number = Date.now();
    const windowStart: number = now - this.config.windowMs;

    let entry: RateLimitEntry | undefined = this.store.get(key);

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        requests: [],
      };
      this.store.set(key, entry);
    }

    // Clean old requests (sliding window)
    entry.requests = entry.requests.filter((time: number) => time > windowStart);
    entry.count = entry.requests.length;

    // Update reset time if window has passed
    if (now > entry.resetTime) {
      entry.resetTime = now + this.config.windowMs;
    }

    const allowed: boolean = entry.count < this.config.maxRequests;

    if (allowed) {
      entry.requests.push(now);
      entry.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalHits: entry.count,
    };
  }

  recordRequest(req: NextRequest, success: boolean): void {
    if (this.config.skipSuccessfulRequests && success) return;
    if (this.config.skipFailedRequests && !success) return;

    const key: string = this.config.keyGenerator(req);
    const entry: RateLimitEntry | undefined = this.store.get(key);

    if (entry) {
      entry.requests.push(Date.now());
      entry.count = entry.requests.length;
    }
  }

  private getClientIP(req: NextRequest): string {
    const forwarded: string | null = req.headers.get('x-forwarded-for');
    const realIP: string | null = req.headers.get('x-real-ip');

    if (forwarded) {
      const firstIp: string | undefined = forwarded.split(',')[0];
      return firstIp ? firstIp.trim() : 'unknown';
    }

    if (realIP) {
      return realIP;
    }

    // Fallback if req.ip is not available or is undefined
    return (req as unknown as { ip?: string }).ip || 'unknown';
  }

  cleanup(): void {
    const now: number = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime && entry.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }

  getStats(): {
    totalKeys: number;
    memoryUsage: number;
  } {
    return {
      totalKeys: this.store.size,
      memoryUsage: JSON.stringify([...this.store.entries()]).length,
    };
  }

  getConfig(): Required<RateLimitConfig> {
    return this.config;
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // General API endpoints
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  // Product creation (more restrictive)
  productCreate: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  }),

  // Image upload (very restrictive)
  imageUpload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
  }),

  // Search endpoints
  search: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),

  // Authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
  }),
} satisfies Record<string, RateLimiter>;

// Rate limiting middleware
export function withRateLimit(limiter: RateLimiter): (req: NextRequest) => Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  status?: number;
  message?: string;
}> {
  return (
    req: NextRequest
  ): Promise<{
    allowed: boolean;
    headers: Record<string, string>;
    status?: number;
    message?: string;
  }> => {
    const result = limiter.checkLimit(req);
    const config = limiter.getConfig();

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Window': config.windowMs.toString(),
    };

    if (!result.allowed) {
      return Promise.resolve({
        allowed: false,
        headers: {
          ...headers,
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
        status: 429,
        message: 'Too many requests',
      });
    }

    return Promise.resolve({
      allowed: true,
      headers,
    });
  };
}

// Cleanup task (run periodically)
if (typeof setInterval !== 'undefined') {
  setInterval(
    (): void => {
      Object.values(rateLimiters).forEach((limiter: RateLimiter): void => limiter.cleanup());
    },
    5 * 60 * 1000
  ); // Every 5 minutes
}
