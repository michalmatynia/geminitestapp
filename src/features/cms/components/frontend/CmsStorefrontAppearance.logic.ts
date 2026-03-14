import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { darkenCssColor } from '@/shared/utils/color-utils';
import {
  CmsStorefrontAppearanceMode,
  CmsAppearanceTone,
  DEFAULT_TONE,
  DEFAULT_KANGUR_RUNTIME_VARS,
} from './CmsStorefrontAppearance.contracts';
import {
  applyTransparency,
  buildShadow,
  clampNumber,
  extractGradientStops,
  isGradientValue,
  isNonEmptyString,
  isDarkStorefrontAppearanceMode,
  mixCssColor,
  resolveBackgroundValue,
  resolveSolidColor,
  toCssPx,
  toCssPxSigned,
  toShadowColor,
} from './CmsStorefrontAppearance.utils';
import { resolveHomeActionVars } from './CmsStorefrontAppearance.home-actions';

export const withFallbackTone = (tone?: CmsAppearanceTone): Required<CmsAppearanceTone> => ({
  background: tone?.background || DEFAULT_TONE.background,
  text: tone?.text || DEFAULT_TONE.text,
  border: tone?.border || tone?.text || DEFAULT_TONE.border,
  accent: tone?.accent || tone?.text || DEFAULT_TONE.accent,
});

export const resolveStorefrontAppearanceTone = (
  tone: CmsAppearanceTone,
  mode: CmsStorefrontAppearanceMode
): Required<CmsAppearanceTone> => {
  const baseTone = withFallbackTone(tone);

  if (isDarkStorefrontAppearanceMode(mode)) {
    return {
      ...baseTone,
      background: `color-mix(in srgb, ${baseTone.background} 18%, black)`,
      text: '#f3f4f6',
      border: 'rgba(255,255,255,0.18)',
    };
  }

  return {
    ...baseTone,
    background: darkenCssColor(baseTone.background, 8),
    border: darkenCssColor(baseTone.border, 6),
  };
};

export const resolveStorefrontAppearanceColorSchemes = (
  schemes: Record<string, { background: string; surface: string; text: string; accent: string; border: string }>,
  mode: CmsStorefrontAppearanceMode
): Record<string, { background: string; surface: string; text: string; accent: string; border: string }> =>
  Object.fromEntries(
    Object.entries(schemes).map(([id, colors]) => {
      const backgroundTone = resolveStorefrontAppearanceTone(
        {
          background: colors.background,
          text: colors.text,
          border: colors.border,
          accent: colors.accent,
        },
        mode
      );
      const surfaceTone = resolveStorefrontAppearanceTone(
        {
          background: colors.surface,
          text: colors.text,
          border: colors.border,
          accent: colors.accent,
        },
        mode
      );

      return [
        id,
        {
          background: backgroundTone.background,
          surface: surfaceTone.background,
          text: backgroundTone.text,
          accent: colors.accent,
          border: backgroundTone.border,
        },
      ];
    })
  );

export const buildGelButtonShadow = (
  dropShadowParts: string[],
  theme: ThemeSettings,
  baseColor: string,
  isDark: boolean
): string => {
  const parts = [...dropShadowParts];
  if (theme.btnInsetHighlightOpacity > 0) {
    const highlightOpacity = theme.btnInsetHighlightOpacity * (isDark ? 0.5 : 1);
    parts.push(`inset 0 1px 0 ${toShadowColor('#ffffff', highlightOpacity)}`);
  }
  if (theme.btnInsetShadowOpacity > 0) {
    const insetOpacity = theme.btnInsetShadowOpacity * (isDark ? 0.6 : 1);
    parts.push(
      `inset 0 -${Math.max(0, theme.btnInsetShadowY)}px ${Math.max(0, theme.btnInsetShadowBlur)}px ${toShadowColor('#000000', insetOpacity)}`
    );
  }
  if (theme.btnGlowOpacity > 0) {
    const glowOpacity = theme.btnGlowOpacity * (isDark ? 0.7 : 1);
    const glowColor = isNonEmptyString(theme.btnGlowColor) ? theme.btnGlowColor.trim() : baseColor;
    parts.push(`0 0 ${Math.max(0, theme.btnGlowSpread)}px ${toShadowColor(glowColor, glowOpacity)}`);
  }
  return parts.join(', ');
};

export const resolveButtonTextShadow = (theme: ThemeSettings, isDark: boolean): string => {
  if (theme.btnTextShadowOpacity <= 0) return 'none';
  const opacity = theme.btnTextShadowOpacity * (isDark ? 0.8 : 1);
  return `0 ${toCssPxSigned(theme.btnTextShadowY)} ${toCssPx(Math.max(0, theme.btnTextShadowBlur))} ${toShadowColor(isDark ? '#000000' : 'rgba(0,0,0,0.6)', opacity)}`;
};

export const resolvePagePadding = (theme: ThemeSettings) => {
  const basePadding = theme.pagePadding;

  return {
    top: theme.pagePaddingTop ?? basePadding,
    right: theme.pagePaddingRight ?? basePadding,
    bottom: theme.pagePaddingBottom ?? basePadding,
    left: theme.pagePaddingLeft ?? basePadding,
  };
};

export const resolveButtonHeight = (theme: ThemeSettings): number =>
  Math.max(theme.btnFontSize + theme.btnPaddingY * 2 + 16, 32);

export const resolvePanelPadding = (theme: ThemeSettings) => ({
  md: Math.max(theme.containerPaddingInner - 4, 12),
  lg: Math.max(theme.containerPaddingInner, 16),
  xl: Math.max(theme.containerPaddingInner + 8, 20),
});

export const resolveCardPadding = (theme: ThemeSettings) => ({
  sm: Math.max(theme.containerPaddingInner - 12, 8),
  md: Math.max(theme.containerPaddingInner - 8, 12),
  lg: Math.max(theme.containerPaddingInner - 4, 16),
  xl: Math.max(theme.containerPaddingInner, 20),
});

export const resolveStackGap = (theme: ThemeSettings) => ({
  sm: Math.max(Math.round(theme.gridGutter / 3), 8),
  md: Math.max(Math.round(theme.gridGutter * (2 / 3)), 12),
  lg: Math.max(Math.round(theme.gridGutter * (5 / 6)), 16),
});

export const resolveGradientIconTileRadius = (theme: ThemeSettings) => ({
  md: Math.max(theme.cardRadius - 10, 12),
  lg: Math.max(theme.cardRadius - 2, 20),
});

export const resolveChatRadius = (theme: ThemeSettings) => ({
  bubble: Math.max(theme.cardRadius - 4, 18),
  card: Math.max(theme.cardRadius - 4, 18),
  inset: Math.max(theme.cardRadius - 6, 16),
});

export const resolveChatPanelRadius = (theme: ThemeSettings) => ({
  minimal: Math.max(theme.cardRadius + 2, 24),
  compact: Math.max(theme.cardRadius - 2, 20),
  spotlightSm: Math.max(theme.cardRadius - 8, 16),
  spotlightMd: Math.max(theme.cardRadius - 4, 18),
});

export const resolveChatPadding = (theme: ThemeSettings) => {
  const cardPadding = resolveCardPadding(theme);

  return {
    xSm: cardPadding.sm,
    ySm: Math.max(cardPadding.sm - 4, 8),
    xMd: cardPadding.sm,
    yMd: Math.max(cardPadding.sm, 12),
    xLg: cardPadding.md,
    yLg: Math.max(cardPadding.sm, 12),
  };
};

export const resolveChatHeaderPadding = (theme: ThemeSettings) => {
  const chatPadding = resolveChatPadding(theme);

  return {
    xSm: chatPadding.xSm,
    ySm: Math.max(chatPadding.ySm + 2, 10),
    xMd: Math.max(chatPadding.xMd, 16),
    yMd: Math.max(chatPadding.yMd - 2, 12),
    xLg: Math.max(chatPadding.xLg, 20),
    yLg: Math.max(chatPadding.yLg, 16),
  };
};

