import { cache } from 'react';
import { DEFAULT_THEME, type ThemeSettings } from '@/shared/contracts/cms-theme';
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
  return explicit !== null && explicit > 0 ? explicit : (env['NODE_ENV'] === 'development' ? 150 : null);
};

const awaitThemeSettingsWithinTimeout = async (
  promise: Promise<ThemeSettings>,
  timeoutMs: number | null,
  fallbackValue: ThemeSettings
): Promise<ThemeSettings> => {
  if (timeoutMs === null) return await promise;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<ThemeSettings>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
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
  cmsThemeSettingsCacheInvalidationHandle.unref?.();
};

export const getCmsThemeSettings = cache(async (): Promise<ThemeSettings> => {
  if (cmsThemeSettingsCacheEntry) return cmsThemeSettingsCacheEntry;
  if (cmsThemeSettingsInFlight) return cmsThemeSettingsInFlight;

  cmsThemeSettingsInFlight = fetchThemeSettings()
    .then((value) => {
      cmsThemeSettingsCacheEntry = value;
      scheduleCmsThemeSettingsHotCacheInvalidation();
      return value;
    })
    .finally(() => {
      cmsThemeSettingsInFlight = null;
    });

  return await awaitThemeSettingsWithinTimeout(
    cmsThemeSettingsInFlight,
    getCmsThemeSettingsReadTimeoutMs(),
    cmsThemeSettingsCacheEntry ?? DEFAULT_THEME
  );
});

export const __testOnly = {
  getCmsThemeSettingsReadTimeoutMs,
  scheduleCmsThemeSettingsHotCacheInvalidation,
};
