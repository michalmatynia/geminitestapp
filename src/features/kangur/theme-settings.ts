import { DEFAULT_THEME, normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
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

/** Kangur Daily Bloom theme — warm sunrise palette (2026-03-13). */
export const KANGUR_DAILY_BLOOM_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_DAILY_THEME,
  themePreset: 'kangur-daily-bloom',
  primaryColor: '#2f7d7a',
  secondaryColor: '#e57d6b',
  accentColor: '#f2b255',
  backgroundColor: '#f7f1e8',
  surfaceColor: '#fffefc',
  textColor: '#2e2a30',
  mutedTextColor: '#6f6a73',
  borderColor: '#eadfce',
  errorColor: '#e36b6b',
  successColor: '#3fbf8f',
  colorSchemes: [
    {
      id: 'kangur-bloom-ivory',
      name: 'Bloom Ivory',
      colors: {
        background: '#f7f1e8',
        surface: '#fff8f1',
        text: '#2e2a30',
        accent: '#2f7d7a',
        border: '#eadfce',
      },
    },
    {
      id: 'kangur-bloom-rose',
      name: 'Bloom Rose',
      colors: {
        background: '#fff1f1',
        surface: '#fff7f7',
        text: '#2e2a30',
        accent: '#e57d6b',
        border: '#f0d6d2',
      },
    },
    {
      id: 'kangur-bloom-sky',
      name: 'Bloom Sky',
      colors: {
        background: '#eef6ff',
        surface: '#f7fbff',
        text: '#2e2a30',
        accent: '#5aa4ff',
        border: '#d7e6f7',
      },
    },
    {
      id: 'kangur-bloom-sage',
      name: 'Bloom Sage',
      colors: {
        background: '#edf7f1',
        surface: '#f6fbf8',
        text: '#2e2a30',
        accent: '#5fb38c',
        border: '#d6ece1',
      },
    },
  ],
  activeColorSchemeId: 'kangur-bloom-ivory',
  headingFont: 'Outfit, sans-serif',
  bodyFont: '\'Plus Jakarta Sans\', sans-serif',
  headingSizeScale: 1.06,
  lineHeight: 1.62,
  btnPrimaryBg: 'linear-gradient(135deg, #2f7d7a 0%, #3aa890 52%, #64cfb1 100%)',
  btnPrimaryText: '#ffffff',
  btnSecondaryBg: 'rgba(255, 255, 255, 0.9)',
  btnSecondaryText: '#3d3a40',
  btnOutlineBorder: '#e4d6c8',
  btnBorderOpacity: 70,
  btnShadowOpacity: 0.12,
  btnShadowY: 8,
  btnShadowBlur: 24,
  pillBg: 'rgba(255, 255, 255, 0.72)',
  pillText: '#5f5a63',
  pillActiveBg: '#e6f4ef',
  pillActiveText: '#2f7d7a',
  pillBorderColor: '#eadfce',
  pillBorderOpacity: 70,
  pillShadowOpacity: 0.08,
  inputBorderColor: '#e2d5c8',
  inputBg: '#ffffff',
  inputText: '#343038',
  inputFocusBorder: '#b7d7cc',
  inputPlaceholder: '#918b94',
  inputShadowOpacity: 0.06,
  inputShadowY: 8,
  inputShadowBlur: 22,
  cardColorScheme: 'kangur-bloom-ivory',
  cardBg: '#fffdfb',
  cardBorderOpacity: 70,
  cardShadowOpacity: 0.12,
  collectionColorScheme: 'kangur-bloom-ivory',
  collectionOverlayColor: 'rgba(255, 255, 255, 0.72)',
  blogColorScheme: 'kangur-bloom-ivory',
  containerBg: '#fffefc',
  containerBorderColor: '#f7efe6',
  panelGradientStart: 'rgba(255, 255, 255, 0.99)',
  panelGradientEnd: 'rgba(249, 243, 236, 0.94)',
  panelTransparency: 0.96,
  navGradientStart: 'rgba(255, 255, 255, 0.96)',
  navGradientEnd: 'rgba(249, 244, 237, 0.9)',
  navTransparency: 0.94,
  containerShadowOpacity: 0.12,
  imageBorderColor: '#eee2d6',
  imagePlaceholderBg: '#f4ede4',
  dropdownBg: '#fff8f2',
  dropdownBorder: '#e6d9cc',
  dropdownShadowOpacity: 0.12,
  dropdownShadowY: 12,
  dropdownShadowBlur: 30,
  popupOverlayColor: 'rgba(47, 45, 40, 0.18)',
  drawerBg: '#fff6ef',
  drawerOverlayColor: 'rgba(47, 45, 40, 0.18)',
  drawerBorderColor: '#efe2d5',
  drawerShadowOpacity: 0.14,
  badgeDefaultBg: '#f1e8dd',
  badgeDefaultText: '#5a5560',
  badgeSaleColorScheme: 'kangur-bloom-rose',
  badgeSaleBg: '#ffd7c2',
  badgeSaleText: '#8a4b2b',
  badgeSoldOutColorScheme: 'kangur-bloom-ivory',
  badgeSoldOutBg: '#f3ede6',
  badgeSoldOutText: '#7b7680',
});