export const resolveCmsStorefrontAppearance = (
  theme: ThemeSettings,
  mode: CmsStorefrontAppearanceMode
): {
  pageTone: Required<CmsAppearanceTone>;
  surfaceTone: Required<CmsAppearanceTone>;
  subtleSurface: string;
  mutedText: string;
  inputTone: Required<CmsAppearanceTone>;
  primaryButtonTone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const isDark = isDarkStorefrontAppearanceMode(mode);
  const accent = theme.accentColor || theme.primaryColor || theme.textColor;
  const pageTone = resolveStorefrontAppearanceTone(
    {
      background: theme.backgroundColor,
      text: theme.textColor,
      border: theme.borderColor,
      accent,
    },
    mode
  );
  const surfaceTone = resolveStorefrontAppearanceTone(
    {
      background: theme.surfaceColor,
      text: theme.textColor,
      border: theme.borderColor,
      accent,
    },
    mode
  );

  const subtleSurface = isDark
    ? `color-mix(in srgb, ${surfaceTone.background} 88%, white)`
    : darkenCssColor(surfaceTone.background, 4);

  const mutedText = resolveSolidColor(theme.mutedTextColor, pageTone.text);

  const inputTone = resolveStorefrontAppearanceTone(
    {
      background: theme.inputBg || theme.surfaceColor,
      text: theme.inputText || theme.textColor,
      border: theme.inputBorderColor || theme.borderColor,
      accent,
    },
    mode
  );

  const primaryButtonTone = resolveStorefrontAppearanceTone(
    {
      background: theme.btnPrimaryBg || accent,
      text: theme.btnPrimaryText || '#ffffff',
      border: theme.btnPrimaryBg || accent,
      accent,
    },
    mode
  );

  const pagePadding = resolvePagePadding(theme);
  const panelPadding = resolvePanelPadding(theme);
  const cardPadding = resolveCardPadding(theme);
  const stackGap = resolveStackGap(theme);
  const gradientIconTileRadius = resolveGradientIconTileRadius(theme);
  const chatRadius = resolveChatRadius(theme);
  const chatPanelRadius = resolveChatPanelRadius(theme);
  const chatPaddingSet = resolveChatPadding(theme);
  const chatHeaderPaddingSet = resolveChatHeaderPadding(theme);
  const buttonShadowBase = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(theme.backgroundColor, '#000000', 42)
    : mixCssColor(primaryButtonTone.background, '#000000', 18);

  const dropShadow = buildShadow({
    x: theme.btnShadowX,
    y: theme.btnShadowY,
    blur: theme.btnShadowBlur,
    color: buttonShadowBase,
    opacity: theme.btnShadowOpacity,
  });

  const primaryButtonShadow = buildGelButtonShadow(
    [dropShadow],
    theme,
    primaryButtonTone.background,
    isDark
  );

  const textShadow = resolveButtonTextShadow(theme, isDark);

  return {
    pageTone,
    surfaceTone,
    subtleSurface,
    mutedText,
    inputTone,
    primaryButtonTone,
    vars: {
      '--cms-appearance-bg': pageTone.background,
      '--cms-appearance-text': pageTone.text,
      '--cms-appearance-muted-text': mutedText,
      '--cms-appearance-accent': pageTone.accent,
      '--cms-appearance-border': pageTone.border,
      '--cms-appearance-surface': surfaceTone.background,
      '--cms-appearance-subtle-surface': subtleSurface,
      '--cms-appearance-input-bg': inputTone.background,
      '--cms-appearance-input-text': inputTone.text,
      '--cms-appearance-input-border': inputTone.border,
      '--cms-appearance-button-primary-bg': primaryButtonTone.background,
      '--cms-appearance-button-primary-text': primaryButtonTone.text,
      '--cms-appearance-button-primary-border': primaryButtonTone.border,
      '--cms-appearance-button-primary-shadow': primaryButtonShadow,
      '--cms-appearance-button-primary-text-shadow': textShadow,
      '--cms-appearance-page-padding-top': toCssPx(pagePadding.top),
      '--cms-appearance-page-padding-right': toCssPx(pagePadding.right),
      '--cms-appearance-page-padding-bottom': toCssPx(pagePadding.bottom),
      '--cms-appearance-page-padding-left': toCssPx(pagePadding.left),
      '--cms-appearance-panel-padding-md': toCssPx(panelPadding.md),
      '--cms-appearance-panel-padding-lg': toCssPx(panelPadding.lg),
      '--cms-appearance-panel-padding-xl': toCssPx(panelPadding.xl),
      '--cms-appearance-card-padding-sm': toCssPx(cardPadding.sm),
      '--cms-appearance-card-padding-md': toCssPx(cardPadding.md),
      '--cms-appearance-card-padding-lg': toCssPx(cardPadding.lg),
      '--cms-appearance-card-padding-xl': toCssPx(cardPadding.xl),
      '--cms-appearance-stack-gap-sm': toCssPx(stackGap.sm),
      '--cms-appearance-stack-gap-md': toCssPx(stackGap.md),
      '--cms-appearance-stack-gap-lg': toCssPx(stackGap.lg),
      '--cms-appearance-gradient-icon-tile-radius-md': toCssPx(gradientIconTileRadius.md),
      '--cms-appearance-gradient-icon-tile-radius-lg': toCssPx(gradientIconTileRadius.lg),
      '--cms-appearance-chat-bubble-radius': toCssPx(chatRadius.bubble),
      '--cms-appearance-chat-card-radius': toCssPx(chatRadius.card),
      '--cms-appearance-chat-inset-radius': toCssPx(chatRadius.inset),
      '--cms-appearance-chat-panel-radius-minimal': toCssPx(chatPanelRadius.minimal),
      '--cms-appearance-chat-panel-radius-compact': toCssPx(chatPanelRadius.compact),
      '--cms-appearance-chat-spotlight-radius-sm': toCssPx(chatPanelRadius.spotlightSm),
      '--cms-appearance-chat-spotlight-radius-md': toCssPx(chatPanelRadius.spotlightMd),
      '--cms-appearance-chat-padding-x-sm': toCssPx(chatPaddingSet.xSm),
      '--cms-appearance-chat-padding-y-sm': toCssPx(chatPaddingSet.ySm),
      '--cms-appearance-chat-padding-x-md': toCssPx(chatPaddingSet.xMd),
      '--cms-appearance-chat-padding-y-md': toCssPx(chatPaddingSet.yMd),
      '--cms-appearance-chat-padding-x-lg': toCssPx(chatPaddingSet.xLg),
      '--cms-appearance-chat-padding-y-lg': toCssPx(chatPaddingSet.yLg),
      '--cms-appearance-chat-header-padding-x-sm': toCssPx(chatHeaderPaddingSet.xSm),
      '--cms-appearance-chat-header-padding-y-sm': toCssPx(chatHeaderPaddingSet.ySm),
      '--cms-appearance-chat-header-padding-x-md': toCssPx(chatHeaderPaddingSet.xMd),
      '--cms-appearance-chat-header-padding-y-md': toCssPx(chatHeaderPaddingSet.yMd),
      '--cms-appearance-chat-header-padding-x-lg': toCssPx(chatHeaderPaddingSet.xLg),
      '--cms-appearance-chat-header-padding-y-lg': toCssPx(chatHeaderPaddingSet.yLg),
    },
  };
};

