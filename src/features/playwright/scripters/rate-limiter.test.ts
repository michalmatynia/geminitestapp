import { describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from './rate-limiter';

describe('createRateLimiter', () => {
  it('does not wait on the first call', async () => {
    const sleep = vi.fn(async () => {});
    const limiter = createRateLimiter({ requestsPerMinute: 60, now: () => 0, sleep });
    await limiter.wait();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('enforces the interval between calls', async () => {
    let currentTime = 0;
    const sleep = vi.fn(async (ms: number) => {
      currentTime += ms;
    });
    const limiter = createRateLimiter({
      requestsPerMinute: 60,
      now: () => currentTime,
      sleep,
    });
    await limiter.wait();
    await limiter.wait();
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it('skips sleep when the interval has already elapsed', async () => {
    let currentTime = 0;
    const sleep = vi.fn(async () => {});
    const limiter = createRateLimiter({
      requestsPerMinute: 60,
      now: () => currentTime,
      sleep,
    });
    await limiter.wait();
    currentTime += 5_000;
    await limiter.wait();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('rejects invalid configurations', () => {
    expect(() => createRateLimiter({ requestsPerMinute: 0 })).toThrow();
    expect(() => createRateLimiter({ requestsPerMinute: -1 })).toThrow();
  });
});
