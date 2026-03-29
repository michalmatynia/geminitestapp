import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveRetryDelay } from './utils';

describe('resolveRetryDelay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns zero when retry backoff is disabled', () => {
    expect(resolveRetryDelay(3, { retryBackoffMs: 0 })).toBe(0);
  });

  it('applies exponential backoff capped by max', () => {
    expect(
      resolveRetryDelay(4, {
        retryBackoff: 'exponential',
        retryBackoffMs: 100,
        retryMaxBackoffMs: 500,
      })
    ).toBe(500);
  });

  it('adds bounded jitter when configured', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(
      resolveRetryDelay(2, {
        retryBackoff: 'fixed',
        retryBackoffMs: 200,
        retryMaxBackoffMs: 500,
        retryJitterRatio: 0.5,
      })
    ).toBe(250);
  });
});