const resolveKangurRuntimeThemeVars = (theme: ThemeSettings): Record<string, string> => {
  const pagePadding = resolvePagePadding(theme);
  const panelPadding = resolvePanelPadding(theme);
  const cardPadding = resolveCardPadding(theme);
  const gradientIconTileRadius = resolveGradientIconTileRadius(theme);
  const chatRadius = resolveChatRadius(theme);
  const chatPanelRadius = resolveChatPanelRadius(theme);
  const chatPadding = resolveChatPadding(theme);
  const chatHeaderPadding = resolveChatHeaderPadding(theme);
  const stackGap = resolveStackGap(theme);

  return {
    '--kangur-font-heading': theme.headingFont,
    '--kangur-font-body': theme.bodyFont,
    '--kangur-font-base-size': toCssPx(theme.baseSize),
    '--kangur-font-line-height': String(theme.lineHeight),
    '--kangur-font-heading-line-height': String(theme.headingLineHeight),
    '--kangur-page-max-width': toCssPx(theme.maxContentWidth),
    '--kangur-page-padding-top': toCssPx(pagePadding.top),
    '--kangur-page-padding-right': toCssPx(pagePadding.right),
    '--kangur-page-padding-bottom': toCssPx(pagePadding.bottom),
    '--kangur-page-padding-left': toCssPx(pagePadding.left),
    '--kangur-grid-gutter': toCssPx(theme.gridGutter),
    '--kangur-panel-radius-elevated': toCssPx(theme.containerRadius + 10),
    '--kangur-panel-radius-soft': toCssPx(theme.containerRadius + 8),
    '--kangur-panel-radius-subtle': toCssPx(theme.containerRadius),
    '--kangur-card-radius': toCssPx(theme.cardRadius),
    '--kangur-lesson-callout-radius': toCssPx(Math.max(theme.cardRadius - 2, 0)),
    '--kangur-lesson-inset-radius': toCssPx(Math.max(theme.cardRadius - 8, 0)),
    '--kangur-gradient-icon-tile-radius-md': toCssPx(gradientIconTileRadius.md),
    '--kangur-gradient-icon-tile-radius-lg': toCssPx(gradientIconTileRadius.lg),
    '--kangur-chat-bubble-radius': toCssPx(chatRadius.bubble),
    '--kangur-chat-card-radius': toCssPx(chatRadius.card),
    '--kangur-chat-inset-radius': toCssPx(chatRadius.inset),
    '--kangur-chat-panel-radius-minimal': toCssPx(chatPanelRadius.minimal),
    '--kangur-chat-panel-radius-compact': toCssPx(chatPanelRadius.compact),
    '--kangur-chat-spotlight-radius-sm': toCssPx(chatPanelRadius.spotlightSm),
    '--kangur-chat-spotlight-radius-md': toCssPx(chatPanelRadius.spotlightMd),
    '--kangur-chat-padding-x-sm': toCssPx(chatPadding.xSm),
    '--kangur-chat-padding-y-sm': toCssPx(chatPadding.ySm),
    '--kangur-chat-padding-x-md': toCssPx(chatPadding.xMd),
    '--kangur-chat-padding-y-md': toCssPx(chatPadding.yMd),
    '--kangur-chat-padding-x-lg': toCssPx(chatPadding.xLg),
    '--kangur-chat-padding-y-lg': toCssPx(chatPadding.yLg),
    '--kangur-chat-header-padding-x-sm': toCssPx(chatHeaderPadding.xSm),
    '--kangur-chat-header-padding-y-sm': toCssPx(chatHeaderPadding.ySm),
    '--kangur-chat-header-padding-x-md': toCssPx(chatHeaderPadding.xMd),
    '--kangur-chat-header-padding-y-md': toCssPx(chatHeaderPadding.yMd),
    '--kangur-chat-header-padding-x-lg': toCssPx(chatHeaderPadding.xLg),
    '--kangur-chat-header-padding-y-lg': toCssPx(chatHeaderPadding.yLg),
    '--kangur-panel-padding-md': toCssPx(panelPadding.md),
    '--kangur-panel-padding-lg': toCssPx(panelPadding.lg),
    '--kangur-panel-padding-xl': toCssPx(panelPadding.xl),
    '--kangur-card-padding-sm': toCssPx(cardPadding.sm),
    '--kangur-card-padding-md': toCssPx(cardPadding.md),
    '--kangur-card-padding-lg': toCssPx(cardPadding.lg),
    '--kangur-card-padding-xl': toCssPx(cardPadding.xl),
    '--kangur-media-padding-sm': toCssPx(cardPadding.sm),
    '--kangur-media-padding-md': toCssPx(cardPadding.md),
    '--kangur-stack-gap-sm': toCssPx(stackGap.sm),
    '--kangur-stack-gap-md': toCssPx(stackGap.md),
    '--kangur-stack-gap-lg': toCssPx(stackGap.lg),
    '--kangur-nav-group-radius': toCssPx(theme.pillRadius + 10),
    '--kangur-nav-item-radius': toCssPx(theme.pillRadius),
    '--kangur-segmented-control-radius': toCssPx(theme.pillRadius + 8),
    '--kangur-segmented-item-radius': toCssPx(Math.max(theme.pillRadius - 2, 0)),
    '--kangur-menu-item-radius': toCssPx(Math.max(theme.pillRadius - 4, 0)),
    '--kangur-pill-padding-x': toCssPx(theme.pillPaddingX),
    '--kangur-pill-padding-y': toCssPx(theme.pillPaddingY),
    '--kangur-pill-font-size': toCssPx(theme.pillFontSize),
    '--kangur-button-padding-x': toCssPx(theme.btnPaddingX),
    '--kangur-button-padding-y': toCssPx(theme.btnPaddingY),
    '--kangur-button-font-size': toCssPx(theme.btnFontSize),
    '--kangur-button-height': toCssPx(resolveButtonHeight(theme)),
    '--kangur-button-radius': toCssPx(theme.btnRadius),
    '--kangur-input-height': toCssPx(theme.inputHeight),
    '--kangur-input-radius': toCssPx(theme.inputRadius),
    '--kangur-input-font-size': toCssPx(theme.inputFontSize),
  };
};

