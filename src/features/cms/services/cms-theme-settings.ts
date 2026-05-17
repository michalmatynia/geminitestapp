import { cache } from 'react';
import { DEFAULT_THEME, type ThemeSettings } from '@/shared/contracts/cms-theme';
import { internalError } from '@/shared/errors/app-error';
import { fetchThemeSettings } from '@/features/cms/services/theme';

const CMS_THEME_SETTINGS_CACHE_TTL_MS = 30_000;

let cmsThemeSettingsCacheEntry: ThemeSettings | null = null;
let cmsThemeSettingsInFlight: Promise<ThemeSettings> | null = null;
let cmsThemeSettingsCacheInvalidationHandle: ReturnType<typeof setTimeout> | null = null;

const parseEnvNumber = (value: string | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const getCmsThemeSettingsReadTimeoutMs = (env: NodeJS.ProcessEnv = process.env): number | null => {
  const explicit = parseEnvNumber(env['CMS_THEME_SETTINGS_READ_TIMEOUT_MS']);
  if (explicit !== null && explicit > 0) return explicit;
  return env['NODE_ENV'] === 'development' ? 150 : null;
};

const awaitThemeSettingsWithinTimeout = async (
  promise: Promise<ThemeSettings>,
  timeoutMs: number | null,
  fallbackValue: ThemeSettings
): Promise<ThemeSettings> => {
  if (timeoutMs === null) return await promise;
  
  const state: { handle: ReturnType<typeof setTimeout> | null } = { handle: null };
  try {
    const timeoutPromise = new Promise<ThemeSettings>((resolve) => {
      state.handle = setTimeout(() => resolve(fallbackValue), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (state.handle !== null) {
      clearTimeout(state.handle);
    }
  }
};

const scheduleCmsThemeSettingsHotCacheInvalidation = (): void => {
  if (cmsThemeSettingsCacheInvalidationHandle !== null) {
    clearTimeout(cmsThemeSettingsCacheInvalidationHandle);
  }
  cmsThemeSettingsCacheInvalidationHandle = setTimeout(() => {
    cmsThemeSettingsCacheEntry = null;
    cmsThemeSettingsCacheInvalidationHandle = null;
  }, CMS_THEME_SETTINGS_CACHE_TTL_MS);
};

export const getCmsThemeSettings = cache(async (): Promise<ThemeSettings> => {
  if (cmsThemeSettingsCacheEntry) return cmsThemeSettingsCacheEntry;
  if (cmsThemeSettingsInFlight) return cmsThemeSettingsInFlight;

  const timeoutMs = getCmsThemeSettingsReadTimeoutMs();
  cmsThemeSettingsInFlight = awaitThemeSettingsWithinTimeout(
    fetchThemeSettings(),
    timeoutMs,
    DEFAULT_THEME
  )
    .then((value) => {
      cmsThemeSettingsCacheEntry = value;
      scheduleCmsThemeSettingsHotCacheInvalidation();
      return value;
    })
    .catch((error) => {
      throw internalError('Failed to fetch CMS theme settings.', {
        cause: error,
      });
    })
    .finally(() => {
      cmsThemeSettingsInFlight = null;
    });

  return await cmsThemeSettingsInFlight;
});

export const TEST_ONLY = {
  getCmsThemeSettingsReadTimeoutMs,
  scheduleCmsThemeSettingsHotCacheInvalidation,
};
