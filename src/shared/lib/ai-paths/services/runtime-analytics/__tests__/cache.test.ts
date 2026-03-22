import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('runtime analytics cache helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('builds stable cache keys for custom and bucketed ranges', async () => {
    const { buildSummaryCacheKey } = await import('../cache');

    expect(buildSummaryCacheKey(100, 250, 'custom')).toBe('custom:100:250');
    expect(buildSummaryCacheKey(100, 25_000, '24h')).toMatch(/^24h:\d+$/);
  });

  it('stores, reads, expires, and exposes stale summaries', async () => {
    const cacheModule = await import('../cache');

    const summary = {
      from: '2026-03-22T10:00:00.000Z',
      to: '2026-03-22T11:00:00.000Z',
      range: 'custom',
      storage: 'redis',
    } as never;

    cacheModule.setCachedSummary('cache-key', summary, 1_000);

    expect(cacheModule.readCachedSummary('cache-key', 1_001)).toBe(summary);
    expect(cacheModule.readStaleSummary('cache-key')).toBe(summary);

    cacheModule.summaryInFlight.set('cache-key', Promise.resolve(summary));
    expect(cacheModule.summaryInFlight.has('cache-key')).toBe(true);
    cacheModule.summaryInFlight.clear();

    expect(cacheModule.readCachedSummary('cache-key', 10_000)).toBeNull();
    expect(cacheModule.readStaleSummary('cache-key')).toBeNull();
  });
});
