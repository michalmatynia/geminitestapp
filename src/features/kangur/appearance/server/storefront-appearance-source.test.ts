/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';

vi.mock('server-only', () => ({}));

const { listKangurSettingsByKeysMock, upsertKangurSettingValueMock } = vi.hoisted(() => ({
  listKangurSettingsByKeysMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  listKangurSettingsByKeys: listKangurSettingsByKeysMock,
  upsertKangurSettingValue: upsertKangurSettingValueMock,
}));

describe('storefront-appearance-source', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    listKangurSettingsByKeysMock.mockResolvedValue([]);
    upsertKangurSettingValueMock.mockResolvedValue(null);
  });

  it('returns stored appearance settings without rewriting them when Mongo already has every key', async () => {
    const storedSettings = [
      { key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, value: 'sunset' },
      { key: KANGUR_DAILY_THEME_SETTINGS_KEY, value: '{"accent":"daily"}' },
      { key: KANGUR_DAWN_THEME_SETTINGS_KEY, value: '{"accent":"dawn"}' },
      { key: KANGUR_SUNSET_THEME_SETTINGS_KEY, value: '{"accent":"sunset"}' },
      { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY, value: '{"accent":"nightly"}' },
    ];
    listKangurSettingsByKeysMock.mockResolvedValue(storedSettings);

    const {
      ensureKangurStorefrontAppearanceSettingsSeeded,
      KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS,
    } = await import('./storefront-appearance-source');

    await expect(ensureKangurStorefrontAppearanceSettingsSeeded()).resolves.toEqual(storedSettings);
    expect(listKangurSettingsByKeysMock).toHaveBeenCalledWith(
      KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS
    );
    expect(upsertKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('seeds missing appearance settings into kangur_settings and returns a complete snapshot', async () => {
    listKangurSettingsByKeysMock.mockResolvedValue([
      { key: KANGUR_DAILY_THEME_SETTINGS_KEY, value: '{"accent":"daily"}' },
    ]);

    const { ensureKangurStorefrontAppearanceSettingsSeeded } = await import(
      './storefront-appearance-source'
    );

    const result = await ensureKangurStorefrontAppearanceSettingsSeeded();
    const resultMap = new Map(result.map(({ key, value }) => [key, value]));

    expect(result).toHaveLength(5);
    expect(resultMap.get(KANGUR_DAILY_THEME_SETTINGS_KEY)).toBe('{"accent":"daily"}');
    expect(resultMap.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)).toBe('default');
    expect(resultMap.get(KANGUR_DAWN_THEME_SETTINGS_KEY)).toEqual(expect.any(String));
    expect(resultMap.get(KANGUR_SUNSET_THEME_SETTINGS_KEY)).toEqual(expect.any(String));
    expect(resultMap.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY)).toEqual(expect.any(String));
    expect(upsertKangurSettingValueMock).toHaveBeenCalledTimes(4);
    expect(upsertKangurSettingValueMock).toHaveBeenCalledWith(
      KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
      'default'
    );
  });
});
