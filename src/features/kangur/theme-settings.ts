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

/**
 * Factory theme baseline — matches commit dda089a3c2c6956952afc10aac328dd42c65b6a4.
 * The Kangur defaults were the CMS DEFAULT_THEME with dark mode enabled.
 */
const KANGUR_FACTORY_THEME: ThemeSettings = normalizeThemeSettings({
  ...DEFAULT_THEME,
  darkMode: true,
});

/** Factory daily theme (commit dda089a...). */
export const KANGUR_FACTORY_DAILY_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_FACTORY_THEME,
});

/** Kangur Daily theme — soft pastel studio palette (2026-03-13). */
export const KANGUR_DAILY_THEME: ThemeSettings = normalizeThemeSettings({
  ...DEFAULT_THEME,
  themePreset: 'kangur-daily',
  darkMode: false,
  primaryColor: '#6b63ff',
  secondaryColor: '#8d85ff',
  accentColor: '#b9b2ff',
  backgroundColor: '#f1ecf4',
  surfaceColor: '#f8f5fb',
  textColor: '#2f3b52',
  mutedTextColor: '#6b778f',
  borderColor: '#e4deef',
  errorColor: '#f06f7b',
  successColor: '#36b987',
  colorSchemes: [
    {
      id: 'kangur-daily-violet',
      name: 'Daily Violet',
      colors: {
        background: '#f1effb',
        surface: '#f8f6ff',
        text: '#2f3b52',
        accent: '#6b63ff',
        border: '#e4def4',
      },
    },
    {
      id: 'kangur-daily-sky',
      name: 'Daily Sky',
      colors: {
        background: '#eef4ff',
        surface: '#f7faff',
        text: '#2f3b52',
        accent: '#6aa8ff',
        border: '#dbe6f7',
      },
    },
    {
      id: 'kangur-daily-mint',
      name: 'Daily Mint',
      colors: {
        background: '#edf8f3',
        surface: '#f6fbf8',
        text: '#2f3b52',
        accent: '#5fc3a1',
        border: '#d8efe6',
      },
    },
    {
      id: 'kangur-daily-sand',
      name: 'Daily Sand',
      colors: {
        background: '#fdf2e7',
        surface: '#fff7ef',
        text: '#2f3b52',
        accent: '#f0a36d',
        border: '#f1e0d2',
      },
    },
  ],
  activeColorSchemeId: 'kangur-daily-violet',
  headingFont: 'Sora, sans-serif',
  bodyFont: '\'DM Sans\', sans-serif',
  baseSize: 16,
  headingWeight: '700',
  bodyWeight: '400',
  headingSizeScale: 1.05,
  bodySizeScale: 1,
  lineHeight: 1.6,
  headingLineHeight: 1.2,
  maxContentWidth: 1240,
  gridGutter: 28,
  sectionSpacing: 72,
  containerPadding: 28,
  borderRadius: 28,
  pagePaddingTop: 36,
  pagePaddingRight: 32,
  pagePaddingBottom: 84,
  pagePaddingLeft: 32,
  pagePadding: 32,
  pageMargin: 0,
  fullWidth: false,
  enableAnimations: true,
  animationDuration: 280,
  animationEasing: 'ease-out',
  scrollReveal: true,
  hoverEffect: 'vertical-lift',
  hoverScale: 1.01,
  btnPaddingX: 22,
  btnPaddingY: 10,
  btnFontSize: 14,
  btnFontWeight: '600',
  btnRadius: 999,
  btnPrimaryBg: 'linear-gradient(135deg, #ffb36b 0%, #ff9a63 48%, #ff7f52 100%)',
  btnPrimaryText: '#ffffff',
  btnSecondaryBg: 'rgba(255, 255, 255, 0.86)',
  btnSecondaryText: '#3b4561',
  btnOutlineBorder: '#d9d3ee',
  btnBorderWidth: 1,
  btnBorderOpacity: 65,
  btnBorderRadius: 999,
  btnShadowOpacity: 0.18,
  btnShadowX: 0,
  btnShadowY: 10,
  btnShadowBlur: 30,
  pillRadius: 999,
  pillPaddingX: 14,
  pillPaddingY: 6,
  pillFontSize: 12,
  pillBg: 'rgba(255, 255, 255, 0.74)',
  pillText: '#5b6780',
  pillActiveBg: '#e8e4ff',
  pillActiveText: '#4338ca',
  pillBorderColor: '#ebe6f6',
  pillBorderWidth: 1,
  pillBorderOpacity: 70,
  pillShadowOpacity: 0.18,
  pillShadowX: 0,
  pillShadowY: 10,
  pillShadowBlur: 26,
  inputHeight: 50,
  inputRadius: 22,
  inputBorderColor: '#e4def0',
  inputBorderWidth: 1,
  inputBorderOpacity: 80,
  inputBg: '#ffffff',
  inputText: '#364158',
  inputFocusBorder: '#c3bbff',
  inputPlaceholder: '#8895ad',
  inputFontSize: 14,
  inputShadowOpacity: 0.12,
  inputShadowX: 0,
  inputShadowY: 12,
  inputShadowBlur: 30,
  cardStyle: 'standard',
  cardImageRatio: '3:4',
  cardTextAlignment: 'left',
  cardColorScheme: 'kangur-daily-violet',
  cardRadius: 26,
  cardShadow: 'large',
  cardBg: '#f7f4fb',
  cardHoverShadow: 'large',
  showBadge: true,
  showQuickAdd: false,
  cardBorderWidth: 1,
  cardBorderOpacity: 70,
  cardBorderRadius: 26,
  cardShadowOpacity: 0.18,
  cardShadowX: 0,
  cardShadowY: 18,
  cardShadowBlur: 36,
  collectionRatio: '16:9',
  collectionRadius: 24,
  collectionStyle: 'overlay',
  collectionImagePadding: 8,
  collectionOverlay: true,
  collectionOverlayColor: 'rgba(255, 255, 255, 0.72)',
  collectionTextAlign: 'left',
  collectionColorScheme: 'kangur-daily-violet',
  collectionBorderWidth: 1,
  collectionBorderOpacity: 70,
  collectionShadowOpacity: 0.18,
  collectionShadowX: 0,
  collectionShadowY: 18,
  collectionShadowBlur: 36,
  blogStyle: 'standard',
  blogRatio: '16:9',
  blogImagePadding: 8,
  blogTextAlignment: 'left',
  blogColorScheme: 'kangur-daily-violet',
  blogRadius: 24,
  blogShowDate: true,
  blogShowExcerpt: true,
  blogExcerptLines: 3,
  blogBorderWidth: 1,
  blogBorderOpacity: 70,
  blogBorderRadius: 24,
  blogShadowOpacity: 0.18,
  blogShadowX: 0,
  blogShadowY: 18,
  blogShadowBlur: 36,
  containerBg: '#f7f4fb',
  containerBorderColor: '#ece7f5',
  containerRadius: 30,
  containerPaddingInner: 24,
  containerShadow: 'large',
  containerBorderWidth: 1,
  containerBorderOpacity: 70,
  containerBorderRadius: 30,
  containerShadowOpacity: 0.2,
  containerShadowX: 0,
  containerShadowY: 20,
  containerShadowBlur: 50,
  imageRadius: 18,
  imageBorderColor: '#eee9f6',
  imageBorderWidth: 1,
  imageBorderOpacity: 60,
  imageShadowOpacity: 0.12,
  imageShadowX: 0,
  imageShadowY: 12,
  imageShadowBlur: 30,
  imagePlaceholderBg: '#f3eff8',
  dropdownBg: '#f8f5fb',
  dropdownBorder: '#e5e0ef',
  dropdownBorderWidth: 1,
  dropdownBorderOpacity: 75,
  dropdownRadius: 20,
  dropdownShadow: 'large',
  dropdownShadowOpacity: 0.2,
  dropdownShadowX: 0,
  dropdownShadowY: 18,
  dropdownShadowBlur: 40,
  popupOverlayColor: 'rgba(47, 59, 82, 0.18)',
  popupRadius: 28,
  drawerWidth: 400,
  drawerBg: '#f7f4fb',
  drawerOverlayColor: 'rgba(47, 59, 82, 0.2)',
  drawerPosition: 'right',
  drawerBorderColor: '#e7e1f1',
  drawerBorderWidth: 1,
  drawerBorderOpacity: 75,
  drawerRadius: 26,
  drawerShadowOpacity: 0.22,
  drawerShadowX: 0,
  drawerShadowY: 18,
  drawerShadowBlur: 48,
  badgePosition: 'top-right',
  badgeFontSize: 11,
  badgeRadius: 999,
  badgePaddingX: 10,
  badgePaddingY: 4,
  badgeDefaultBg: '#ece8f8',
  badgeDefaultText: '#4b5570',
  badgeSaleColorScheme: 'kangur-daily-sand',
  badgeSaleBg: '#ffd9c2',
  badgeSaleText: '#8a4b2b',
  badgeSoldOutColorScheme: 'kangur-daily-violet',
  badgeSoldOutBg: '#f1effb',
  badgeSoldOutText: '#64728a',
});
/** Factory nightly theme (commit dda089a...). */
export const KANGUR_FACTORY_NIGHTLY_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_FACTORY_THEME,
});

/**
 * Default nightly theme — uses factory nightly baseline.
 * Used as the nightly reset target.
 */
export const KANGUR_DEFAULT_THEME: ThemeSettings = KANGUR_FACTORY_NIGHTLY_THEME;

/**
 * Default daily theme — uses factory daily baseline.
 * Used as the daily reset target.
 */
export const KANGUR_DEFAULT_DAILY_THEME: ThemeSettings = KANGUR_DAILY_THEME;

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