/** Kangur Dawn theme — dawn-inspired palette based on the Daily Bloom theme (2026-03-13). */
export const KANGUR_DAWN_THEME: ThemeSettings = {
  ...KANGUR_DAILY_BLOOM_THEME,
  themePreset: 'kangur-dawn',
};

/** Kangur Nightly Aurora theme — deep neon night palette (2026-03-13). */
export const KANGUR_NIGHTLY_AURORA_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_DAILY_THEME,
  themePreset: 'kangur-nightly-aurora',
  darkMode: true,
  primaryColor: '#64f4ff',
  secondaryColor: '#7aa2ff',
  accentColor: '#b08bff',
  backgroundColor: '#0a0f1d',
  surfaceColor: '#121a2b',
  textColor: '#e9f2ff',
  mutedTextColor: '#a1afc9',
  borderColor: '#1d2740',
  errorColor: '#ff7b88',
  successColor: '#52e0b7',
  colorSchemes: [
    {
      id: 'kangur-aurora-teal',
      name: 'Aurora Teal',
      colors: {
        background: '#0a0f1d',
        surface: '#121a2b',
        text: '#e9f2ff',
        accent: '#64f4ff',
        border: '#1b2640',
      },
    },
    {
      id: 'kangur-aurora-violet',
      name: 'Aurora Violet',
      colors: {
        background: '#120f25',
        surface: '#1a1732',
        text: '#e9f2ff',
        accent: '#b08bff',
        border: '#2a2346',
      },
    },
    {
      id: 'kangur-aurora-blue',
      name: 'Aurora Blue',
      colors: {
        background: '#0b1326',
        surface: '#131f35',
        text: '#e9f2ff',
        accent: '#7aa2ff',
        border: '#1d2a48',
      },
    },
    {
      id: 'kangur-aurora-emerald',
      name: 'Aurora Mint',
      colors: {
        background: '#0c141c',
        surface: '#111d28',
        text: '#e9f2ff',
        accent: '#52e0b7',
        border: '#1b2b39',
      },
    },
  ],
  activeColorSchemeId: 'kangur-aurora-teal',
  headingFont: '\'Space Grotesk\', sans-serif',
  bodyFont: 'Manrope, sans-serif',
  headingSizeScale: 1.08,
  lineHeight: 1.62,
  headingLineHeight: 1.18,
  borderRadius: 26,
  hoverScale: 1.015,
  btnRadius: 18,
  btnPrimaryBg: 'linear-gradient(135deg, #64f4ff 0%, #7aa2ff 56%, #b08bff 100%)',
  btnPrimaryText: '#0a0f1d',
  btnSecondaryBg: 'rgba(12, 18, 35, 0.9)',
  btnSecondaryText: '#e9f2ff',
  btnOutlineBorder: '#263150',
  btnBorderOpacity: 70,
  btnBorderRadius: 18,
  btnShadowOpacity: 0.22,
  btnShadowY: 12,
  btnShadowBlur: 34,
  pillBg: 'rgba(18, 26, 46, 0.82)',
  pillText: '#c2d0eb',
  pillActiveBg: 'rgba(24, 50, 72, 0.9)',
  pillActiveText: '#64f4ff',
  pillBorderColor: '#263151',
  pillBorderOpacity: 60,
  pillShadowOpacity: 0.12,
  inputBorderColor: '#2a3552',
  inputBg: '#0f172c',
  inputText: '#e9f2ff',
  inputFocusBorder: '#64f4ff',
  inputPlaceholder: '#7f8fb3',
  inputShadowOpacity: 0.1,
  inputShadowY: 12,
  inputShadowBlur: 30,
  cardColorScheme: 'kangur-aurora-blue',
  cardBg: '#111a2e',
  cardBorderOpacity: 65,
  cardShadowOpacity: 0.2,
  cardShadowY: 20,
  cardShadowBlur: 42,
  collectionColorScheme: 'kangur-aurora-blue',
  collectionOverlayColor: 'rgba(6, 12, 26, 0.6)',
  blogColorScheme: 'kangur-aurora-blue',
  containerBg: '#0f172b',
  containerBorderColor: '#1f2a45',
  panelGradientStart: '#16223b',
  panelGradientEnd: '#0c1326',
  panelTransparency: 0.92,
  navGradientStart: '#131c33',
  navGradientEnd: '#0a1124',
  navTransparency: 0.9,
  containerShadowOpacity: 0.22,
  imageBorderColor: '#1f2a46',
  imagePlaceholderBg: '#0c1326',
  dropdownBg: '#131c33',
  dropdownBorder: '#283554',
  dropdownShadowOpacity: 0.24,
  dropdownShadowY: 16,
  dropdownShadowBlur: 38,
  popupOverlayColor: 'rgba(5, 8, 18, 0.55)',
  drawerBg: '#0f172b',
  drawerOverlayColor: 'rgba(5, 8, 18, 0.6)',
  drawerBorderColor: '#1f2a45',
  drawerShadowOpacity: 0.24,
  badgeDefaultBg: '#1a2541',
  badgeDefaultText: '#cbd6ef',
  badgeSaleColorScheme: 'kangur-aurora-violet',
  badgeSaleBg: '#f0a3ff',
  badgeSaleText: '#2a1430',
  badgeSoldOutColorScheme: 'kangur-aurora-blue',
  badgeSoldOutBg: '#132036',
  badgeSoldOutText: '#7f8fb3',
});

