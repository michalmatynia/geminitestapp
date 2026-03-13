import { DEFAULT_THEME, normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
};

/** Shared shape/layout overrides applied to both day and night themes. */
const KANGUR_SHAPE_OVERRIDES = {
  headingFont: 'system-ui, sans-serif',
  bodyFont: 'system-ui, sans-serif',
  maxContentWidth: 1440,
  gridGutter: 24,
  containerPaddingInner: 24,
  pagePadding: 32,
  pagePaddingTop: 40,
  pagePaddingRight: 32,
  pagePaddingBottom: 80,
  pagePaddingLeft: 32,
  containerRadius: 26,
  cardRadius: 26,
  btnRadius: 999,
  pillRadius: 20,
  pillPaddingX: 16,
  pillPaddingY: 10,
  pillFontSize: 14,
  btnPaddingX: 20,
  btnPaddingY: 10,
  btnFontSize: 14,
  inputHeight: 50,
  inputRadius: 22,
} as const;

/**
 * Default nightly theme — restored to commit 2d7d6e963.
 * Shape/layout overrides on top of DEFAULT_THEME; no explicit color overrides.
 * Used as the nightly reset target.
 */
export const KANGUR_DEFAULT_THEME: ThemeSettings = normalizeThemeSettings({
  ...DEFAULT_THEME,
  ...KANGUR_SHAPE_OVERRIDES,
});

/**
 * Default daily theme — restored to commit 2d7d6e963 baseline.
 * Shape/layout overrides on top of DEFAULT_THEME; no explicit color overrides.
 * Used as the daily reset target.
 */
export const KANGUR_DEFAULT_DAILY_THEME: ThemeSettings = normalizeThemeSettings({
  ...DEFAULT_THEME,
  ...KANGUR_SHAPE_OVERRIDES,
});

const KANGUR_LEGACY_DEFAULT_PATCH_KEYS: Array<keyof ThemeSettings> = [
  'headingFont',
  'bodyFont',
  'maxContentWidth',
  'pagePadding',
  'pagePaddingTop',
  'pagePaddingRight',
  'pagePaddingBottom',
  'pagePaddingLeft',
  'containerRadius',
  'cardRadius',
  'btnPaddingX',
  'btnPaddingY',
  'btnFontSize',
  'btnRadius',
  'pillRadius',
  'pillPaddingX',
  'pillPaddingY',
  'pillFontSize',
  'inputHeight',
  'inputRadius',
];

const applyKangurLegacyThemeBaseline = (theme: ThemeSettings): ThemeSettings => {
  const patched = { ...theme };
  const applyLegacyPatch = <Key extends keyof ThemeSettings>(key: Key): void => {
    if (patched[key] === DEFAULT_THEME[key]) {
      patched[key] = KANGUR_DEFAULT_THEME[key];
    }
  };

  KANGUR_LEGACY_DEFAULT_PATCH_KEYS.forEach((key) => {
    applyLegacyPatch(key);
  });

  return patched;
};

export const parseKangurThemeSettings = (
  raw: string | null | undefined
): ThemeSettings | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(raw, null);
  if (!parsed) {
    return null;
  }

  return applyKangurLegacyThemeBaseline(normalizeThemeSettings(parsed, KANGUR_DEFAULT_THEME));
};

export const getKangurThemeSettingsKeyForAppearanceMode = (
  mode: 'default' | 'dark'
): string => (mode === 'dark' ? KANGUR_NIGHTLY_THEME_SETTINGS_KEY : KANGUR_DAILY_THEME_SETTINGS_KEY);

export const resolveKangurThemeSettingsRawForMode = ({
  mode,
  dailyThemeRaw,
  nightlyThemeRaw,
  legacyThemeRaw,
}: {
  mode: 'default' | 'dark';
  dailyThemeRaw: string | null | undefined;
  nightlyThemeRaw: string | null | undefined;
  legacyThemeRaw: string | null | undefined;
}): string | null => {
  const slotThemeRaw = mode === 'dark' ? nightlyThemeRaw : dailyThemeRaw;
  return typeof slotThemeRaw === 'string' && slotThemeRaw.trim().length > 0
    ? slotThemeRaw
    : legacyThemeRaw?.trim()
      ? legacyThemeRaw
      : null;
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
