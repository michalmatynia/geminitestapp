import {
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_THEME_PRESET_MANIFEST_KEY,
} from '@/shared/contracts/kangur-settings-keys';
import { parseJsonSetting } from '@/features/kangur/utils/settings-json';

import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { KANGUR_DEFAULT_DAILY_THEME } from './themes/daily';
import { KANGUR_DEFAULT_DAWN_THEME } from './themes/dawn';
import { KANGUR_DEFAULT_SUNSET_THEME } from './themes/sunset';
import { KANGUR_NIGHTLY_THEME } from './themes/nightly';
import { KANGUR_DAILY_CRYSTAL_THEME, KANGUR_NIGHTLY_CRYSTAL_THEME } from './themes/others';

export const KANGUR_DEFAULT_THEME = KANGUR_NIGHTLY_THEME;
export type KangurThemeMode = 'daily' | 'dawn' | 'sunset' | 'nightly';

export {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  KANGUR_THEME_PRESET_MANIFEST_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
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
  const setUpdate = (key: keyof ThemeSettings, value: ThemeSettings[keyof ThemeSettings]): void => {
    (updates as Record<string, ThemeSettings[keyof ThemeSettings]>)[key] = value;
  };

  LEGACY_BASELINE_KEYS.forEach((key) => {
    const currentValue = theme[key];
    const legacyValue = DEFAULT_THEME[key];
    const replacementValue = KANGUR_DEFAULT_THEME[key];
    if (replacementValue === undefined) return;
    if (typeof currentValue === 'number' && typeof legacyValue === 'number') {
      if (matchesLegacyNumber(currentValue, legacyValue)) {
        setUpdate(key, replacementValue);
      }
      return;
    }
    if (currentValue === legacyValue) {
      setUpdate(key, replacementValue);
    }
  });

  return Object.keys(updates).length > 0 ? { ...theme, ...updates } : theme;
};

const applyDailyCrystalButtonUpgrade = (theme: ThemeSettings): ThemeSettings => {
  if (!isDailyCrystalTheme(theme)) {
    return theme;
  }

  const updates: Partial<ThemeSettings> = {};
  const setUpdate = (key: keyof ThemeSettings, value: ThemeSettings[keyof ThemeSettings]): void => {
    (updates as Record<string, ThemeSettings[keyof ThemeSettings]>)[key] = value;
  };

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
        const replacementValue = DAILY_CRYSTAL_BUTTON_DEFAULTS[key];
        if (replacementValue !== undefined) {
          setUpdate(key, replacementValue);
        }
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
}: {
  mode: 'default' | 'dawn' | 'sunset' | 'dark';
  dailyThemeRaw: string | null | undefined;
  dawnThemeRaw: string | null | undefined;
  sunsetThemeRaw: string | null | undefined;
  nightlyThemeRaw: string | null | undefined;
}): string | null => {
  const resolveThemeRaw = (raw: string | null | undefined): string | null =>
    typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
  const dailyRaw = resolveThemeRaw(dailyThemeRaw);
  const dawnRaw = resolveThemeRaw(dawnThemeRaw);
  const sunsetRaw = resolveThemeRaw(sunsetThemeRaw);
  const nightlyRaw = resolveThemeRaw(nightlyThemeRaw);

  if (mode === 'dawn') {
    return dawnRaw;
  }
  if (mode === 'sunset') {
    return sunsetRaw;
  }
  if (mode === 'dark') {
    return nightlyRaw;
  }

  return dailyRaw;
};

export const resolveKangurStoredThemeSnapshot = ({
  dailyThemeRaw,
  dawnThemeRaw,
  sunsetThemeRaw,
  nightlyThemeRaw,
}: {
  dailyThemeRaw: string | null | undefined;
  dawnThemeRaw: string | null | undefined;
  sunsetThemeRaw: string | null | undefined;
  nightlyThemeRaw: string | null | undefined;
}): Record<KangurThemeMode, ThemeSettings> => ({
  daily:
    parseKangurThemeSettings(dailyThemeRaw, KANGUR_DEFAULT_DAILY_THEME) ??
    KANGUR_DEFAULT_DAILY_THEME,
  dawn:
    parseKangurThemeSettings(dawnThemeRaw, KANGUR_DEFAULT_DAWN_THEME) ??
    KANGUR_DEFAULT_DAWN_THEME,
  sunset:
    parseKangurThemeSettings(sunsetThemeRaw, KANGUR_DEFAULT_SUNSET_THEME) ??
    KANGUR_DEFAULT_SUNSET_THEME,
  nightly:
    parseKangurThemeSettings(nightlyThemeRaw, KANGUR_DEFAULT_THEME) ??
    KANGUR_DEFAULT_THEME,
});

