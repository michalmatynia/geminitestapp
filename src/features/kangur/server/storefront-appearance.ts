import 'server-only';

import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontInitialState,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { listKangurSettingsByKeys } from '@/features/kangur/services/kangur-settings-repository';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur-settings-keys';
import { getSettingValue } from '@/shared/lib/ai/server-settings';

export const getKangurStorefrontDefaultMode = async (): Promise<KangurStorefrontAppearanceMode> => {
  const raw = await getSettingValue(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  return parseKangurStorefrontAppearanceMode(raw);
};

export const getKangurStorefrontInitialState = async (): Promise<KangurStorefrontInitialState> => {
  const [initialMode, settings] = await Promise.all([
    getKangurStorefrontDefaultMode(),
    listKangurSettingsByKeys([
      KANGUR_DAILY_THEME_SETTINGS_KEY,
      KANGUR_DAWN_THEME_SETTINGS_KEY,
      KANGUR_SUNSET_THEME_SETTINGS_KEY,
      KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    ]),
  ]);

  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    initialMode,
    initialThemeSettings: {
      default: settingsMap.get(KANGUR_DAILY_THEME_SETTINGS_KEY) ?? null,
      dawn: settingsMap.get(KANGUR_DAWN_THEME_SETTINGS_KEY) ?? null,
      sunset: settingsMap.get(KANGUR_SUNSET_THEME_SETTINGS_KEY) ?? null,
      dark: settingsMap.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY) ?? null,
    },
  };
};