/** Kangur Sunset theme — warm dusk palette (2026-03-13). */
export const KANGUR_SUNSET_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_NIGHTLY_AURORA_THEME,
  themePreset: 'kangur-sunset',
  primaryColor: '#f97316',
  secondaryColor: '#fb7185',
  accentColor: '#fbbf24',
  backgroundColor: '#140b14',
  surfaceColor: '#1d131f',
  textColor: '#fff4e6',
  mutedTextColor: '#e2bfa8',
  borderColor: '#2a1b2f',
  errorColor: '#fb7185',
  successColor: '#34d399',
  colorSchemes: [
    {
      id: 'kangur-sunset-ember',
      name: 'Sunset Ember',
      colors: {
        background: '#140b14',
        surface: '#1d131f',
        text: '#fff4e6',
        accent: '#f97316',
        border: '#2a1b2f',
      },
    },
    {
      id: 'kangur-sunset-rose',
      name: 'Sunset Rose',
      colors: {
        background: '#180d1a',
        surface: '#241322',
        text: '#fff4e6',
        accent: '#fb7185',
        border: '#332035',
      },
    },
    {
      id: 'kangur-sunset-amber',
      name: 'Sunset Amber',
      colors: {
        background: '#16100f',
        surface: '#231816',
        text: '#fff4e6',
        accent: '#fbbf24',
        border: '#332620',
      },
    },
    {
      id: 'kangur-sunset-coral',
      name: 'Sunset Coral',
      colors: {
        background: '#140e13',
        surface: '#20141a',
        text: '#fff4e6',
        accent: '#fb923c',
        border: '#2f2027',
      },
    },
  ],
  activeColorSchemeId: 'kangur-sunset-ember',
  btnPrimaryBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 52%, #fbbf24 100%)',
  btnPrimaryText: '#1f130a',
  btnSecondaryBg: 'rgba(24, 16, 24, 0.9)',
  btnSecondaryText: '#fff3e0',
  btnOutlineBorder: '#3a2a2f',
  pillBg: 'rgba(24, 16, 24, 0.82)',
  pillText: '#e8c8b4',
  pillActiveBg: 'rgba(45, 28, 36, 0.9)',
  pillActiveText: '#fbbf24',
  pillBorderColor: '#3a2a2f',
  inputBorderColor: '#3a2a2f',
  inputBg: '#160f16',
  inputText: '#fff3e0',
  inputFocusBorder: '#fbbf24',
  inputPlaceholder: '#c9a88e',
  cardColorScheme: 'kangur-sunset-ember',
  cardBg: '#1a121c',
  collectionColorScheme: 'kangur-sunset-ember',
  collectionOverlayColor: 'rgba(10, 6, 12, 0.6)',
  blogColorScheme: 'kangur-sunset-ember',
  containerBg: '#171019',
  containerBorderColor: '#2a1b2f',
  panelGradientStart: '#221423',
  panelGradientEnd: '#120a14',
  navGradientStart: '#1e111f',
  navGradientEnd: '#0f0811',
  imageBorderColor: '#2d1d2e',
  imagePlaceholderBg: '#120a14',
  dropdownBg: '#1e111f',
  dropdownBorder: '#3a2a2f',
  popupOverlayColor: 'rgba(10, 6, 12, 0.6)',
  drawerBg: '#171019',
  drawerOverlayColor: 'rgba(10, 6, 12, 0.6)',
  drawerBorderColor: '#2a1b2f',
  badgeDefaultBg: '#241824',
  badgeDefaultText: '#f1d2bd',
  badgeSaleColorScheme: 'kangur-sunset-rose',
  badgeSaleBg: '#fcd7c2',
  badgeSaleText: '#7a3b21',
  badgeSoldOutColorScheme: 'kangur-sunset-ember',
  badgeSoldOutBg: '#1d121c',
  badgeSoldOutText: '#c7a390',
});

