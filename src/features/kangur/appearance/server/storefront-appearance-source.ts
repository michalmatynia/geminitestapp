import 'server-only';

import type { SettingRecord } from '@/shared/contracts/settings';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur-settings-keys';
import { serializeSetting } from '@/shared/utils/settings-json';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/appearance/storefront-appearance-settings';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';

import { KANGUR_DEFAULT_DAILY_THEME } from '../../themes/daily';
import { KANGUR_DEFAULT_DAWN_THEME } from '../../themes/dawn';
import { KANGUR_NIGHTLY_THEME } from '../../themes/nightly';
import { KANGUR_DEFAULT_SUNSET_THEME } from '../../themes/sunset';

const KANGUR_STOREFRONT_SEED_MODE: KangurStorefrontAppearanceMode = 'default';

const hasStoredSettingValue = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export const KANGUR_STOREFRONT_APPEARANCE_SEED_SETTINGS: readonly SettingRecord[] = [
  {
    key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
    value: KANGUR_STOREFRONT_SEED_MODE,
  },
  {
    key: KANGUR_DAILY_THEME_SETTINGS_KEY,
    value: serializeSetting(KANGUR_DEFAULT_DAILY_THEME),
  },
  {
    key: KANGUR_DAWN_THEME_SETTINGS_KEY,
    value: serializeSetting(KANGUR_DEFAULT_DAWN_THEME),
  },
  {
    key: KANGUR_SUNSET_THEME_SETTINGS_KEY,
    value: serializeSetting(KANGUR_DEFAULT_SUNSET_THEME),
  },
  {
    key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    value: serializeSetting(KANGUR_NIGHTLY_THEME),
  },
] as const;

export const KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS =
  KANGUR_STOREFRONT_APPEARANCE_SEED_SETTINGS.map(({ key }) => key);

const KANGUR_STOREFRONT_APPEARANCE_SEED_MAP = new Map<string, string>(
  KANGUR_STOREFRONT_APPEARANCE_SEED_SETTINGS.map(({ key, value }) => [key, value])
);

export const createKangurStorefrontAppearanceSeedSettings = (): SettingRecord[] =>
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS.map((key) => ({
    key,
    value: KANGUR_STOREFRONT_APPEARANCE_SEED_MAP.get(key) ?? '',
  }));

export const ensureKangurStorefrontAppearanceSettingsSeeded = async (): Promise<
  SettingRecord[]
> => {
  const settings = await listKangurSettingsByKeys(KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS);
  const storedValues = new Map(settings.map(({ key, value }) => [key, value]));
  const missingSettings = KANGUR_STOREFRONT_APPEARANCE_SEED_SETTINGS.filter(
    ({ key }) => !hasStoredSettingValue(storedValues.get(key))
  );

  if (missingSettings.length > 0 && process.env['MONGODB_URI']) {
    await Promise.all(
      missingSettings.map(({ key, value }) => upsertKangurSettingValue(key, value))
    );
  }

  return KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS.map((key) => ({
    key,
    value: hasStoredSettingValue(storedValues.get(key))
      ? (storedValues.get(key) ?? '')
      : (KANGUR_STOREFRONT_APPEARANCE_SEED_MAP.get(key) ?? ''),
  }));
};
