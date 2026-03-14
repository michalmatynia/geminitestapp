import { normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { KANGUR_DEFAULT_DAILY_THEME } from './themes/daily';
import { KANGUR_DEFAULT_DAWN_THEME } from './themes/dawn';
import { KANGUR_DEFAULT_SUNSET_THEME } from './themes/sunset';
import { KANGUR_NIGHTLY_THEME } from './themes/nightly';

export const KANGUR_DEFAULT_THEME = KANGUR_NIGHTLY_THEME;

export {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
};

// Re-export all themes
export * from './themes/factory';
export * from './themes/daily';
export * from './themes/dawn';
export * from './themes/sunset';
export * from './themes/nightly';
export * from './themes/others';

export const normalizeKangurThemeSettings = (
  raw: Partial<ThemeSettings> | null | undefined,
  baseline: ThemeSettings = KANGUR_DEFAULT_DAILY_THEME
): ThemeSettings => normalizeThemeSettings(raw ?? {}, baseline);

export const parseKangurThemeSettings = (
  raw: string | null | undefined,
  baseline: ThemeSettings = KANGUR_DEFAULT_DAILY_THEME
): ThemeSettings | null => {
  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(raw, null);
  if (!parsed) {
    return null;
  }

  return normalizeKangurThemeSettings(parsed, baseline);
};

export const getKangurThemeSettingsKeyForAppearanceMode = (
  mode: 'default' | 'dawn' | 'sunset' | 'dark'
): string => {
  switch (mode) {
    case 'dawn':
      return KANGUR_DAWN_THEME_SETTINGS_KEY;
    case 'sunset':
      return KANGUR_SUNSET_THEME_SETTINGS_KEY;
    case 'dark':
      return KANGUR_NIGHTLY_THEME_SETTINGS_KEY;
    default:
      return KANGUR_DAILY_THEME_SETTINGS_KEY;
  }
};

export const resolveKangurThemeSettingsRawForMode = ({
  mode,
  dailyThemeRaw,
  dawnThemeRaw,
  sunsetThemeRaw,
  nightlyThemeRaw,
  legacyThemeRaw,
}: {
  mode: 'default' | 'dawn' | 'sunset' | 'dark';
  dailyThemeRaw: string | null | undefined;
  dawnThemeRaw: string | null | undefined;
  sunsetThemeRaw: string | null | undefined;
  nightlyThemeRaw: string | null | undefined;
  legacyThemeRaw: string | null | undefined;
}): string | null => {
  const resolveThemeRaw = (raw: string | null | undefined): string | null =>
    typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
  const dailyRaw = resolveThemeRaw(dailyThemeRaw);
  const dawnRaw = resolveThemeRaw(dawnThemeRaw);
  const sunsetRaw = resolveThemeRaw(sunsetThemeRaw);
  const nightlyRaw = resolveThemeRaw(nightlyThemeRaw);
  const hasSlotTheme = Boolean(dailyRaw || dawnRaw || sunsetRaw || nightlyRaw);
  const legacyFallback = hasSlotTheme ? null : resolveThemeRaw(legacyThemeRaw);

  if (mode === 'dawn') {
    return dawnRaw;
  }
  if (mode === 'sunset') {
    return sunsetRaw;
  }
  if (mode === 'dark') {
    return nightlyRaw ?? legacyFallback;
  }

  return dailyRaw ?? legacyFallback;
};

export const resolveKangurDefaultThemeForMode = (
  mode: 'default' | 'dawn' | 'sunset' | 'dark'
): ThemeSettings => {
  switch (mode) {
    case 'dawn':
      return KANGUR_DEFAULT_DAWN_THEME;
    case 'sunset':
      return KANGUR_DEFAULT_SUNSET_THEME;
    case 'dark':
      return KANGUR_DEFAULT_THEME;
    case 'default':
    default:
      return KANGUR_DEFAULT_DAILY_THEME;
  }
};

// ─── Theme Catalog ───────────────────────────────────────────────────────────

export const KANGUR_THEME_CATALOG_KEY = 'kangur_cms_theme_catalog_v1';

export type KangurThemeCatalogEntry = {
  id: string;
  name: string;
  settings: ThemeSettings;
  createdAt: string;
  updatedAt: string;
};

export const parseKangurThemeCatalog = (
  raw: string | null | undefined
): KangurThemeCatalogEntry[] => {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is KangurThemeCatalogEntry =>
        e !== null &&
        typeof e === 'object' &&
        typeof (e as Record<string, unknown>)['id'] === 'string' &&
        typeof (e as Record<string, unknown>)['name'] === 'string'
    );
  } catch {
    return [];
  }
};