const resolveDefaultKangurStorefrontAppearance = (
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  if (isDarkStorefrontAppearanceMode(mode)) {
    return {
      background:
        'radial-gradient(circle at top, #283044 0%, #1b2333 44%, #111827 100%)',
      tone: {
        background: '#1b2333',
        text: '#e2e8f0',
        border: 'rgba(255,255,255,0.22)',
        accent: '#c7d2fe',
      },
      vars: {
        ...DEFAULT_KANGUR_RUNTIME_VARS,
        '--kangur-page-background':
          'radial-gradient(circle at top, #283044 0%, #1b2333 44%, #111827 100%)',
        '--kangur-glass-panel-background':
          'linear-gradient(180deg, rgba(30,41,59,0.78) 0%, rgba(15,23,42,0.72) 100%)',
        '--kangur-glass-panel-border': 'rgba(148,163,184,0.3)',
        '--kangur-glass-panel-shadow': '0 24px 60px rgba(2, 6, 23, 0.38)',
        '--kangur-soft-card-background': 'rgba(30,41,59,0.9)',
        '--kangur-soft-card-border': 'rgba(148,163,184,0.26)',
        '--kangur-soft-card-shadow': '0 18px 42px rgba(2, 6, 23, 0.28)',
        '--kangur-soft-card-text': '#e2e8f0',
        '--kangur-nav-group-background':
          'linear-gradient(180deg, rgba(30,41,59,0.86) 0%, rgba(15,23,42,0.8) 100%)',
        '--kangur-nav-group-border': 'rgba(148,163,184,0.34)',
        '--kangur-nav-item-text': '#cbd5e1',
        '--kangur-nav-item-hover-background': 'rgba(51,65,85,0.74)',
        '--kangur-nav-item-hover-border': 'rgba(148,163,184,0.4)',
        '--kangur-nav-item-hover-text': '#f8fafc',
        '--kangur-nav-item-active-background':
          'linear-gradient(180deg, rgba(55,65,102,0.96) 0%, rgba(49,46,129,0.88) 100%)',
        '--kangur-nav-item-active-border': 'rgba(199,210,254,0.42)',
        '--kangur-nav-item-active-text': '#eef2ff',
        '--kangur-text-field-background': 'rgba(30,41,59,0.92)',
        '--kangur-text-field-border': 'rgba(148,163,184,0.3)',
        '--kangur-text-field-text': '#e2e8f0',
        '--kangur-text-field-placeholder': '#94a3b8',
        '--kangur-text-field-disabled-background': 'rgba(30,41,59,0.68)',
        '--kangur-text-field-disabled-border': 'rgba(100,116,139,0.22)',
        '--kangur-progress-track': 'rgba(51,65,85,0.92)',
        '--kangur-page-text': '#e2e8f0',
        '--kangur-page-muted-text': '#94a3b8',
        '--kangur-button-primary-background':
          'linear-gradient(90deg, #d97706 0%, #9a3412 100%)',
        '--kangur-button-primary-hover-background':
          'linear-gradient(90deg, #ea8a0d 0%, #b45309 56%, #9a3412 100%)',
        '--kangur-button-primary-shadow':
          '0 12px 24px rgba(154, 52, 18, 0.32), inset 0 1px 0 rgba(255, 247, 237, 0.14)',
        '--kangur-button-primary-hover-shadow':
          '0 22px 34px -18px rgba(154, 52, 18, 0.4), 0 14px 24px -18px rgba(180, 83, 9, 0.24), inset 0 1px 0 rgba(255, 250, 245, 0.18)',
        '--kangur-button-secondary-background':
          'linear-gradient(180deg, rgba(51,65,85,0.98) 0%, rgba(15,23,42,0.96) 100%)',
        '--kangur-button-secondary-hover-background':
          'linear-gradient(180deg, rgba(71,85,105,0.98) 0%, rgba(30,41,59,0.98) 100%)',
        '--kangur-button-secondary-shadow':
          '0 16px 28px -24px rgba(2, 6, 23, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        '--kangur-button-secondary-text': '#dbe7f6',
        '--kangur-button-secondary-hover-text': '#f8fafc',
        '--kangur-button-surface-background':
          'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(17,24,39,0.98) 100%)',
        '--kangur-button-surface-hover-background':
          'linear-gradient(180deg, rgba(51,65,85,0.99) 0%, rgba(30,41,59,0.99) 100%)',
        '--kangur-button-surface-shadow':
          '0 16px 28px -24px rgba(37, 99, 235, 0.22), inset 0 1px 0 rgba(191, 219, 254, 0.08)',
        '--kangur-button-surface-text': '#bfdbfe',
        '--kangur-button-surface-hover-text': '#eff6ff',
        '--kangur-button-warning-background':
          'linear-gradient(180deg, rgba(120,53,15,0.96) 0%, rgba(68,26,6,0.96) 100%)',
        '--kangur-button-warning-hover-background':
          'linear-gradient(180deg, rgba(146,64,14,0.98) 0%, rgba(92,33,6,0.98) 100%)',
        '--kangur-button-warning-shadow':
          '0 16px 28px -24px rgba(120, 53, 15, 0.48), inset 0 1px 0 rgba(255, 247, 237, 0.1)',
        '--kangur-button-warning-hover-shadow':
          '0 20px 32px -24px rgba(120, 53, 15, 0.56), 0 14px 24px -24px rgba(180, 83, 9, 0.18), inset 0 1px 0 rgba(255, 247, 237, 0.14)',
        '--kangur-button-warning-text': '#fde68a',
        '--kangur-button-warning-hover-text': '#fef3c7',
        '--kangur-button-success-background':
          'linear-gradient(180deg, rgba(6,78,59,0.96) 0%, rgba(2,44,34,0.96) 100%)',
        '--kangur-button-success-shadow':
          '0 16px 28px -24px rgba(4, 120, 87, 0.44), inset 0 1px 0 rgba(236, 253, 245, 0.1)',
        '--kangur-button-success-text': '#d1fae5',
        '--kangur-button-success-hover-text': '#ecfdf5',
        '--kangur-chat-panel-background':
          'linear-gradient(180deg, rgba(31,41,55,0.96) 0%, rgba(17,24,39,0.97) 100%)',
        '--kangur-chat-panel-border': 'rgba(251, 191, 36, 0.2)',
        '--kangur-chat-panel-shadow':
          '0 20px 48px -30px rgba(2, 6, 23, 0.56), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        '--kangur-chat-header-background':
          'linear-gradient(180deg, rgba(69,26,3,0.54) 0%, rgba(30,41,59,0.94) 100%)',
        '--kangur-chat-header-snap-background':
          'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background) 68%, rgba(251,191,36,0.32)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 78%, rgba(251,191,36,0.22)) 100%)',
        '--kangur-chat-header-border': 'rgba(251, 191, 36, 0.18)',
        '--kangur-chat-spotlight-border': 'rgba(252, 211, 77, 0.42)',
        '--kangur-chat-spotlight-background':
          'color-mix(in srgb, rgba(250, 204, 21, 0.2) 72%, transparent)',
        '--kangur-chat-spotlight-shadow':
          'color-mix(in srgb, rgba(250, 204, 21, 0.18) 72%, transparent)',
        '--kangur-chat-avatar-shell-background': 'rgba(255,255,255,0.12)',
        '--kangur-chat-avatar-shell-border': 'rgba(255,255,255,0.25)',
        '--kangur-chat-avatar-shell-shadow':
          'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.12)',
        '--kangur-chat-avatar-svg-shadow': '0 1px 2px rgba(15,23,42,0.18)',
        '--kangur-chat-warm-overlay-background':
          'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(251,191,36,0.32)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 72%, var(--kangur-page-background)) 44%, color-mix(in srgb, var(--kangur-page-background) 86%, rgba(251,191,36,0.16)) 100%)',
        '--kangur-chat-warm-overlay-border': 'rgba(251,191,36,0.32)',
        '--kangur-chat-warm-overlay-shadow-callout':
          '0 20px 48px -30px rgba(2,6,23,0.68), inset 0 1px 0 rgba(255,255,255,0.18)',
        '--kangur-chat-warm-overlay-shadow-modal':
          '0 26px 60px -34px rgba(2,6,23,0.72), inset 0 1px 0 rgba(255,255,255,0.18)',
        '--kangur-chat-pointer-glow': '#fef3c7',
        '--kangur-chat-pointer-marker': '#f59e0b',
        '--kangur-chat-tail-background': 'var(--kangur-soft-card-background)',
        '--kangur-chat-tail-border': 'rgba(251,191,36,0.24)',
        '--kangur-chat-sheet-handle-background': 'rgba(251,191,36,0.22)',
        '--kangur-chat-composer-background':
          'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background) 92%, transparent) 0%, transparent 100%)',
        '--kangur-chat-selection-badge-background':
          'color-mix(in srgb, var(--kangur-soft-card-background) 28%, rgba(255,255,255,0.14))',
        '--kangur-chat-divider':
          'color-mix(in srgb, var(--kangur-soft-card-border) 82%, rgba(251,191,36,0.18))',
        '--kangur-chat-surface-soft-background':
          'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 92%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, var(--kangur-page-background)) 100%)',
        '--kangur-chat-surface-soft-border': 'var(--kangur-soft-card-border)',
        '--kangur-chat-surface-soft-shadow': '0 12px 28px -18px rgba(2,6,23,0.55)',
        '--kangur-chat-surface-warm-background':
          'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 92%, rgba(251,191,36,0.28)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(245,158,11,0.22)) 100%)',
        '--kangur-chat-surface-warm-border':
          'color-mix(in srgb, var(--kangur-soft-card-border) 72%, rgba(251,191,36,0.6))',
        '--kangur-chat-surface-warm-shadow': '0 8px 18px -12px rgba(2,6,23,0.65)',
        '--kangur-chat-surface-info-background':
          'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 90%, rgba(56,189,248,0.22)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(37,99,235,0.18)) 100%)',
        '--kangur-chat-surface-info-border':
          'color-mix(in srgb, var(--kangur-soft-card-border) 72%, rgba(56,189,248,0.6))',
        '--kangur-chat-surface-info-shadow': '0 8px 18px -12px rgba(2,6,23,0.6)',
        '--kangur-chat-surface-success-background':
          'color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(52,211,153,0.22))',
        '--kangur-chat-surface-success-border':
          'color-mix(in srgb, var(--kangur-soft-card-border) 72%, rgba(52,211,153,0.6))',
        '--kangur-chat-surface-success-shadow': '0 6px 16px -10px rgba(2,6,23,0.55)',
        '--kangur-chat-panel-text': '#f8fafc',
        '--kangur-chat-muted-text': '#d7e1ee',
        '--kangur-chat-kicker-text': '#fde68a',
        '--kangur-chat-kicker-dot': '#f59e0b',
        '--kangur-chat-chip-background':
          'linear-gradient(135deg, rgba(92,33,6,0.84), rgba(69,26,3,0.78))',
        '--kangur-chat-chip-border': 'rgba(251, 191, 36, 0.22)',
        '--kangur-chat-chip-text': '#fff7ed',
        '--kangur-chat-control-background':
          'linear-gradient(180deg, rgba(69,26,3,0.72) 0%, rgba(51,22,6,0.7) 100%)',
        '--kangur-chat-control-hover-background':
          'linear-gradient(180deg, rgba(92,33,6,0.84) 0%, rgba(68,28,7,0.82) 100%)',
        '--kangur-chat-control-border': 'rgba(251, 191, 36, 0.22)',
        '--kangur-chat-control-text': '#fff7ed',
      },
    };
  }

  return {
    background: 'radial-gradient(circle at top, #ece3e9 0%, #ddd6e3 48%, #cec9dd 100%)',
    tone: {
      background: '#e3d9e2',
      text: '#415066',
      border: 'rgba(255,255,255,0.68)',
      accent: '#4f46e5',
    },
    vars: {
      ...DEFAULT_KANGUR_RUNTIME_VARS,
      '--kangur-page-background':
        'radial-gradient(circle at top, #ece3e9 0%, #ddd6e3 48%, #cec9dd 100%)',
      '--kangur-glass-panel-background':
        'linear-gradient(180deg, rgba(246,241,245,0.78) 0%, rgba(226,219,231,0.86) 100%)',
      '--kangur-glass-panel-border': 'rgba(248,244,248,0.74)',
      '--kangur-glass-panel-shadow': '0 20px 60px rgba(101, 92, 131, 0.24)',
      '--kangur-soft-card-background': 'rgba(240,234,241,0.95)',
      '--kangur-soft-card-border': 'rgba(216,208,226,0.94)',
      '--kangur-soft-card-shadow': '0 16px 38px rgba(65, 76, 116, 0.12)',
      '--kangur-soft-card-text': '#324055',
      '--kangur-nav-group-background':
        'linear-gradient(180deg, rgba(246,241,245,0.84) 0%, rgba(228,221,234,0.76) 100%)',
      '--kangur-nav-group-border': 'rgba(248,244,248,0.76)',
      '--kangur-nav-item-text': '#4a5971',
      '--kangur-nav-item-hover-background': 'rgba(242,237,244,0.9)',
      '--kangur-nav-item-hover-border': 'rgba(248,244,248,0.8)',
      '--kangur-nav-item-hover-text': '#324055',
      '--kangur-nav-item-active-background':
        'linear-gradient(180deg, rgba(245,241,247,0.98) 0%, rgba(225,220,248,0.95) 100%)',
      '--kangur-nav-item-active-border': 'rgba(214,220,248,0.92)',
      '--kangur-nav-item-active-text': '#4338ca',
      '--kangur-text-field-background': 'rgba(240,234,241,0.95)',
      '--kangur-text-field-border': 'rgba(216,208,226,0.94)',
      '--kangur-text-field-text': '#324055',
      '--kangur-text-field-placeholder': '#5e6d85',
      '--kangur-text-field-disabled-background': 'rgba(229,222,232,0.94)',
      '--kangur-text-field-disabled-border': 'rgba(208,200,219,0.94)',
      '--kangur-progress-track': 'rgba(212,217,231,0.92)',
      '--kangur-page-text': '#324055',
      '--kangur-page-muted-text': '#5e6d85',
    },
  };
};

