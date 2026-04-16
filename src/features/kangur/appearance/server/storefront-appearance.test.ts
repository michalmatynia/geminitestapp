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

const {
  ensureKangurStorefrontAppearanceSettingsSeededMock,
  createKangurStorefrontAppearanceSeedSettingsMock,
  cacheLifeMock,
  cacheTagMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  ensureKangurStorefrontAppearanceSettingsSeededMock: vi.fn(),
  createKangurStorefrontAppearanceSeedSettingsMock: vi.fn(),
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock('./storefront-appearance-source', () => ({
  ensureKangurStorefrontAppearanceSettingsSeeded:
    ensureKangurStorefrontAppearanceSettingsSeededMock,
  createKangurStorefrontAppearanceSeedSettings:
    createKangurStorefrontAppearanceSeedSettingsMock,
}));

describe('storefront-appearance', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    const seedSettings = [
      { key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, value: 'default' },
      { key: KANGUR_DAILY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ffffff"}' },
      { key: KANGUR_DAWN_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#f9d7aa"}' },
      { key: KANGUR_SUNSET_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ff8800"}' },
      { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#111827"}' },
    ];
    ensureKangurStorefrontAppearanceSettingsSeededMock.mockResolvedValue(seedSettings);
    createKangurStorefrontAppearanceSeedSettingsMock.mockReturnValue(seedSettings);
  });

  it('reads the initial storefront mode and theme settings from Kangur settings storage', async () => {
    ensureKangurStorefrontAppearanceSettingsSeededMock.mockResolvedValue([
      { key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, value: 'sunset' },
      { key: KANGUR_DAILY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ffffff"}' },
      { key: KANGUR_DAWN_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ffe1b3"}' },
      { key: KANGUR_SUNSET_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ff8800"}' },
      { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#0f172a"}' },
    ]);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).resolves.toEqual({
      initialMode: 'sunset',
      initialThemeSettings: {
        default: '{"backgroundColor":"#ffffff"}',
        dawn: '{"backgroundColor":"#ffe1b3"}',
        sunset: '{"backgroundColor":"#ff8800"}',
        dark: '{"backgroundColor":"#0f172a"}',
      },
    });
  });

  it('falls back to seeded appearance settings when transient mongo reads fail', async () => {
    const transientError = new Error(
      'querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net'
    );
    transientError.name = 'MongoServerSelectionError';

    ensureKangurStorefrontAppearanceSettingsSeededMock.mockRejectedValue(transientError);
    createKangurStorefrontAppearanceSeedSettingsMock.mockReturnValue([
      { key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, value: 'default' },
      { key: KANGUR_DAILY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ffffff"}' },
      { key: KANGUR_DAWN_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#f9d7aa"}' },
      { key: KANGUR_SUNSET_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#ff8800"}' },
      { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY, value: '{"backgroundColor":"#111827"}' },
    ]);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).resolves.toEqual({
      initialMode: 'default',
      initialThemeSettings: {
        default: '{"backgroundColor":"#ffffff"}',
        dawn: '{"backgroundColor":"#f9d7aa"}',
        sunset: '{"backgroundColor":"#ff8800"}',
        dark: '{"backgroundColor":"#111827"}',
      },
    });
  });

  it('rethrows unexpected theme-settings failures', async () => {
    const error = new Error('invalid theme settings payload');
    ensureKangurStorefrontAppearanceSettingsSeededMock.mockRejectedValue(error);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).rejects.toThrow(
      'invalid theme settings payload'
    );
  });

  it('normalizes non-Error theme-settings failures before rethrowing them', async () => {
    ensureKangurStorefrontAppearanceSettingsSeededMock.mockRejectedValue(undefined);

    const { getKangurStorefrontInitialState } = await import('./storefront-appearance');

    await expect(getKangurStorefrontInitialState()).rejects.toThrow(
      'Failed to load Kangur storefront appearance settings.'
    );
  });

  it('invalidates the cached storefront snapshot for mode and theme writes', async () => {
    const {
      invalidateKangurStorefrontInitialStateCache,
      isKangurStorefrontInitialStateDependencyKey,
      KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG,
    } = await import('./storefront-appearance');

    expect(isKangurStorefrontInitialStateDependencyKey('kangur_storefront_default_mode_v1')).toBe(
      true
    );
    expect(isKangurStorefrontInitialStateDependencyKey('kangur_cms_theme_daily_v1')).toBe(true);
    expect(isKangurStorefrontInitialStateDependencyKey('unrelated_setting')).toBe(false);

    invalidateKangurStorefrontInitialStateCache();

    expect(revalidateTagMock).toHaveBeenCalledWith(
      KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG,
      'max'
    );
  });

});
