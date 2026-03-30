import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';

const prewarmLiteSettingsServerCacheMock = vi.hoisted(() => vi.fn());
const cloneLiteSettingsMock = vi.hoisted(() => vi.fn());
const getLiteSettingsCacheMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/app/api/settings/lite/handler', () => ({
  prewarmLiteSettingsServerCache: prewarmLiteSettingsServerCacheMock,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  cloneLiteSettings: cloneLiteSettingsMock,
  getLiteSettingsCache: getLiteSettingsCacheMock,
}));

describe('lite-settings-ssr', () => {
  beforeEach(() => {
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

    expect(prewarmLiteSettingsServerCacheMock).toHaveBeenCalledTimes(1);
    expect(getLiteSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(cloneLiteSettingsMock).toHaveBeenCalledWith(rows);
    expect(result).toEqual([{ key: 'feature.enabled', value: 'true' }]);
    expect(result).not.toBe(rows);
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
});