/** Kangur Sunset Horizon theme — twilight indigo with amber glow (2026-03-13). */
export const KANGUR_SUNSET_HORIZON_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_SUNSET_THEME,
  themePreset: 'kangur-sunset-horizon',
  primaryColor: '#5f54d8',
  secondaryColor: '#8a5dff',
  accentColor: '#ffb35c',
  backgroundColor: '#0d0f1f',
  surfaceColor: '#151a33',
  textColor: '#f6f4ff',
  mutedTextColor: '#c3bddc',
  borderColor: '#262b46',
  errorColor: '#ff7d8a',
  successColor: '#45d3a4',
  gradientIndigoStart: '#4f62db',
  gradientIndigoEnd: '#7c52ff',
  gradientVioletStart: '#5f54d8',
  gradientVioletEnd: '#9a5be2',
  gradientEmeraldStart: '#2dd4bf',
  gradientEmeraldEnd: '#5eead4',
  gradientSkyStart: '#2f88d8',
  gradientSkyEnd: '#58b8df',
  gradientAmberStart: '#ff9a35',
  gradientAmberEnd: '#ffd560',
  gradientRoseStart: '#fb7185',
  gradientRoseEnd: '#f9a8d4',
  gradientTealStart: '#4aa7ff',
  gradientTealEnd: '#60d9ff',
  gradientSlateStart: '#9aa5c3',
  gradientSlateEnd: '#4b5568',
  colorSchemes: [
    {
      id: 'kangur-horizon-indigo',
      name: 'Horizon Indigo',
      colors: {
        background: '#0d0f1f',
        surface: '#151a33',
        text: '#f6f4ff',
        accent: '#5f54d8',
        border: '#262b46',
      },
    },
    {
      id: 'kangur-horizon-violet',
      name: 'Horizon Violet',
      colors: {
        background: '#130f26',
        surface: '#1c1636',
        text: '#f6f4ff',
        accent: '#9a5be2',
        border: '#31244a',
      },
    },
    {
      id: 'kangur-horizon-amber',
      name: 'Horizon Amber',
      colors: {
        background: '#151018',
        surface: '#1f1824',
        text: '#f9f0e6',
        accent: '#ffb35c',
        border: '#35263a',
      },
    },
    {
      id: 'kangur-horizon-sky',
      name: 'Horizon Sky',
      colors: {
        background: '#0d1527',
        surface: '#15203a',
        text: '#f1f7ff',
        accent: '#4aa7ff',
        border: '#26314f',
      },
    },
  ],
  activeColorSchemeId: 'kangur-horizon-indigo',
  btnPrimaryBg: 'linear-gradient(135deg, #5f54d8 0%, #7c52ff 52%, #d17b49 100%)',
  btnPrimaryText: '#fdf7ff',
  btnSecondaryBg: 'rgba(16, 18, 35, 0.92)',
  btnSecondaryText: '#f6f4ff',
  btnOutlineBorder: '#2d314c',
  pillBg: 'rgba(19, 20, 39, 0.82)',
  pillText: '#d5cee8',
  pillActiveBg: 'rgba(41, 36, 76, 0.92)',
  pillActiveText: '#ffd27d',
  pillBorderColor: '#2d314c',
  inputBorderColor: '#2d314c',
  inputBg: '#121629',
  inputText: '#f6f4ff',
  inputFocusBorder: '#ffd27d',
  inputPlaceholder: '#9d96b7',
  cardColorScheme: 'kangur-horizon-indigo',
  cardBg: '#121626',
  collectionColorScheme: 'kangur-horizon-indigo',
  collectionOverlayColor: 'rgba(10, 12, 22, 0.62)',
  blogColorScheme: 'kangur-horizon-indigo',
  containerBg: '#121626',
  containerBorderColor: '#262b46',
  panelGradientStart: '#1b2039',
  panelGradientEnd: '#0d1022',
  navGradientStart: '#191d34',
  navGradientEnd: '#0b0f21',
  imageBorderColor: '#2b2f4b',
  imagePlaceholderBg: '#11162a',
  dropdownBg: '#161b32',
  dropdownBorder: '#2f3350',
  popupOverlayColor: 'rgba(8, 10, 20, 0.62)',
  drawerBg: '#14182d',
  drawerOverlayColor: 'rgba(8, 10, 20, 0.62)',
  drawerBorderColor: '#262b46',
  badgeDefaultBg: '#1b2036',
  badgeDefaultText: '#d6d0ee',
  badgeSaleColorScheme: 'kangur-horizon-amber',
  badgeSaleBg: '#ffd7b3',
  badgeSaleText: '#7a3b21',
  badgeSoldOutColorScheme: 'kangur-horizon-indigo',
  badgeSoldOutBg: '#131828',
  badgeSoldOutText: '#a6a1c2',
});

