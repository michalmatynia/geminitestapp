import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

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
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';

const KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TTL_MS = 30_000;

type KangurStorefrontInitialStateCacheEntry = {
  expiresAt: number;
  value: KangurStorefrontInitialState;
};

let kangurStorefrontInitialStateCacheEntry: KangurStorefrontInitialStateCacheEntry | null = null;
let kangurStorefrontInitialStateInFlight: Promise<KangurStorefrontInitialState> | null = null;

const createEmptyKangurStorefrontThemeSettings = (): KangurStorefrontInitialState['initialThemeSettings'] => ({
  default: null,
  dawn: null,
  sunset: null,
  dark: null,
});

export const getKangurStorefrontDefaultMode = async (): Promise<KangurStorefrontAppearanceMode> => {
  const raw = await getSettingValue(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  return parseKangurStorefrontAppearanceMode(raw);
};

const readKangurStorefrontThemeSettings = async (): Promise<
  KangurStorefrontInitialState['initialThemeSettings']
> => {
  try {
    const settings = await listKangurSettingsByKeys([
      KANGUR_DAILY_THEME_SETTINGS_KEY,
      KANGUR_DAWN_THEME_SETTINGS_KEY,
      KANGUR_SUNSET_THEME_SETTINGS_KEY,
      KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    ]);

    const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));

    return {
      default: settingsMap.get(KANGUR_DAILY_THEME_SETTINGS_KEY) ?? null,
      dawn: settingsMap.get(KANGUR_DAWN_THEME_SETTINGS_KEY) ?? null,
      sunset: settingsMap.get(KANGUR_SUNSET_THEME_SETTINGS_KEY) ?? null,
      dark: settingsMap.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY) ?? null,
    };
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return createEmptyKangurStorefrontThemeSettings();
    }
    throw error;
  }
};

const getKangurStorefrontInitialStateUncached = async (): Promise<KangurStorefrontInitialState> => {
  const [initialMode, initialThemeSettings] = await Promise.all([
    getKangurStorefrontDefaultMode(),
    readKangurStorefrontThemeSettings(),
  ]);

  return {
    initialMode,
    initialThemeSettings,
  };
};

const getKangurStorefrontInitialStateHotCached = async (): Promise<KangurStorefrontInitialState> => {
  const now = Date.now();
  if (
    kangurStorefrontInitialStateCacheEntry &&
    kangurStorefrontInitialStateCacheEntry.expiresAt > now
  ) {
    return kangurStorefrontInitialStateCacheEntry.value;
  }

  if (kangurStorefrontInitialStateInFlight) {
    return kangurStorefrontInitialStateInFlight;
  }

  kangurStorefrontInitialStateInFlight = getKangurStorefrontInitialStateUncached()
    .then((value) => {
      kangurStorefrontInitialStateCacheEntry = {
        value,
        expiresAt: Date.now() + KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      kangurStorefrontInitialStateInFlight = null;
    });

  return kangurStorefrontInitialStateInFlight;
};

export const getKangurStorefrontInitialState = cache(
  unstable_cache(
    getKangurStorefrontInitialStateHotCached,
    ['kangur-storefront-initial-state'],
    { revalidate: 300 }
  )
);
