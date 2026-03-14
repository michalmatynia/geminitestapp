import {
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
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
import { KANGUR_DAILY_CRYSTAL_THEME, KANGUR_NIGHTLY_CRYSTAL_THEME } from './themes/others';

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

const DAILY_CRYSTAL_PRESET_ID = 'kangur-daily-crystal';
const NIGHTLY_CRYSTAL_PRESET_ID = 'kangur-nightly-crystal';
const DAILY_CRYSTAL_BUTTON_DEFAULTS = {
  btnPrimaryBg: KANGUR_DAILY_CRYSTAL_THEME.btnPrimaryBg,
  btnPrimaryText: KANGUR_DAILY_CRYSTAL_THEME.btnPrimaryText,
  btnSecondaryBg: KANGUR_DAILY_CRYSTAL_THEME.btnSecondaryBg,
  btnSecondaryText: KANGUR_DAILY_CRYSTAL_THEME.btnSecondaryText,
  btnOutlineBorder: KANGUR_DAILY_CRYSTAL_THEME.btnOutlineBorder,
  btnBorderWidth: KANGUR_DAILY_CRYSTAL_THEME.btnBorderWidth,
  btnBorderOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnBorderOpacity,
  btnBorderRadius: KANGUR_DAILY_CRYSTAL_THEME.btnBorderRadius,
  btnShadowOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnShadowOpacity,
  btnShadowX: KANGUR_DAILY_CRYSTAL_THEME.btnShadowX,
  btnShadowY: KANGUR_DAILY_CRYSTAL_THEME.btnShadowY,
  btnShadowBlur: KANGUR_DAILY_CRYSTAL_THEME.btnShadowBlur,
  btnGlossOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnGlossOpacity,
  btnGlossHeight: KANGUR_DAILY_CRYSTAL_THEME.btnGlossHeight,
  btnGlossAngle: KANGUR_DAILY_CRYSTAL_THEME.btnGlossAngle,
  btnInsetHighlightOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnInsetHighlightOpacity,
  btnInsetShadowOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnInsetShadowOpacity,
  btnInsetShadowBlur: KANGUR_DAILY_CRYSTAL_THEME.btnInsetShadowBlur,
  btnInsetShadowY: KANGUR_DAILY_CRYSTAL_THEME.btnInsetShadowY,
  btnTextShadowOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnTextShadowOpacity,
  btnTextShadowY: KANGUR_DAILY_CRYSTAL_THEME.btnTextShadowY,
  btnTextShadowBlur: KANGUR_DAILY_CRYSTAL_THEME.btnTextShadowBlur,
  btnGlowOpacity: KANGUR_DAILY_CRYSTAL_THEME.btnGlowOpacity,
  btnGlowSpread: KANGUR_DAILY_CRYSTAL_THEME.btnGlowSpread,
};

const LEGACY_BASELINE_KEYS: Array<keyof ThemeSettings> = [
  'headingFont',
  'bodyFont',
  'maxContentWidth',
  'gridGutter',
  'pagePadding',
  'pagePaddingTop',
  'pagePaddingRight',
  'pagePaddingBottom',
  'pagePaddingLeft',
  'containerRadius',
  'containerPaddingInner',
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

const normalizeThemePreset = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeCssComparisonValue = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.replace(/\s+/g, '').toLowerCase() : '';

const normalizeColorValue = (value: string | null | undefined): string => {
  const normalized = normalizeCssComparisonValue(value);
  const hexMatch = normalized.match(/^#([0-9a-f]{3})$/);
  if (hexMatch) {
    const channels = hexMatch[1]!.split('');
    return `#${channels.map((channel) => channel + channel).join('')}`;
  }
  return normalized;
};

const matchesLegacyNumber = (value: number, target: number, epsilon = 1e-3): boolean =>
  Math.abs(value - target) <= epsilon;

const matchesLegacyCss = (value: string, target: string): boolean =>
  normalizeCssComparisonValue(value) === normalizeCssComparisonValue(target);

const matchesLegacyColor = (value: string, target: string): boolean =>
  normalizeColorValue(value) === normalizeColorValue(target);

const isDailyCrystalTheme = (theme: ThemeSettings): boolean =>
  normalizeThemePreset(theme.themePreset) === DAILY_CRYSTAL_PRESET_ID;

const applyKangurLegacyThemeBaseline = (theme: ThemeSettings): ThemeSettings => {
  const updates: Partial<ThemeSettings> = {};
  LEGACY_BASELINE_KEYS.forEach((key) => {
    const currentValue = theme[key];
    const legacyValue = DEFAULT_THEME[key];
    const replacementValue = KANGUR_DEFAULT_THEME[key];
    if (typeof currentValue === 'number' && typeof legacyValue === 'number') {
      if (matchesLegacyNumber(currentValue, legacyValue)) {
        updates[key] = replacementValue as ThemeSettings[typeof key];
      }
      return;
    }
    if (currentValue === legacyValue) {
      updates[key] = replacementValue as ThemeSettings[typeof key];
    }
  });

  return Object.keys(updates).length > 0 ? { ...theme, ...updates } : theme;
};

const applyDailyCrystalButtonUpgrade = (theme: ThemeSettings): ThemeSettings => {
  if (!isDailyCrystalTheme(theme)) {
    return theme;
  }

  const updates: Partial<ThemeSettings> = {};

  const shouldUpgradePrimaryText = matchesLegacyColor(
    theme.btnPrimaryText,
    DEFAULT_THEME.btnPrimaryText
  );
  const shouldUpgradeSecondaryText = matchesLegacyColor(
    theme.btnSecondaryText,
    DEFAULT_THEME.btnSecondaryText
  );
  const shouldUpgradePrimaryBg =
    matchesLegacyCss(theme.btnPrimaryBg, DEFAULT_THEME.btnPrimaryBg) ||
    matchesLegacyCss(theme.btnPrimaryBg, KANGUR_DEFAULT_DAILY_THEME.btnPrimaryBg);
  const shouldUpgradeSecondaryBg =
    matchesLegacyCss(theme.btnSecondaryBg, DEFAULT_THEME.btnSecondaryBg) ||
    matchesLegacyCss(theme.btnSecondaryBg, KANGUR_DEFAULT_DAILY_THEME.btnSecondaryBg);
  const shouldUpgradeOutline =
    matchesLegacyColor(theme.btnOutlineBorder, DEFAULT_THEME.btnOutlineBorder) ||
    matchesLegacyColor(theme.btnOutlineBorder, KANGUR_DEFAULT_DAILY_THEME.btnOutlineBorder);

  if (shouldUpgradePrimaryText) updates.btnPrimaryText = DAILY_CRYSTAL_BUTTON_DEFAULTS.btnPrimaryText;
  if (shouldUpgradeSecondaryText || matchesLegacyColor(theme.btnSecondaryText, DEFAULT_THEME.btnPrimaryText))
    updates.btnSecondaryText = DAILY_CRYSTAL_BUTTON_DEFAULTS.btnSecondaryText;
  if (shouldUpgradePrimaryBg) updates.btnPrimaryBg = DAILY_CRYSTAL_BUTTON_DEFAULTS.btnPrimaryBg;
  if (shouldUpgradeSecondaryBg)
    updates.btnSecondaryBg = DAILY_CRYSTAL_BUTTON_DEFAULTS.btnSecondaryBg;
  if (shouldUpgradeOutline)
    updates.btnOutlineBorder = DAILY_CRYSTAL_BUTTON_DEFAULTS.btnOutlineBorder;

  const numericUpgrades: Array<keyof typeof DAILY_CRYSTAL_BUTTON_DEFAULTS> = [
    'btnBorderWidth',
    'btnBorderOpacity',
    'btnBorderRadius',
    'btnShadowOpacity',
    'btnShadowX',
    'btnShadowY',
    'btnShadowBlur',
    'btnGlossOpacity',
    'btnGlossHeight',
    'btnGlossAngle',
    'btnInsetHighlightOpacity',
    'btnInsetShadowOpacity',
    'btnInsetShadowBlur',
    'btnInsetShadowY',
    'btnTextShadowOpacity',
    'btnTextShadowY',
    'btnTextShadowBlur',
    'btnGlowOpacity',
    'btnGlowSpread',
  ];

  numericUpgrades.forEach((key) => {
    const currentValue = theme[key];
    const legacyValue = DEFAULT_THEME[key];
    if (typeof currentValue === 'number' && typeof legacyValue === 'number') {
      if (matchesLegacyNumber(currentValue, legacyValue)) {
        updates[key] = DAILY_CRYSTAL_BUTTON_DEFAULTS[key] as ThemeSettings[typeof key];
      }
    }
  });

  return Object.keys(updates).length > 0 ? { ...theme, ...updates } : theme;
};

export const normalizeKangurThemeSettings = (
  raw: Partial<ThemeSettings> | null | undefined,
  baseline: ThemeSettings = KANGUR_DEFAULT_DAILY_THEME
): ThemeSettings => {
  const preset = normalizeThemePreset(raw?.themePreset);
  const resolvedBaseline =
    preset === DAILY_CRYSTAL_PRESET_ID ? KANGUR_DAILY_CRYSTAL_THEME
    : preset === NIGHTLY_CRYSTAL_PRESET_ID ? KANGUR_NIGHTLY_CRYSTAL_THEME
    : baseline;
  const normalized = normalizeThemeSettings(raw ?? {}, resolvedBaseline);
  return applyDailyCrystalButtonUpgrade(applyKangurLegacyThemeBaseline(normalized));
};

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
