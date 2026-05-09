export type RateLimiter = {
  wait(): Promise<void>;
};

export type RateLimiterOptions = {
  requestsPerMinute: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

import { safeSetTimeout } from '@/shared/lib/timers';

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => safeSetTimeout(resolve, Math.max(0, ms)));

export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  if (!Number.isFinite(options.requestsPerMinute) || options.requestsPerMinute <= 0) {
    // Rate limiter requires a positive number for requests per minute
    throw new Error('requestsPerMinute must be a positive number');
  }
  const intervalMs = 60_000 / options.requestsPerMinute;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  let nextAllowedAt = 0;

  return {
    async wait() {
      const current = now();
      const delay = nextAllowedAt - current;
      if (delay > 0) await sleep(delay);
      const afterSleep = now();
      nextAllowedAt = Math.max(afterSleep, nextAllowedAt) + intervalMs;
    },
  };
};
