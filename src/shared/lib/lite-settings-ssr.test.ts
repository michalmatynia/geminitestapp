import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  filterLiteSettingsForHydrationPayload,
  getLiteSettingsForHydration,
} from '@/shared/lib/lite-settings-ssr';

const prewarmLiteSettingsServerCacheMock = vi.hoisted(() => vi.fn());
const cloneLiteSettingsMock = vi.hoisted(() => vi.fn());
const getLiteSettingsCacheMock = vi.hoisted(() => vi.fn());
const originalNodeEnv = process.env['NODE_ENV'];

vi.mock('server-only', () => ({}));

vi.mock('@/shared/server/api/settings/lite/handler', () => ({
  prewarmLiteSettingsServerCache: prewarmLiteSettingsServerCacheMock,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  cloneLiteSettings: cloneLiteSettingsMock,
  getLiteSettingsCache: getLiteSettingsCacheMock,
}));

describe('lite-settings-ssr', () => {
  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    vi.useRealTimers();
    prewarmLiteSettingsServerCacheMock.mockReset();
    cloneLiteSettingsMock.mockReset();
    getLiteSettingsCacheMock.mockReset();

    prewarmLiteSettingsServerCacheMock.mockResolvedValue(undefined);
    cloneLiteSettingsMock.mockImplementation((rows: Array<{ key: string; value: string }>) =>
      rows.map((row) => ({ ...row }))
    );
  });

  it('prewarms the cache and returns a cloned hydration payload when cache data exists', async () => {
    const rows = [{ key: 'feature.enabled', value: 'true' }];
    getLiteSettingsCacheMock.mockReturnValue({ data: rows, ts: 1 });

    const result = await getLiteSettingsForHydration();

    expect(prewarmLiteSettingsServerCacheMock).not.toHaveBeenCalled();
    expect(getLiteSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(cloneLiteSettingsMock).toHaveBeenCalledWith(rows);
    expect(result).toEqual([{ key: 'feature.enabled', value: 'true' }]);
    expect(result).not.toBe(rows);
  });

  it('omits oversized rows from the SSR hydration payload', async () => {
    const rows = [
      { key: 'feature.enabled', value: 'true' },
      { key: 'filemaker_database_v1', value: 'x'.repeat(130_000) },
    ];
    getLiteSettingsCacheMock.mockReturnValue({ data: rows, ts: 1 });

    const result = await getLiteSettingsForHydration();

    expect(result).toEqual([{ key: 'feature.enabled', value: 'true' }]);
    expect(cloneLiteSettingsMock).toHaveBeenCalledWith(rows);
  });

  it('returns an empty array when the cache is empty after prewarm', async () => {
    getLiteSettingsCacheMock.mockReturnValue(null);

    await expect(getLiteSettingsForHydration()).resolves.toEqual([]);

    expect(cloneLiteSettingsMock).not.toHaveBeenCalled();
  });

  it('returns an empty array when prewarm throws', async () => {
    prewarmLiteSettingsServerCacheMock.mockRejectedValue(new Error('cache failed'));

    await expect(getLiteSettingsForHydration()).resolves.toEqual([]);
  });

  it('waits for the bounded prewarm window in development and returns cached rows when ready', async () => {
    process.env['NODE_ENV'] = 'development';
    const rows = [{ key: 'feature.enabled', value: 'true' }];
    getLiteSettingsCacheMock
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ data: rows, ts: 1 });
    prewarmLiteSettingsServerCacheMock.mockResolvedValue(undefined);

    await expect(getLiteSettingsForHydration()).resolves.toEqual(rows);

    expect(prewarmLiteSettingsServerCacheMock).toHaveBeenCalledTimes(1);
    expect(cloneLiteSettingsMock).toHaveBeenCalledWith(rows);
  });

  it('does not block hydration indefinitely when prewarm is slow', async () => {
    vi.useFakeTimers();
    prewarmLiteSettingsServerCacheMock.mockImplementation(
      () => new Promise<void>(() => undefined)
    );
    getLiteSettingsCacheMock.mockReturnValue(null);

    const hydrationPromise = getLiteSettingsForHydration();

    await vi.advanceTimersByTimeAsync(250);

    await expect(hydrationPromise).resolves.toEqual([]);
    expect(prewarmLiteSettingsServerCacheMock).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    if (typeof originalNodeEnv === 'string') {
      process.env['NODE_ENV'] = originalNodeEnv;
    } else {
      delete process.env['NODE_ENV'];
    }
  });
});

describe('filterLiteSettingsForHydrationPayload', () => {
  it('passes through rows that are within both size limits', () => {
    const rows = [
      { key: 'a', value: 'short' },
      { key: 'b', value: 'also-short' },
    ];
    expect(filterLiteSettingsForHydrationPayload(rows)).toEqual(rows);
  });

  it('skips a row whose value exceeds the per-record limit (128 000 chars)', () => {
    const rows = [
      { key: 'small', value: 'ok' },
      { key: 'huge', value: 'x'.repeat(128_001) },
      { key: 'also-small', value: 'ok' },
    ];
    expect(filterLiteSettingsForHydrationPayload(rows)).toEqual([
      { key: 'small', value: 'ok' },
      { key: 'also-small', value: 'ok' },
    ]);
  });

  it('stops including rows once the cumulative payload budget (512 000 chars) is reached', () => {
    // Each row value is 100 000 chars — three of them sum to 300 000, four to 400 000,
    // five to 500 000, six to 600 000 which exceeds the 512 000 limit.
    const big = 'x'.repeat(100_000);
    const rows = Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, value: big }));

    const result = filterLiteSettingsForHydrationPayload(rows);

    // 5 × (2-char key + 100 000-char value) = 5 × 100 002 = 500 010 chars  ≤ 512 000
    // 6th row would add 100 002 chars → 600 012  > 512 000 → skipped
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.key)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4']);
  });

  it('returns an empty array when every row is oversized', () => {
    const rows = [{ key: 'k', value: 'x'.repeat(200_000) }];
    expect(filterLiteSettingsForHydrationPayload(rows)).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    expect(filterLiteSettingsForHydrationPayload([])).toEqual([]);
  });
});