export const resolveKangurStoredThemeForAppearanceMode = ({
  mode,
  dailyThemeRaw,
  dawnThemeRaw,
  sunsetThemeRaw,
  nightlyThemeRaw,
}: {
  mode: 'default' | 'dawn' | 'sunset' | 'dark';
  dailyThemeRaw: string | null | undefined;
  dawnThemeRaw: string | null | undefined;
  sunsetThemeRaw: string | null | undefined;
  nightlyThemeRaw: string | null | undefined;
}): ThemeSettings => {
  const snapshot = resolveKangurStoredThemeSnapshot({
    dailyThemeRaw,
    dawnThemeRaw,
    sunsetThemeRaw,
    nightlyThemeRaw,
  });

  if (mode === 'dawn') {
    return snapshot.dawn;
  }
  if (mode === 'sunset') {
    return snapshot.sunset;
  }
  if (mode === 'dark') {
    return snapshot.nightly;
  }

  return snapshot.daily;
};

// ─── Theme Catalog ───────────────────────────────────────────────────────────

export type KangurThemePresetKind = 'factory' | 'preset';

export type KangurThemePresetManifestEntry = {
  id: string;
  kind: KangurThemePresetKind;
  slot: KangurThemeMode;
  settings: ThemeSettings;
};

export type KangurStoredThemeSelection = {
  settings: ThemeSettings;
  source: 'catalog' | 'manifest';
};

export type KangurThemeCatalogEntry = {
  id: string;
  name: string;
  settings: ThemeSettings;
  createdAt: string;
  updatedAt: string;
};

const isKangurThemePresetKind = (value: unknown): value is KangurThemePresetKind =>
  value === 'factory' || value === 'preset';

const normalizeThemePresetManifestSlot = (value: unknown): KangurThemeMode | null =>
  value === 'daily' || value === 'dawn' || value === 'sunset' || value === 'nightly' ? value : null;

const getKangurThemeBaselineForMode = (mode: KangurThemeMode): ThemeSettings => {
  switch (mode) {
    case 'dawn':
      return KANGUR_DEFAULT_DAWN_THEME;
    case 'sunset':
      return KANGUR_DEFAULT_SUNSET_THEME;
    case 'nightly':
      return KANGUR_DEFAULT_THEME;
    case 'daily':
    default:
      return KANGUR_DEFAULT_DAILY_THEME;
  }
};

export const parseKangurThemePresetManifest = (
  raw: string | null | undefined
): KangurThemePresetManifestEntry[] => {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return withKangurClientErrorSync(
    {
      source: 'kangur.theme-settings',
      action: 'parse-theme-preset-manifest',
      description: 'Parses the Kangur preset manifest payload.',
      context: { rawLength: raw.length },
    },
    () => {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((entry): KangurThemePresetManifestEntry[] => {
        if (!entry || typeof entry !== 'object') return [];
        const record = entry as Record<string, unknown>;
        const id = typeof record['id'] === 'string' ? record['id'] : null;
        const kind = isKangurThemePresetKind(record['kind']) ? record['kind'] : null;
        const slot = normalizeThemePresetManifestSlot(record['slot']);
        const settings =
          record['settings'] && typeof record['settings'] === 'object' && !Array.isArray(record['settings'])
            ? normalizeKangurThemeSettings(
                record['settings'] as Partial<ThemeSettings>,
                getKangurThemeBaselineForMode(slot ?? 'daily')
              )
            : null;

        if (!id || !kind || !slot || !settings) {
          return [];
        }

        return [
          {
            id,
            kind,
            slot,
            settings,
          },
        ];
      });
    },
    { fallback: [] }
  );
};

export const resolveKangurThemePresetManifestEntry = (
  manifest: KangurThemePresetManifestEntry[],
  id: string
): KangurThemePresetManifestEntry | null => manifest.find((entry) => entry.id === id) ?? null;

export const resolveKangurStoredThemeSelection = ({
  id,
  catalog,
  manifest,
}: {
  id: string;
  catalog: KangurThemeCatalogEntry[];
  manifest: KangurThemePresetManifestEntry[];
}): KangurStoredThemeSelection | null => {
  const catalogEntry = catalog.find((entry) => entry.id === id);
  if (catalogEntry) {
    return {
      settings: catalogEntry.settings,
      source: 'catalog',
    };
  }

  const manifestEntry = resolveKangurThemePresetManifestEntry(manifest, id);
  if (manifestEntry) {
    return {
      settings: manifestEntry.settings,
      source: 'manifest',
    };
  }

  return null;
};

export const parseKangurThemeCatalog = (
  raw: string | null | undefined
): KangurThemeCatalogEntry[] => {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return withKangurClientErrorSync(
    {
      source: 'kangur.theme-settings',
      action: 'parse-theme-catalog',
      description: 'Parses the Kangur theme catalog payload.',
      context: { rawLength: raw.length },
    },
    () => {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is KangurThemeCatalogEntry =>
          e !== null &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>)['id'] === 'string' &&
          typeof (e as Record<string, unknown>)['name'] === 'string'
      );
    },
    { fallback: [] }
  );
};
