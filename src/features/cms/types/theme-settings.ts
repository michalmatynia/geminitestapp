import type {
  ColorSchemeColorsDto,
  ColorSchemeDto,
  ThemeSettingsDto,
} from '@/shared/contracts/cms-theme';
import { CMS_THEME_SETTINGS_KEY as SETTING_KEY } from '@/shared/contracts/cms-theme';

export type ColorSchemeColors = ColorSchemeColorsDto;

export type ColorScheme = ColorSchemeDto;

export type ThemeSettings = ThemeSettingsDto;

export const CMS_THEME_SETTINGS_KEY = SETTING_KEY;

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#3b82f6',
  secondaryColor: '#6366f1',
  accentColor: '#f59e0b',
  backgroundColor: '#030712',
  surfaceColor: '#111827',
  textColor: '#f3f4f6',
  mutedTextColor: '#9ca3af',
  borderColor: '#1f2937',
  errorColor: '#ef4444',
  successColor: '#22c55e',
  colorSchemes: [
    {
      id: 'scheme-1',
      name: 'Scheme 1',
      colors: {
        background: '#030712',
        surface: '#111827',
        text: '#f3f4f6',
        accent: '#3b82f6',
        border: '#1f2937',
      },
    },
    {
      id: 'scheme-2',
      name: 'Scheme 2',
      colors: {
        background: '#0b1220',
        surface: '#111827',
        text: '#e5e7eb',
        accent: '#6366f1',
        border: '#1f2937',
      },
    },
    {
      id: 'scheme-3',
      name: 'Scheme 3',
      colors: {
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        accent: '#f59e0b',
        border: '#334155',
      },
    },
    {
      id: 'scheme-4',
      name: 'Scheme 4',
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        text: '#e2e8f0',
        accent: '#22c55e',
        border: '#334155',
      },
    },
    {
      id: 'scheme-5',
      name: 'Scheme 5',
      colors: {
        background: '#0b0f1f',
        surface: '#111827',
        text: '#f3f4f6',
        accent: '#ec4899',
        border: '#1f2937',
      },
    },
  ],
  activeColorSchemeId: 'scheme-1',
  headingFont: 'Inter, sans-serif',
  bodyFont: 'Inter, sans-serif',
  baseSize: 16,
  headingWeight: '700',
  bodyWeight: '400',
  headingSizeScale: 1,
  bodySizeScale: 1,
  lineHeight: 1.6,
  headingLineHeight: 1.2,
  maxContentWidth: 1200,
  gridGutter: 24,
  sectionSpacing: 64,
  containerPadding: 24,
  borderRadius: 8,
  pagePaddingTop: 16,
  pagePaddingRight: 16,
  pagePaddingBottom: 16,
  pagePaddingLeft: 16,
  pageMarginTop: 0,
  pageMarginRight: 0,
  pageMarginBottom: 0,
  pageMarginLeft: 0,
  pagePadding: 16,
  pageMargin: 0,
  fullWidth: false,
  enableAnimations: true,
  animationDuration: 300,
  animationEasing: 'ease-out',
  scrollReveal: true,
  hoverEffect: 'vertical-lift',
  hoverScale: 1.02,
  btnPaddingX: 20,
  btnPaddingY: 10,
  btnFontSize: 14,
  btnFontWeight: '600',
  btnRadius: 8,
  btnPrimaryBg: '#3b82f6',
  btnPrimaryText: '#ffffff',
  btnSecondaryBg: '#374151',
  btnSecondaryText: '#f3f4f6',
  btnOutlineBorder: '#4b5563',
  btnBorderWidth: 1,
  btnBorderOpacity: 100,
  btnBorderRadius: 8,
  btnShadowOpacity: 0,
  btnShadowX: 0,
  btnShadowY: 2,
  btnShadowBlur: 4,
  pillRadius: 999,
  pillPaddingX: 12,
  pillPaddingY: 4,
  pillFontSize: 12,
  pillBg: '#1f2937',
  pillText: '#d1d5db',
  pillActiveBg: '#3b82f6',
  pillActiveText: '#ffffff',
  pillBorderColor: '#1f2937',
  pillBorderWidth: 0,
  pillBorderOpacity: 100,
  pillShadowOpacity: 0,
  pillShadowX: 0,
  pillShadowY: 0,
  pillShadowBlur: 0,
  inputHeight: 40,
  inputRadius: 8,
  inputBorderColor: '#374151',
  inputBorderWidth: 1,
  inputBorderOpacity: 100,
  inputBg: '#111827',
  inputText: '#f3f4f6',
  inputFocusBorder: '#3b82f6',
  inputPlaceholder: '#6b7280',
  inputFontSize: 14,
  inputShadowOpacity: 0,
  inputShadowX: 0,
  inputShadowY: 0,
  inputShadowBlur: 0,
  cardStyle: 'standard',
  cardImageRatio: '3:4',
  cardImagePadding: 0,
  cardTextAlignment: 'left',
  cardColorScheme: 'scheme-1',
  cardRadius: 12,
  cardShadow: 'small',
  cardBg: '#111827',
  cardHoverShadow: 'medium',
  showBadge: true,
  showQuickAdd: true,
  cardBorderWidth: 0,
  cardBorderOpacity: 100,
  cardBorderRadius: 12,
  cardShadowOpacity: 0,
  cardShadowX: 0,
  cardShadowY: 2,
  cardShadowBlur: 4,
  collectionRatio: '16:9',
  collectionRadius: 12,
  collectionStyle: 'standard',
  collectionImagePadding: 0,
  collectionOverlay: true,
  collectionOverlayColor: '#00000066',
  collectionTextAlign: 'center',
  collectionColorScheme: 'scheme-1',
  collectionBorderWidth: 0,
  collectionBorderOpacity: 100,
  collectionShadowOpacity: 0,
  collectionShadowX: 0,
  collectionShadowY: 2,
  collectionShadowBlur: 4,
  blogStyle: 'standard',
  blogRatio: '16:9',
  blogImagePadding: 0,
  blogTextAlignment: 'left',
  blogColorScheme: 'scheme-1',
  blogRadius: 12,
  blogShowDate: true,
  blogShowExcerpt: true,
  blogExcerptLines: 2,
  blogBorderWidth: 0,
  blogBorderOpacity: 100,
  blogBorderRadius: 12,
  blogShadowOpacity: 0,
  blogShadowX: 0,
  blogShadowY: 2,
  blogShadowBlur: 4,
  containerBg: '#111827',
  containerBorderColor: '#1f2937',
  containerRadius: 12,
  containerPaddingInner: 24,
  containerShadow: 'none',
  containerBorderWidth: 1,
  containerBorderOpacity: 100,
  containerBorderRadius: 12,
  containerShadowOpacity: 0,
  containerShadowX: 0,
  containerShadowY: 2,
  containerShadowBlur: 4,
  imageRadius: 8,
  imageBorderColor: '#1f2937',
  imageBorderWidth: 0,
  imageBorderOpacity: 100,
  imageShadowOpacity: 0,
  imageShadowX: 0,
  imageShadowY: 0,
  imageShadowBlur: 0,
  imagePlaceholderBg: '#1f2937',
  videoRatio: '16:9',
  dropdownBg: '#1f2937',
  dropdownBorder: '#374151',
  dropdownBorderWidth: 1,
  dropdownBorderOpacity: 100,
  dropdownRadius: 8,
  dropdownShadow: 'medium',
  dropdownShadowOpacity: 20,
  dropdownShadowX: 0,
  dropdownShadowY: 8,
  dropdownShadowBlur: 24,
  popupOverlayColor: '#000000aa',
  popupRadius: 16,
  drawerWidth: 400,
  drawerBg: '#111827',
  drawerOverlayColor: '#000000aa',
  drawerPosition: 'right',
  drawerBorderColor: '#1f2937',
  drawerBorderWidth: 0,
  drawerBorderOpacity: 100,
  drawerRadius: 16,
  drawerShadowOpacity: 0,
  drawerShadowX: 0,
  drawerShadowY: 8,
  drawerShadowBlur: 24,
  badgePosition: 'top-left',
  badgeFontSize: 11,
  badgeRadius: 4,
  badgePaddingX: 8,
  badgePaddingY: 2,
  badgeDefaultBg: '#374151',
  badgeDefaultText: '#d1d5db',
  badgeSaleColorScheme: 'scheme-1',
  badgeSaleBg: '#ef4444',
  badgeSaleText: '#ffffff',
  badgeSoldOutColorScheme: 'scheme-1',
  brandName: '',
  brandTagline: '',
  brandEmail: '',
  brandPhone: '',
  brandAddress: '',
  brandFooterHeadline: '',
  brandFooterDescription: '',
  brandFooterImage: '',
  brandFooterImageWidth: 240,
  socialFacebook: '',
  socialInstagram: '',
  socialTwitter: '',
  socialLinkedin: '',
  socialYoutube: '',
  socialTiktok: '',
  socialSnapchat: '',
  socialPinterest: '',
  socialTumblr: '',
  socialVimeo: '',
  searchPlaceholder: 'Search...',
  searchMinChars: 2,
  searchShowSuggestions: true,
  searchShowVendor: true,
  searchShowPrice: true,
  searchMaxResults: 8,
  currencyCode: 'USD',
  currencySymbol: '$',
  currencyPosition: 'before',
  currencyShowCode: false,
  thousandsSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
  cartStyle: 'drawer',
  cartIconStyle: 'bag',
  showCartCount: true,
  cartEmptyText: 'Your cart is empty',
  cartShowVendor: true,
  cartEnableNote: false,
  cartDrawerCollectionId: '',
  cartDrawerShowWhenEmpty: true,
  cartDrawerColorScheme: 'scheme-1',
  customCssSelectors: '',
  customCss: '',
  themePreset: 'default',
  darkMode: true,
};

const normalizeColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const normalizeScheme = (scheme: Partial<ColorScheme> | null | undefined, fallback: ColorScheme): ColorScheme => {
  const colors = (scheme?.colors ?? {}) as Partial<ColorSchemeColors>;
  return {
    id: typeof scheme?.id === 'string' ? scheme.id : fallback.id,
    name: typeof scheme?.name === 'string' ? scheme.name : fallback.name,
    colors: {
      background: normalizeColor(colors.background, fallback.colors.background),
      surface: normalizeColor(colors.surface, fallback.colors.surface),
      text: normalizeColor(colors.text, fallback.colors.text),
      accent: normalizeColor(colors.accent, fallback.colors.accent),
      border: normalizeColor(colors.border, fallback.colors.border),
    },
  };
};

const BADGE_POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

export const normalizeThemeSettings = (
  input?: Partial<ThemeSettings> | null
): ThemeSettings => {
  const merged: ThemeSettings = {
    ...DEFAULT_THEME,
    ...(input ?? {}),
  };

  const fallbackPadding = typeof input?.pagePadding === 'number' ? input.pagePadding : DEFAULT_THEME.pagePadding;
  const fallbackMargin = typeof input?.pageMargin === 'number' ? input.pageMargin : DEFAULT_THEME.pageMargin;

  merged.pagePaddingTop = typeof input?.pagePaddingTop === 'number' ? input.pagePaddingTop : fallbackPadding;
  merged.pagePaddingRight = typeof input?.pagePaddingRight === 'number' ? input.pagePaddingRight : fallbackPadding;
  merged.pagePaddingBottom = typeof input?.pagePaddingBottom === 'number' ? input.pagePaddingBottom : fallbackPadding;
  merged.pagePaddingLeft = typeof input?.pagePaddingLeft === 'number' ? input.pagePaddingLeft : fallbackPadding;
  merged.pageMarginTop = typeof input?.pageMarginTop === 'number' ? input.pageMarginTop : fallbackMargin;
  merged.pageMarginRight = typeof input?.pageMarginRight === 'number' ? input.pageMarginRight : fallbackMargin;
  merged.pageMarginBottom = typeof input?.pageMarginBottom === 'number' ? input.pageMarginBottom : fallbackMargin;
  merged.pageMarginLeft = typeof input?.pageMarginLeft === 'number' ? input.pageMarginLeft : fallbackMargin;

  merged.pagePadding = typeof input?.pagePadding === 'number' ? input.pagePadding : DEFAULT_THEME.pagePadding;
  merged.pageMargin = typeof input?.pageMargin === 'number' ? input.pageMargin : DEFAULT_THEME.pageMargin;
  merged.fullWidth = typeof input?.fullWidth === 'boolean' ? input.fullWidth : DEFAULT_THEME.fullWidth;
  merged.hoverEffect = typeof input?.hoverEffect === 'string' ? input.hoverEffect : DEFAULT_THEME.hoverEffect;
  merged.badgePosition =
    typeof input?.badgePosition === 'string' && BADGE_POSITIONS.has(input.badgePosition)
      ? input.badgePosition
      : DEFAULT_THEME.badgePosition;

  const fallbackSchemes = DEFAULT_THEME.colorSchemes;
  const rawSchemes = Array.isArray(input?.colorSchemes) ? input?.colorSchemes : merged.colorSchemes;
  const normalizedSchemes = Array.isArray(rawSchemes)
    ? rawSchemes.map((scheme: Partial<ColorScheme> | null | undefined, index: number) =>
      normalizeScheme(scheme, fallbackSchemes[index] ?? fallbackSchemes[0]!))    : fallbackSchemes;

  merged.colorSchemes = normalizedSchemes.length > 0 ? normalizedSchemes : fallbackSchemes;

  if (!merged.colorSchemes.some((scheme: ColorScheme) => scheme.id === merged.activeColorSchemeId)) {
    merged.activeColorSchemeId = merged.colorSchemes[0]?.id ?? '';
  }

  return merged;
};

export const buildColorSchemeMap = (
  settings: ThemeSettings
): Record<string, ColorSchemeColors> => {
  const schemes = settings.colorSchemes ?? [];
  return schemes.reduce<Record<string, ColorSchemeColors>>((acc: Record<string, ColorSchemeColors>, scheme: ColorScheme) => {
    acc[scheme.id] = scheme.colors;
    return acc;
  }, {});
};