const resolveThemedKangurStorefrontAppearance = (
  theme: ThemeSettings,
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const accent = theme.accentColor || theme.primaryColor || theme.secondaryColor || theme.textColor;
  const isDark = isDarkStorefrontAppearanceMode(mode);
  const primary = theme.primaryColor || accent;
  const secondary = theme.secondaryColor || primary;
  const infoBackground = secondary;
  const surfaceBackground = theme.cardBg || theme.containerBg || theme.surfaceColor;
  const borderColor =
    theme.containerBorderColor || theme.borderColor || theme.inputBorderColor || theme.btnOutlineBorder;
  const inputBackground = theme.inputBg || surfaceBackground;
  const inputText = theme.inputText || theme.textColor;
  const inputBorderColor = theme.inputBorderColor || borderColor;
  const navBackground = theme.pillBg || surfaceBackground;
  const navText = theme.pillText || theme.mutedTextColor;
  const navActiveBackground = theme.pillActiveBg || primary;
  const navActiveText = theme.pillActiveText || theme.btnPrimaryText || '#ffffff';
  const primaryButtonText = isDark
    ? mixCssColor(theme.btnPrimaryText || '#ffffff', '#ffffff', 92)
    : theme.btnPrimaryText || '#ffffff';
  const buttonTextShadow = resolveButtonTextShadow(theme, isDark);
  const buttonGlossOpacity = clampNumber(theme.btnGlossOpacity, 0, 1) * (isDark ? 0.65 : 1);
  const buttonGlossHeight = `${clampNumber(theme.btnGlossHeight, 0, 100)}%`;
  const buttonGlossAngle = `${clampNumber(theme.btnGlossAngle, 0, 360)}deg`;
  const buttonGlossColor = isNonEmptyString(theme.btnGlossColor) ? theme.btnGlossColor.trim() : '#ffffff';
  const buttonBorderOpacity = clampNumber(theme.btnBorderOpacity, 0, 100) / 100;
  const buttonBorderColor = applyTransparency(
    isNonEmptyString(theme.btnOutlineBorder) ? theme.btnOutlineBorder.trim() : borderColor,
    buttonBorderOpacity
  );
  const buttonBorderWidth = toCssPx(theme.btnBorderWidth);
  const buttonBorderRadius = toCssPx(theme.btnBorderRadius);
  const primaryButtonBase = resolveSolidColor(theme.btnPrimaryBg, primary);
  const secondaryButtonBase = resolveSolidColor(theme.btnSecondaryBg, surfaceBackground);
  const warningBackground = theme.accentColor || accent;
  const successBackground = theme.successColor || '#22c55e';
  const chatBackground = theme.containerBg || surfaceBackground;
  const runtimeThemeVars = resolveKangurRuntimeThemeVars(theme);
  const homeActionVars = resolveHomeActionVars(theme);
  const baseToneText = isDarkStorefrontAppearanceMode(mode) ? '#f8fafc' : theme.textColor;
  const baseMutedText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(theme.mutedTextColor, '#ffffff', 72)
    : theme.mutedTextColor;
  const resolveTextOverride = (value: string | undefined, fallback: string): string =>
    isNonEmptyString(value) ? value.trim() : fallback;
  const toneText = resolveTextOverride(theme.pageTextColor, baseToneText);
  const pageMutedText = resolveTextOverride(theme.pageMutedTextColor, baseMutedText);
  const cardText = resolveTextOverride(theme.cardTextColor, toneText);
  const navTextOverride = isNonEmptyString(theme.navTextColor)
    ? theme.navTextColor.trim()
    : null;
  const navActiveTextOverride = isNonEmptyString(theme.navActiveTextColor)
    ? theme.navActiveTextColor.trim()
    : null;
  const navHoverTextOverride = isNonEmptyString(theme.navHoverTextColor)
    ? theme.navHoverTextColor.trim()
    : null;
  const pageTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: theme.backgroundColor,
            text: theme.textColor,
            border: borderColor,
            accent,
          },
          mode
        )
      : {
          background: theme.backgroundColor,
          text: toneText,
          border: borderColor,
          accent,
        };
  const surfaceTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: surfaceBackground,
            text: theme.textColor,
            border: borderColor,
            accent,
          },
          mode
        )
      : {
          background: surfaceBackground,
          text: toneText,
          border: borderColor,
          accent,
        };
  const inputTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: inputBackground,
            text: inputText,
            border: inputBorderColor,
            accent,
          },
          mode
        )
      : {
          background: inputBackground,
          text: inputText,
          border: inputBorderColor,
          accent,
        };
  const background =
    isDarkStorefrontAppearanceMode(mode)
      ? `radial-gradient(circle at top, ${mixCssColor(primary, theme.backgroundColor, 18)} 0%, ${mixCssColor(theme.surfaceColor, theme.backgroundColor, 64)} 44%, ${darkenCssColor(theme.backgroundColor, 22)} 100%)`
      : `radial-gradient(circle at top, ${mixCssColor(accent, theme.backgroundColor, 12)} 0%, ${mixCssColor(theme.surfaceColor, theme.backgroundColor, 52)} 48%, ${mixCssColor(secondary, theme.backgroundColor, 10)} 100%)`;
  const softSurfaceStart = mixCssColor(
    surfaceTone.background,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 92 : 92
  );
  const softSurfaceEnd = mixCssColor(
    surfaceTone.background,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 86 : 84
  );
  const warmSurfaceStart = mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 90 : 92
  );
  const warmSurfaceEnd = mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 84 : 86
  );
  const infoSurfaceStart = mixCssColor(
    surfaceTone.background,
    infoBackground,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 90
  );
  const infoSurfaceEnd = mixCssColor(
    surfaceTone.background,
    infoBackground,
    isDarkStorefrontAppearanceMode(mode) ? 82 : 86
  );
  const successSurface = mixCssColor(
    surfaceTone.background,
    successBackground,
    isDarkStorefrontAppearanceMode(mode) ? 86 : 82
  );
  const dividerColor = mixCssColor(borderColor, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 68 : 74);
  const softSurfaceShadow =
    isDarkStorefrontAppearanceMode(mode)
      ? `0 12px 28px -18px ${mixCssColor(theme.backgroundColor, '#000000', 60)}`
      : `0 12px 28px -18px ${mixCssColor(theme.backgroundColor, '#000000', 18)}`;
  const warmSurfaceShadow = `0 8px 18px -12px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 54 : 24
  )}`;
  const infoSurfaceShadow = `0 8px 18px -12px ${mixCssColor(
    infoBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 54 : 24
  )}`;
  const successSurfaceShadow = `0 6px 16px -10px ${mixCssColor(
    successBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 52 : 22
  )}`;
  const composerBackground = `linear-gradient(180deg, ${mixCssColor(
    surfaceTone.background,
    'transparent',
    isDarkStorefrontAppearanceMode(mode) ? 92 : 88
  )} 0%, transparent 100%)`;
  const selectionBadgeBackground = `color-mix(in srgb, ${surfaceTone.background} ${
    isDarkStorefrontAppearanceMode(mode) ? 28 : 18
  }%, rgba(255,255,255,${isDarkStorefrontAppearanceMode(mode) ? '0.14' : '0.16'}))`;
  const backdropBase = '#0f172a';
  const backdrop = `color-mix(in srgb, ${backdropBase} ${isDarkStorefrontAppearanceMode(mode) ? 28 : 18}%, transparent)`;
  const backdropStrong = `color-mix(in srgb, ${backdropBase} ${isDarkStorefrontAppearanceMode(mode) ? 44 : 32}%, transparent)`;
  const panelSnapRing = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  );
  const panelSnapShadow = `0 0 0 1px ${mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 26 : 22
  )}, 0 28px 56px -28px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 72 : 46
  )}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 16 : 60)}`;
  const warmOverlayBackground = `radial-gradient(circle at top, ${mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 26 : 22
  )} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 76 : 64)} 44%, ${mixCssColor(
    pageTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 8 : 12
  )} 100%)`;
  const warmOverlayBorder = mixCssColor(borderColor, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 54 : 60);
  const warmOverlayInset =
    isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)';
  const warmOverlayShadowCallout = `0 20px 48px -30px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  )}, inset 0 1px 0 ${warmOverlayInset}`;
  const warmOverlayShadowModal = `0 26px 60px -34px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  )}, inset 0 1px 0 ${warmOverlayInset}`;
  const panelTransparency = clampNumber(theme.panelTransparency ?? 1, 0, 1);
  const navTransparency = clampNumber(theme.navTransparency ?? 1, 0, 1);
  const panelGradientStart = theme.panelGradientStart?.trim()
    ? theme.panelGradientStart
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(surfaceTone.background, '#000000', 80)
      : mixCssColor(surfaceTone.background, '#ffffff', 86);
  const panelGradientEnd = theme.panelGradientEnd?.trim()
    ? theme.panelGradientEnd
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(surfaceTone.background, pageTone.background, 86)
      : mixCssColor(surfaceTone.background, pageTone.background, 92);
  const navGradientStart = theme.navGradientStart?.trim()
    ? theme.navGradientStart
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(navBackground, '#000000', 84)
      : mixCssColor(navBackground, '#ffffff', 90);
  const navGradientEnd = theme.navGradientEnd?.trim()
    ? theme.navGradientEnd
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(navBackground, pageTone.background, 88)
      : mixCssColor(navBackground, pageTone.background, 86);
  const panelGradientStartWithAlpha = applyTransparency(panelGradientStart, panelTransparency);
  const panelGradientEndWithAlpha = applyTransparency(panelGradientEnd, panelTransparency);
  const navGradientStartWithAlpha = applyTransparency(navGradientStart, navTransparency);
  const navGradientEndWithAlpha = applyTransparency(navGradientEnd, navTransparency);
  const panelShadowBase =
    isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(theme.backgroundColor, '#000000', 42)
      : mixCssColor(primary, '#000000', 18);
  const cardShadowBase =
    isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(theme.backgroundColor, '#000000', 34)
      : mixCssColor(primary, '#000000', 12);
  const progressTrack = theme.progressTrackColor?.trim()
    ? theme.progressTrackColor
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(borderColor, pageTone.background, 48)
      : mixCssColor(borderColor, pageTone.background, 64);
  const glassPanelShadow = buildShadow({
    x: theme.containerShadowX,
    y: theme.containerShadowY,
    blur: theme.containerShadowBlur,
    color: panelShadowBase,
    opacity: theme.containerShadowOpacity,
  });
  const softCardShadow = buildShadow({
    x: theme.cardShadowX,
    y: theme.cardShadowY,
    blur: theme.cardShadowBlur,
    color: cardShadowBase,
    opacity: theme.cardShadowOpacity,
  });
  const primaryButtonBackgroundComputed = `linear-gradient(90deg, ${mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 82 : 68
  )} 0%, ${darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 18 : 8)} 100%)`;
  const primaryButtonHoverBackgroundComputed = `linear-gradient(90deg, ${mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 58
  )} 0%, ${darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 10 : 2)} 56%, ${darkenCssColor(
    primaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? 20 : 10
  )} 100%)`;
  const secondaryButtonBackgroundComputed = `linear-gradient(180deg, ${mixCssColor(
    secondaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 88 : 92
  )} 0%, ${mixCssColor(
    secondaryButtonBase,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 92 : 84
  )} 100%)`;
  const secondaryButtonHoverBackgroundComputed = `linear-gradient(180deg, ${mixCssColor(
    secondaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 78 : 86
  )} 0%, ${mixCssColor(
    secondaryButtonBase,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 80
  )} 100%)`;
  const primaryButtonBackground = resolveBackgroundValue(
    theme.btnPrimaryBg,
    primaryButtonBackgroundComputed
  );
  const primaryButtonHoverBackground = resolveBackgroundValue(
    theme.btnPrimaryBg,
    primaryButtonHoverBackgroundComputed
  );
  const secondaryButtonBackground = resolveBackgroundValue(
    theme.btnSecondaryBg,
    secondaryButtonBackgroundComputed
  );
  const secondaryButtonHoverBackground = resolveBackgroundValue(
    theme.btnSecondaryBg,
    secondaryButtonHoverBackgroundComputed
  );
  const gradientSoftMid = mixCssColor(
    surfaceTone.background,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 24 : 92
  );
  const primaryGradientStops = isGradientValue(theme.btnPrimaryBg)
    ? extractGradientStops(theme.btnPrimaryBg)
    : [];
  const hasPrimaryGradientStops = primaryGradientStops.length >= 2;
  const primaryGradientStopBase = primaryGradientStops[0] ?? primaryButtonBase;
  const primaryGradientStopStart = hasPrimaryGradientStops ? primaryGradientStopBase : null;
  const primaryGradientStopEnd = hasPrimaryGradientStops
    ? primaryGradientStops[primaryGradientStops.length - 1] ?? primaryGradientStopBase
    : null;
  const primaryGradientStopMid = hasPrimaryGradientStops
    ? primaryGradientStops[1] ??
      mixCssColor(primaryGradientStopBase, primaryGradientStopEnd ?? primaryGradientStopBase, 50)
    : null;
  const primaryGradientStart =
    primaryGradientStopStart ??
    mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 68);
  const primaryGradientMid =
    primaryGradientStopMid ??
    mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 58);
  const primaryGradientEnd =
    primaryGradientStopEnd ??
    darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 18 : 8);
  const primaryGradientHoverStart = hasPrimaryGradientStops
    ? mixCssColor(primaryGradientStart, '#ffffff', isDark ? 74 : 82)
    : mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 58);
  const primaryGradientHoverMid = hasPrimaryGradientStops
    ? mixCssColor(primaryGradientMid, '#ffffff', isDark ? 70 : 78)
    : darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 10 : 2);
  const primaryGradientHoverEnd = hasPrimaryGradientStops
    ? darkenCssColor(primaryGradientEnd, isDark ? 8 : 6)
    : darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 20 : 10);
  const primaryGradientActiveStart = darkenCssColor(primaryGradientStart, isDark ? 10 : 6);
  const primaryGradientActiveMid = darkenCssColor(primaryGradientMid, isDark ? 10 : 6);
  const primaryGradientActiveEnd = darkenCssColor(primaryGradientEnd, isDark ? 12 : 8);
  const warningGradientStart = mixCssColor(
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 84 : 76
  );
  const warningGradientEnd = mixCssColor(
    warningBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 68
  );
  const warningGradientHoverStart = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 68
  );
  const warningGradientHoverEnd = mixCssColor(
    warningBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 82 : 62
  );
  const successGradientStart = mixCssColor(
    successBackground,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 86 : 78
  );
  const successGradientEnd = mixCssColor(
    successBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 90 : 70
  );
  const primaryButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -18px ${mixCssColor(primaryButtonBase, '#000000', isDark ? 36 : 24)}`],
    theme,
    primaryButtonBase,
    isDark
  );
  const secondaryButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -20px ${mixCssColor(secondaryButtonBase, '#000000', isDark ? 46 : 24)}`],
    theme,
    secondaryButtonBase,
    isDark
  );
  const surfaceButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -20px ${mixCssColor(primary, '#000000', isDark ? 28 : 18)}`],
    theme,
    primary,
    isDark
  );
  const resolveLogoOverride = (value: string | undefined, fallback: string): string =>
    isNonEmptyString(value) ? value.trim() : fallback;
  const logoWordStart = resolveLogoOverride(theme.logoWordStart, primary);
  const logoWordMid = resolveLogoOverride(theme.logoWordMid, mixCssColor(primary, secondary, 60));
  const logoWordEnd = resolveLogoOverride(theme.logoWordEnd, secondary);
  const logoRingStart = resolveLogoOverride(
    theme.logoRingStart,
    mixCssColor(primary, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 70 : 82)
  );
  const logoRingEnd = resolveLogoOverride(
    theme.logoRingEnd,
    mixCssColor(secondary, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 68 : 80)
  );
  const logoAccentStart = resolveLogoOverride(
    theme.logoAccentStart,
    mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 70 : 86)
  );
  const logoAccentEnd = resolveLogoOverride(
    theme.logoAccentEnd,
    mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 30 : 12)
  );
  const logoInnerStart = resolveLogoOverride(
    theme.logoInnerStart,
    mixCssColor(surfaceTone.background, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 24 : 94)
  );
  const logoInnerEnd = resolveLogoOverride(
    theme.logoInnerEnd,
    mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 40 : 86)
  );
  const logoShadow = resolveLogoOverride(
    theme.logoShadow,
    darkenCssColor(primary, isDarkStorefrontAppearanceMode(mode) ? 48 : 20)
  );
  const logoGlint = resolveLogoOverride(
    theme.logoGlint,
    mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 92)
  );

  return {
    background,
    tone: {
      background: pageTone.background,
      text: toneText,
      border: pageTone.border,
      accent,
    },
    vars: {
      ...runtimeThemeVars,
      ...homeActionVars,
      '--kangur-page-background': background,
      '--kangur-logo-word-start': logoWordStart,
      '--kangur-logo-word-mid': logoWordMid,
      '--kangur-logo-word-end': logoWordEnd,
      '--kangur-logo-ring-start': logoRingStart,
      '--kangur-logo-ring-end': logoRingEnd,
      '--kangur-logo-accent-start': logoAccentStart,
      '--kangur-logo-accent-end': logoAccentEnd,
      '--kangur-logo-inner-start': logoInnerStart,
      '--kangur-logo-inner-end': logoInnerEnd,
      '--kangur-logo-shadow': logoShadow,
      '--kangur-logo-glint': logoGlint,
      '--kangur-glass-panel-background': `linear-gradient(180deg, ${panelGradientStartWithAlpha} 0%, ${panelGradientEndWithAlpha} 100%)`,
      '--kangur-glass-panel-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 34)
          : mixCssColor(borderColor, '#ffffff', 74),
      '--kangur-glass-panel-shadow': glassPanelShadow,
      '--kangur-soft-card-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(surfaceTone.background, pageTone.background, 90)
          : mixCssColor(surfaceTone.background, '#ffffff', 94),
      '--kangur-soft-card-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 28)
          : darkenCssColor(borderColor, 4),
      '--kangur-soft-card-shadow': softCardShadow,
      '--kangur-soft-card-text': cardText,
      '--kangur-nav-group-background': `linear-gradient(180deg, ${navGradientStartWithAlpha} 0%, ${navGradientEndWithAlpha} 100%)`,
      '--kangur-nav-group-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 34)
          : mixCssColor(borderColor, '#ffffff', 72),
      '--kangur-nav-item-text':
        navTextOverride ??
        (isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navText, '#ffffff', 84)
          : navText),
      '--kangur-nav-item-hover-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navBackground, pageTone.background, 76)
          : mixCssColor(navBackground, '#ffffff', 94),
      '--kangur-nav-item-hover-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 40)
          : mixCssColor(borderColor, '#ffffff', 76),
      '--kangur-nav-item-hover-text': navHoverTextOverride ?? toneText,
      '--kangur-nav-item-active-background':
        `linear-gradient(180deg, ${mixCssColor(navActiveBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 88 : 72)} 0%, ${darkenCssColor(navActiveBackground, isDarkStorefrontAppearanceMode(mode) ? 22 : 8)} 100%)`,
      '--kangur-nav-item-active-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navActiveBackground, '#ffffff', 38)
          : mixCssColor(navActiveBackground, '#ffffff', 56),
      '--kangur-nav-item-active-text':
        navActiveTextOverride ??
        (isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navActiveText, '#ffffff', 92)
          : darkenCssColor(navActiveBackground, 24)),
      '--kangur-text-field-background': inputTone.background,
      '--kangur-text-field-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.border, '#ffffff', 28)
          : inputTone.border,
      '--kangur-text-field-text': inputTone.text,
      '--kangur-text-field-placeholder':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.inputPlaceholder, '#ffffff', 78)
          : theme.inputPlaceholder,
      '--kangur-text-field-disabled-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.background, pageTone.background, 72)
          : mixCssColor(inputTone.background, pageTone.background, 84),
      '--kangur-text-field-disabled-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.border, '#ffffff', 18)
          : mixCssColor(inputTone.border, pageTone.background, 72),
      '--kangur-progress-track': progressTrack,
      '--kangur-accent-indigo-start': theme.gradientIndigoStart,
      '--kangur-accent-indigo-end': theme.gradientIndigoEnd,
      '--kangur-accent-violet-start': theme.gradientVioletStart,
      '--kangur-accent-violet-end': theme.gradientVioletEnd,
      '--kangur-accent-emerald-start': theme.gradientEmeraldStart,
      '--kangur-accent-emerald-end': theme.gradientEmeraldEnd,
      '--kangur-accent-sky-start': theme.gradientSkyStart,
      '--kangur-accent-sky-end': theme.gradientSkyEnd,
      '--kangur-accent-amber-start': theme.gradientAmberStart,
      '--kangur-accent-amber-end': theme.gradientAmberEnd,
      '--kangur-accent-rose-start': theme.gradientRoseStart,
      '--kangur-accent-rose-end': theme.gradientRoseEnd,
      '--kangur-accent-teal-start': theme.gradientTealStart,
      '--kangur-accent-teal-end': theme.gradientTealEnd,
      '--kangur-accent-slate-start': theme.gradientSlateStart,
      '--kangur-accent-slate-end': theme.gradientSlateEnd,
      '--kangur-gradient-soft-mid': gradientSoftMid,
      '--kangur-cta-primary-start': primaryGradientStart,
      '--kangur-cta-primary-mid': primaryGradientMid,
      '--kangur-cta-primary-end': primaryGradientEnd,
      '--kangur-cta-primary-hover-start': primaryGradientHoverStart,
      '--kangur-cta-primary-hover-mid': primaryGradientHoverMid,
      '--kangur-cta-primary-hover-end': primaryGradientHoverEnd,
      '--kangur-cta-primary-active-start': primaryGradientActiveStart,
      '--kangur-cta-primary-active-mid': primaryGradientActiveMid,
      '--kangur-cta-primary-active-end': primaryGradientActiveEnd,
      '--kangur-cta-warning-start': warningGradientStart,
      '--kangur-cta-warning-end': warningGradientEnd,
      '--kangur-cta-warning-hover-start': warningGradientHoverStart,
      '--kangur-cta-warning-hover-end': warningGradientHoverEnd,
      '--kangur-cta-success-start': successGradientStart,
      '--kangur-cta-success-end': successGradientEnd,
      '--kangur-page-text': toneText,
      '--kangur-page-muted-text': pageMutedText,
      '--kangur-button-text-shadow': buttonTextShadow,
      '--kangur-button-gloss-opacity': String(buttonGlossOpacity),
      '--kangur-button-gloss-height': buttonGlossHeight,
      '--kangur-button-gloss-angle': buttonGlossAngle,
      '--kangur-button-gloss-color': buttonGlossColor,
      '--kangur-button-border-width': buttonBorderWidth,
      '--kangur-button-border-color': buttonBorderColor,
      '--kangur-button-border-radius': buttonBorderRadius,
      '--kangur-button-primary-background': primaryButtonBackground,
      '--kangur-button-primary-text': primaryButtonText,
      '--kangur-button-primary-hover-background': primaryButtonHoverBackground,
      '--kangur-button-primary-shadow': buildGelButtonShadow(
        [`0 12px 24px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 34 : 24)}`],
        theme,
        primaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-primary-hover-shadow': buildGelButtonShadow(
        [
          `0 22px 34px -18px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 40 : 30)}`,
          `0 14px 24px -18px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 22 : 16)}`,
        ],
        theme,
        primaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-primary-active-shadow': primaryButtonActiveShadow,
      '--kangur-button-secondary-background': secondaryButtonBackground,
      '--kangur-button-secondary-hover-background': secondaryButtonHoverBackground,
      '--kangur-button-secondary-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(secondaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 28)}`],
        theme,
        secondaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-secondary-active-shadow': secondaryButtonActiveShadow,
      '--kangur-button-secondary-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.btnSecondaryText || toneText, '#ffffff', 92)
          : theme.btnSecondaryText || toneText,
      '--kangur-button-secondary-hover-text': toneText,
      '--kangur-button-surface-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 92 : 90)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 12 : 16)} 100%)`,
      '--kangur-button-surface-hover-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 84)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 18 : 22)} 100%)`,
      '--kangur-button-surface-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(primary, '#000000', isDarkStorefrontAppearanceMode(mode) ? 26 : 18)}`],
        theme,
        primary,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-surface-active-shadow': surfaceButtonActiveShadow,
      '--kangur-button-surface-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(primary, '#ffffff', 72)
          : darkenCssColor(primary, 8),
      '--kangur-button-surface-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(primary, '#ffffff', 88)
          : darkenCssColor(primary, 16),
      '--kangur-button-warning-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 84 : 76)} 0%, ${mixCssColor(warningBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 88 : 68)} 100%)`,
      '--kangur-button-warning-hover-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#ffffff' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 68)} 0%, ${mixCssColor(warningBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 82 : 62)} 100%)`,
      '--kangur-button-warning-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 44 : 26)}`],
        theme,
        warningBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-warning-hover-shadow': buildGelButtonShadow(
        [
          `0 20px 32px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 34)}`,
          `0 14px 24px -24px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 18 : 10)}`,
        ],
        theme,
        warningBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-warning-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#fde68a', '#ffffff', 92)
          : darkenCssColor(warningBackground, 42),
      '--kangur-button-warning-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#fef3c7', '#ffffff', 96)
          : darkenCssColor(warningBackground, 50),
      '--kangur-button-success-background':
        `linear-gradient(180deg, ${mixCssColor(successBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 86 : 78)} 0%, ${mixCssColor(successBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 90 : 70)} 100%)`,
      '--kangur-button-success-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(successBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 42 : 24)}`],
        theme,
        successBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-success-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#d1fae5', '#ffffff', 92)
          : darkenCssColor(successBackground, 36),
      '--kangur-button-success-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#ecfdf5', '#ffffff', 96)
          : darkenCssColor(successBackground, 44),
      '--kangur-chat-panel-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceTone.background, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 92)} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 92 : 88)} 100%)`,
      '--kangur-chat-panel-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 32),
      '--kangur-chat-panel-shadow': panelSnapShadow,
      '--kangur-chat-header-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 30 : 18)} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 86 : 80)} 100%)`,
      '--kangur-chat-header-snap-background': warmOverlayBackground,
      '--kangur-chat-header-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 32),
      '--kangur-chat-spotlight-border': panelSnapRing,
      '--kangur-chat-spotlight-background': backdrop,
      '--kangur-chat-spotlight-shadow': backdropStrong,
      '--kangur-chat-avatar-shell-background':
        isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
      '--kangur-chat-avatar-shell-border':
        isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)',
      '--kangur-chat-avatar-shell-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.24), 0 1px 2px rgba(15,23,42,0.08)',
      '--kangur-chat-avatar-svg-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? '0 1px 2px rgba(15,23,42,0.18)'
          : '0 1px 2px rgba(15,23,42,0.12)',
      '--kangur-chat-warm-overlay-background': warmOverlayBackground,
      '--kangur-chat-warm-overlay-border': warmOverlayBorder,
      '--kangur-chat-warm-overlay-shadow-callout': warmOverlayShadowCallout,
      '--kangur-chat-warm-overlay-shadow-modal': warmOverlayShadowModal,
      '--kangur-chat-pointer-glow': warningBackground,
      '--kangur-chat-pointer-marker': warningBackground,
      '--kangur-chat-tail-background': 'var(--kangur-soft-card-background)',
      '--kangur-chat-tail-border': mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 22 : 32),
      '--kangur-chat-sheet-handle-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 30),
      '--kangur-chat-composer-background': composerBackground,
      '--kangur-chat-selection-badge-background': selectionBadgeBackground,
      '--kangur-chat-divider': dividerColor,
      '--kangur-chat-surface-soft-background':
        `linear-gradient(135deg, ${softSurfaceStart} 0%, ${softSurfaceEnd} 100%)`,
      '--kangur-chat-surface-soft-border': 'var(--kangur-soft-card-border)',
      '--kangur-chat-surface-soft-shadow': softSurfaceShadow,
      '--kangur-chat-surface-warm-background':
        `linear-gradient(135deg, ${warmSurfaceStart} 0%, ${warmSurfaceEnd} 100%)`,
      '--kangur-chat-surface-warm-border': mixCssColor(borderColor, warningBackground, 74),
      '--kangur-chat-surface-warm-shadow': warmSurfaceShadow,
      '--kangur-chat-surface-info-background':
        `linear-gradient(135deg, ${infoSurfaceStart} 0%, ${infoSurfaceEnd} 100%)`,
      '--kangur-chat-surface-info-border': mixCssColor(borderColor, infoBackground, 72),
      '--kangur-chat-surface-info-shadow': infoSurfaceShadow,
      '--kangur-chat-surface-success-background': successSurface,
      '--kangur-chat-surface-success-border': mixCssColor(borderColor, successBackground, 70),
      '--kangur-chat-surface-success-shadow': successSurfaceShadow,
      '--kangur-chat-panel-text': toneText,
      '--kangur-chat-muted-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(pageMutedText, '#ffffff', 84)
          : mixCssColor(pageMutedText, toneText, 76),
      '--kangur-chat-kicker-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 62)
          : darkenCssColor(warningBackground, 18),
      '--kangur-chat-kicker-dot': warningBackground,
      '--kangur-chat-chip-background':
        `linear-gradient(135deg, ${mixCssColor(accent, chatBackground, isDarkStorefrontAppearanceMode(mode) ? 44 : 34)}, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 88 : 82)})`,
      '--kangur-chat-chip-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 22)
          : mixCssColor(accent, '#ffffff', 30),
      '--kangur-chat-chip-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.btnPrimaryText || '#fff7ed', '#ffffff', 92)
          : toneText,
      '--kangur-chat-control-background':
        `linear-gradient(180deg, ${mixCssColor(accent, chatBackground, isDarkStorefrontAppearanceMode(mode) ? 34 : 26)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 86 : 80)} 100%)`,
      '--kangur-chat-control-hover-background':
        `linear-gradient(180deg, ${mixCssColor(accent, isDarkStorefrontAppearanceMode(mode) ? '#ffffff' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 28 : 22)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 82 : 76)} 100%)`,
      '--kangur-chat-control-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 22)
          : mixCssColor(accent, '#ffffff', 28),
      '--kangur-chat-control-text': toneText,
    },
  };
};

export const resolveKangurStorefrontAppearance = (
  mode: CmsStorefrontAppearanceMode,
  theme?: ThemeSettings | null
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} =>
  theme
    ? resolveThemedKangurStorefrontAppearance(theme, mode)
    : resolveDefaultKangurStorefrontAppearance(mode);