/** Factory dawn theme — baseline for the dawn slot. */
export const KANGUR_FACTORY_DAWN_THEME: ThemeSettings = KANGUR_DAWN_THEME;

/** Factory sunset theme — baseline for the sunset slot. */
export const KANGUR_FACTORY_SUNSET_THEME: ThemeSettings = KANGUR_SUNSET_THEME;
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

/**
 * Default dawn theme — uses factory dawn baseline.
 * Used as the dawn reset target.
 */
export const KANGUR_DEFAULT_DAWN_THEME: ThemeSettings = KANGUR_DAWN_THEME;

/**
 * Default sunset theme — uses factory sunset baseline.
 * Used as the sunset reset target.
 */
export const KANGUR_DEFAULT_SUNSET_THEME: ThemeSettings = KANGUR_SUNSET_THEME;

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
  const legacyFallback = resolveThemeRaw(legacyThemeRaw);

  if (mode === 'dawn') {
    return resolveThemeRaw(dawnThemeRaw) ?? resolveThemeRaw(dailyThemeRaw) ?? legacyFallback;
  }
  if (mode === 'sunset') {
    return resolveThemeRaw(sunsetThemeRaw) ?? resolveThemeRaw(nightlyThemeRaw) ?? legacyFallback;
  }
  if (mode === 'dark') {
    return resolveThemeRaw(nightlyThemeRaw) ?? legacyFallback;
  }

  return resolveThemeRaw(dailyThemeRaw) ?? legacyFallback;
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
