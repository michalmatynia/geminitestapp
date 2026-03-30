/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_THEME_CATALOG_KEY } from '@/shared/contracts/kangur';

vi.mock('server-only', () => ({}));

const { listKangurSettingsByKeysMock, upsertKangurSettingValueMock } = vi.hoisted(() => ({
  listKangurSettingsByKeysMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  listKangurSettingsByKeys: listKangurSettingsByKeysMock,
  upsertKangurSettingValue: upsertKangurSettingValueMock,
}));

describe('theme-catalog-source', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    listKangurSettingsByKeysMock.mockResolvedValue([]);
    upsertKangurSettingValueMock.mockResolvedValue(null);
  });

  it('returns the stored catalog without rewriting it when Mongo already has the key', async () => {
    const storedValue = '[{"id":"kangur-daily-bloom","name":"Daily Bloom","settings":{"primaryColor":"#123456"}}]';
    listKangurSettingsByKeysMock.mockResolvedValue([
      { key: KANGUR_THEME_CATALOG_KEY, value: storedValue },
    ]);

    const { ensureKangurThemeCatalogSeeded } = await import('./theme-catalog-source');

    await expect(ensureKangurThemeCatalogSeeded()).resolves.toEqual({
      key: KANGUR_THEME_CATALOG_KEY,
      value: storedValue,
    });
    expect(upsertKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('seeds the theme catalog into kangur_settings when it is missing', async () => {
    const { createKangurThemeCatalogSeedValue, ensureKangurThemeCatalogSeeded } = await import(
      './theme-catalog-source'
    );

    const result = await ensureKangurThemeCatalogSeeded();

    expect(result.key).toBe(KANGUR_THEME_CATALOG_KEY);
    expect(result.value).toBe(createKangurThemeCatalogSeedValue());
    expect(upsertKangurSettingValueMock).toHaveBeenCalledWith(
      KANGUR_THEME_CATALOG_KEY,
      createKangurThemeCatalogSeedValue()
    );
  });
});
