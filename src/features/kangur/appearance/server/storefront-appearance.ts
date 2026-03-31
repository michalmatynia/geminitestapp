import 'server-only';

import { revalidateTag, unstable_cache } from 'next/cache';
import { cache } from 'react';

import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontInitialState,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur-settings-keys';
import type { SettingRecord } from '@/shared/contracts/settings';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';

import {
  createKangurStorefrontAppearanceSeedSettings,
  ensureKangurStorefrontAppearanceSettingsSeeded,
} from './storefront-appearance-source';

export { KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS } from './storefront-appearance-source';

const KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TTL_MS = 30_000;
export const KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG = 'kangur-storefront-initial-state';
const KANGUR_STOREFRONT_APPEARANCE_LOAD_ERROR_MESSAGE =
  'Failed to load Kangur storefront appearance settings.';
const KANGUR_STOREFRONT_INITIAL_STATE_DEPENDENCY_KEYS = new Set<string>([
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
]);

type KangurStorefrontInitialStateCacheEntry = {
  expiresAt: number;
  value: KangurStorefrontInitialState;
};

let kangurStorefrontInitialStateCacheEntry: KangurStorefrontInitialStateCacheEntry | null = null;
let kangurStorefrontInitialStateInFlight: Promise<KangurStorefrontInitialState> | null = null;

const normalizeKangurStorefrontAppearanceLoadError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    const normalizedError = new Error(error.message);
    normalizedError.cause = error;
    return normalizedError;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error);
  }

  const normalizedError = new Error(KANGUR_STOREFRONT_APPEARANCE_LOAD_ERROR_MESSAGE);
  normalizedError.cause = error;
  return normalizedError;
};

const clearKangurStorefrontInitialStateHotCache = (): void => {
  kangurStorefrontInitialStateCacheEntry = null;
  kangurStorefrontInitialStateInFlight = null;
};

export const isKangurStorefrontInitialStateDependencyKey = (key: string): boolean =>
  KANGUR_STOREFRONT_INITIAL_STATE_DEPENDENCY_KEYS.has(key);

export const invalidateKangurStorefrontInitialStateCache = (): void => {
  clearKangurStorefrontInitialStateHotCache();
  revalidateTag(KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG, 'max');
};

const createKangurStorefrontThemeSettings = (
  settings: SettingRecord[]
): KangurStorefrontInitialState['initialThemeSettings'] => {
  const settingsMap = new Map(settings.map(({ key, value }) => [key, value]));

  return {
    default: settingsMap.get(KANGUR_DAILY_THEME_SETTINGS_KEY) ?? null,
    dawn: settingsMap.get(KANGUR_DAWN_THEME_SETTINGS_KEY) ?? null,
    sunset: settingsMap.get(KANGUR_SUNSET_THEME_SETTINGS_KEY) ?? null,
    dark: settingsMap.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY) ?? null,
  };
};

const readKangurStorefrontAppearanceSettings = async (): Promise<SettingRecord[]> => {
  try {
    return await ensureKangurStorefrontAppearanceSettingsSeeded();
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return createKangurStorefrontAppearanceSeedSettings();
    }
    throw normalizeKangurStorefrontAppearanceLoadError(error);
  }
};

export const getKangurStorefrontDefaultMode = async (): Promise<KangurStorefrontAppearanceMode> => {
  const settings = await readKangurStorefrontAppearanceSettings();
  const settingsMap = new Map(settings.map(({ key, value }) => [key, value]));
  return parseKangurStorefrontAppearanceMode(
    settingsMap.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)
  );
};

const getKangurStorefrontInitialStateUncached = async (): Promise<KangurStorefrontInitialState> => {
  const settings = await readKangurStorefrontAppearanceSettings();
  const settingsMap = new Map(settings.map(({ key, value }) => [key, value]));
  const initialMode = parseKangurStorefrontAppearanceMode(
    settingsMap.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)
  );
  const initialThemeSettings = createKangurStorefrontThemeSettings(settings);

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
    [KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG],
    {
      revalidate: 300,
      tags: [KANGUR_STOREFRONT_INITIAL_STATE_CACHE_TAG],
    }
  )
);
