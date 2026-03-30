/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_THEME_PRESET_MANIFEST_KEY } from '@/shared/contracts/kangur';

vi.mock('server-only', () => ({}));

const { listKangurSettingsByKeysMock, upsertKangurSettingValueMock } = vi.hoisted(() => ({
  listKangurSettingsByKeysMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  listKangurSettingsByKeys: listKangurSettingsByKeysMock,
  upsertKangurSettingValue: upsertKangurSettingValueMock,
}));

describe('theme-preset-manifest-source', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    listKangurSettingsByKeysMock.mockResolvedValue([]);
    upsertKangurSettingValueMock.mockResolvedValue(null);
  });

  it('returns the stored manifest without rewriting it when Mongo already has the key', async () => {
    const storedValue = '[{"id":"factory_daily","kind":"factory","slot":"daily","settings":{"primaryColor":"#123456"}}]';
    listKangurSettingsByKeysMock.mockResolvedValue([
      { key: KANGUR_THEME_PRESET_MANIFEST_KEY, value: storedValue },
    ]);

    const { ensureKangurThemePresetManifestSeeded } = await import('./theme-preset-manifest-source');

    await expect(ensureKangurThemePresetManifestSeeded()).resolves.toEqual({
      key: KANGUR_THEME_PRESET_MANIFEST_KEY,
      value: storedValue,
    });
    expect(upsertKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('seeds the manifest into kangur_settings when it is missing', async () => {
    const {
      createKangurThemePresetManifestSeedValue,
      ensureKangurThemePresetManifestSeeded,
    } = await import('./theme-preset-manifest-source');

    const result = await ensureKangurThemePresetManifestSeeded();

    expect(result.key).toBe(KANGUR_THEME_PRESET_MANIFEST_KEY);
    expect(result.value).toBe(createKangurThemePresetManifestSeedValue());
    expect(upsertKangurSettingValueMock).toHaveBeenCalledWith(
      KANGUR_THEME_PRESET_MANIFEST_KEY,
      createKangurThemePresetManifestSeedValue()
    );
  });
});
