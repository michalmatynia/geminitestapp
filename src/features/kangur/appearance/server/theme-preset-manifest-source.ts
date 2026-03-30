import 'server-only';

import { KANGUR_THEME_PRESET_MANIFEST_KEY } from '@/shared/contracts/kangur-settings-keys';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import type { SettingRecord } from '@/shared/contracts/settings';
import type { KangurThemePresetManifestEntry } from '@/features/kangur/appearance/theme-settings';

import {
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_NIGHTLY_ID,
  FACTORY_SUNSET_ID,
  PRESET_DAILY_CRYSTAL_ID,
  PRESET_NIGHTLY_CRYSTAL_ID,
} from '../admin/workspace/AppearancePage.constants';
import {
  KANGUR_DAILY_CRYSTAL_THEME,
  KANGUR_FACTORY_DAILY_THEME,
  KANGUR_FACTORY_DAWN_THEME,
  KANGUR_FACTORY_NIGHTLY_THEME,
  KANGUR_FACTORY_SUNSET_THEME,
  KANGUR_NIGHTLY_CRYSTAL_THEME,
} from '../theme-settings';

const KANGUR_THEME_PRESET_MANIFEST_SEED: KangurThemePresetManifestEntry[] = [
  {
    id: FACTORY_DAILY_ID,
    kind: 'factory',
    slot: 'daily',
    settings: KANGUR_FACTORY_DAILY_THEME,
  },
  {
    id: FACTORY_DAWN_ID,
    kind: 'factory',
    slot: 'dawn',
    settings: KANGUR_FACTORY_DAWN_THEME,
  },
  {
    id: FACTORY_SUNSET_ID,
    kind: 'factory',
    slot: 'sunset',
    settings: KANGUR_FACTORY_SUNSET_THEME,
  },
  {
    id: FACTORY_NIGHTLY_ID,
    kind: 'factory',
    slot: 'nightly',
    settings: KANGUR_FACTORY_NIGHTLY_THEME,
  },
  {
    id: PRESET_DAILY_CRYSTAL_ID,
    kind: 'preset',
    slot: 'daily',
    settings: KANGUR_DAILY_CRYSTAL_THEME,
  },
  {
    id: PRESET_NIGHTLY_CRYSTAL_ID,
    kind: 'preset',
    slot: 'nightly',
    settings: KANGUR_NIGHTLY_CRYSTAL_THEME,
  },
];

export const createKangurThemePresetManifestSeedValue = (): string =>
  serializeSetting(KANGUR_THEME_PRESET_MANIFEST_SEED);

export const createKangurThemePresetManifestSeedSetting = (): SettingRecord => ({
  key: KANGUR_THEME_PRESET_MANIFEST_KEY,
  value: createKangurThemePresetManifestSeedValue(),
});

export const ensureKangurThemePresetManifestSeeded = async (): Promise<SettingRecord> => {
  const [setting] = await listKangurSettingsByKeys([KANGUR_THEME_PRESET_MANIFEST_KEY]);

  if (setting?.value?.trim()) {
    return setting;
  }

  const seedValue = createKangurThemePresetManifestSeedValue();
  if (process.env['MONGODB_URI']) {
    await upsertKangurSettingValue(KANGUR_THEME_PRESET_MANIFEST_KEY, seedValue);
  }

  return {
    key: KANGUR_THEME_PRESET_MANIFEST_KEY,
    value: seedValue,
  };
};
