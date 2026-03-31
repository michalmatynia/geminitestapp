import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  CmsStorefrontAppearanceMode,
  CmsAppearanceTone,
} from './CmsStorefrontAppearance.contracts';
import {
  applyTransparency,
  clampNumber,
  isGradientValue,
  isNonEmptyString,
  isDarkStorefrontAppearanceMode,
  mixCssColor,
  resolveSolidColor,
  toCssPx,
} from './CmsStorefrontAppearance.utils';
import { resolveHomeActionVars } from './CmsStorefrontAppearance.home-actions';
import {
  resolveStorefrontAppearanceColorSchemes,
  resolveStorefrontAppearanceTone,
  withFallbackTone,
} from './appearance-logic/CmsStorefrontAppearance.color-resolvers';
import { resolveKangurRuntimeThemeVars } from './appearance-logic/CmsStorefrontAppearance.runtime-vars';
import {
  buildKangurAccentThemeVars,
  type KangurAccentThemeInput,
  type KangurAccentThemeName,
} from './appearance-logic/CmsStorefrontAppearance.accent-vars';
import { buildKangurGlassSurfaceThemeVars } from './appearance-logic/CmsStorefrontAppearance.glass-vars';
import { resolveDefaultKangurStorefrontAppearance } from './appearance-logic/CmsStorefrontAppearance.default-vars';

const resolveThemeCssValue = (value: string | null | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value.trim() : fallback;

const resolveThemeColor = (value: string | null | undefined, fallback: string): string =>
  resolveSolidColor(isNonEmptyString(value) ? value.trim() : undefined, fallback);

const resolveThemedPageBackground = (args: {
  backgroundColor: string | null | undefined;
  fallbackBackground: string;
  fallbackTone: string;
  isDark: boolean;
}): {
  background: string;
  tone: string;
} => {
  const backgroundValue =
    typeof args.backgroundColor === 'string' ? args.backgroundColor.trim() : '';
  if (isGradientValue(backgroundValue)) {
    const gradient = backgroundValue;
    return {
      background: gradient,
      tone: resolveSolidColor(gradient, args.fallbackTone),
    };
  }

  if (backgroundValue) {
    const tone = backgroundValue;
    return {
      background: `radial-gradient(circle at top, ${mixCssColor(
        tone,
        args.isDark ? '#ffffff' : '#ffffff',
        args.isDark ? 74 : 86
      )} 0%, ${tone} 46%, ${mixCssColor(
        tone,
        args.isDark ? '#020617' : '#c7d2fe',
        args.isDark ? 84 : 88
      )} 100%)`,
      tone,
    };
  }

  return {
    background: args.fallbackBackground,
    tone: args.fallbackTone,
  };
};

const resolveThemedSurfaceGradient = (args: {
  tone: string;
  pageTone: string;
  isDark: boolean;
  direction?: string;
  startWeight?: number;
  endWeight?: number;
}): string =>
  `linear-gradient(${args.direction ?? '180deg'}, ${mixCssColor(
    args.tone,
    args.pageTone,
    args.startWeight ?? (args.isDark ? 88 : 94)
  )} 0%, ${mixCssColor(
    args.tone,
    args.pageTone,
    args.endWeight ?? (args.isDark ? 76 : 86)
  )} 100%)`;

const resolveThemedInteractiveBackground = (args: {
  background: string | null | undefined;
  fallbackColor: string;
  pageTone: string;
  isDark: boolean;
  direction?: string;
  highlightColor?: string;
  startWeight?: number;
  endWeight?: number;
}): string => {
  const value = args.background?.trim();
  if (isGradientValue(value)) {
    return value.trim();
  }

  const tone = resolveThemeColor(value, args.fallbackColor);
  return `linear-gradient(${args.direction ?? '135deg'}, ${mixCssColor(
    tone,
    args.highlightColor ?? '#ffffff',
    args.startWeight ?? (args.isDark ? 82 : 90)
  )} 0%, ${mixCssColor(
    tone,
    args.pageTone,
    args.endWeight ?? (args.isDark ? 88 : 94)
  )} 100%)`;
};

const buildKangurLegacyThemeVars = (args: {
  theme: ThemeSettings;
  isDark: boolean;
  background: string;
  pageTone: string;
  surfaceTone: string;
  borderColor: string;
  accent: string;
  primary: string;
  secondary: string;
  pageText: string;
  pageMutedText: string;
}): Record<string, string> => {
  const navText = resolveThemeCssValue(args.theme.navTextColor, args.pageMutedText);
  const navHoverText = resolveThemeCssValue(args.theme.navHoverTextColor, args.pageText);
  const navActiveText = resolveThemeCssValue(
    args.theme.navActiveTextColor,
    resolveThemeCssValue(
      args.theme.pillActiveText,
      resolveThemeCssValue(args.theme.btnPrimaryText, args.isDark ? '#f8fafc' : '#ffffff')
    )
  );
  const inputTone = resolveThemeColor(args.theme.inputBg, args.surfaceTone);
  const inputText = resolveThemeCssValue(args.theme.inputText, args.pageText);
  const inputBorder = resolveThemeColor(args.theme.inputBorderColor, args.borderColor);
  const inputPlaceholder = resolveThemeCssValue(args.theme.inputPlaceholder, args.pageMutedText);
  const softCardTone = resolveThemeColor(
    args.theme.cardBg || args.theme.containerBg || args.theme.surfaceColor,
    args.surfaceTone
  );
  const pillActiveColor = resolveThemeColor(
    args.theme.pillActiveBg,
    resolveThemeColor(args.theme.btnPrimaryBg, args.primary)
  );
  const primaryButtonColor = resolveThemeColor(args.theme.btnPrimaryBg, args.primary);
  const secondaryButtonColor = resolveThemeColor(args.theme.btnSecondaryBg, softCardTone);
  const warningStart = resolveThemeColor(args.theme.gradientAmberStart, '#fb923c');
  const warningEnd = resolveThemeColor(args.theme.gradientAmberEnd, '#f59e0b');
  const successStart = resolveThemeColor(args.theme.gradientEmeraldStart, '#10b981');
  const successEnd = resolveThemeColor(args.theme.gradientEmeraldEnd, '#06b6d4');
  const mutedBorder = mixCssColor(args.borderColor, args.pageTone, args.isDark ? 72 : 84);
  const softCardBackground = resolveThemedSurfaceGradient({
    tone: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
  });
  const glassPanelBackground = resolveThemedSurfaceGradient({
    tone: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
    startWeight: args.isDark ? 78 : 92,
    endWeight: args.isDark ? 68 : 82,
  });
  const navGroupBackground = resolveThemedSurfaceGradient({
    tone: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
    startWeight: args.isDark ? 84 : 90,
    endWeight: args.isDark ? 72 : 80,
  });
  const primaryButtonBackground = resolveThemedInteractiveBackground({
    background: args.theme.btnPrimaryBg,
    fallbackColor: args.primary,
    pageTone: args.pageTone,
    isDark: args.isDark,
    highlightColor: args.isDark ? '#fff7ed' : '#ffffff',
  });
  const secondaryButtonBackground = resolveThemedInteractiveBackground({
    background: args.theme.btnSecondaryBg,
    fallbackColor: secondaryButtonColor,
    pageTone: args.pageTone,
    isDark: args.isDark,
    direction: '180deg',
    highlightColor: args.isDark ? '#ffffff' : '#ffffff',
    startWeight: args.isDark ? 96 : 92,
    endWeight: args.isDark ? 82 : 88,
  });
  const surfaceButtonBackground = resolveThemedInteractiveBackground({
    background: null,
    fallbackColor: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
    direction: '180deg',
    highlightColor: args.accent,
    startWeight: args.isDark ? 94 : 96,
    endWeight: args.isDark ? 82 : 90,
  });
  const surfaceButtonHoverBackground = resolveThemedInteractiveBackground({
    background: null,
    fallbackColor: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
    direction: '180deg',
    highlightColor: args.accent,
    startWeight: args.isDark ? 86 : 92,
    endWeight: args.isDark ? 72 : 84,
  });
  const chatPanelBackground = resolveThemedSurfaceGradient({
    tone: softCardTone,
    pageTone: args.pageTone,
    isDark: args.isDark,
    startWeight: args.isDark ? 94 : 96,
    endWeight: args.isDark ? 86 : 92,
  });

  return {
    '--kangur-page-background': args.background,
    '--kangur-page-text': args.pageText,
    '--kangur-page-muted-text': args.pageMutedText,
    '--kangur-glass-panel-background': glassPanelBackground,
    '--kangur-glass-panel-border': mixCssColor(args.borderColor, args.pageTone, args.isDark ? 74 : 92),
    '--kangur-glass-panel-shadow': `0 ${args.isDark ? '24px 60px' : '20px 60px'} ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.34 : 0.18
    )}`,
    '--kangur-soft-card-background': softCardBackground,
    '--kangur-soft-card-border': mutedBorder,
    '--kangur-soft-card-shadow': `0 18px 42px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.24 : 0.12
    )}`,
    '--kangur-soft-card-text': resolveThemeCssValue(args.theme.cardTextColor, args.pageText),
    '--kangur-nav-group-background': navGroupBackground,
    '--kangur-nav-group-border': mixCssColor(args.borderColor, args.pageTone, args.isDark ? 82 : 94),
    '--kangur-nav-item-text': navText,
    '--kangur-nav-item-hover-background': resolveThemedSurfaceGradient({
      tone: softCardTone,
      pageTone: args.accent,
      isDark: args.isDark,
      startWeight: args.isDark ? 90 : 94,
      endWeight: args.isDark ? 82 : 88,
    }),
    '--kangur-nav-item-hover-border': mixCssColor(args.borderColor, args.accent, args.isDark ? 66 : 58),
    '--kangur-nav-item-hover-text': navHoverText,
    '--kangur-nav-item-active-background': resolveThemedInteractiveBackground({
      background: args.theme.pillActiveBg || args.theme.btnPrimaryBg,
      fallbackColor: pillActiveColor,
      pageTone: args.pageTone,
      isDark: args.isDark,
      direction: '180deg',
      highlightColor: '#ffffff',
      startWeight: args.isDark ? 76 : 88,
      endWeight: args.isDark ? 88 : 94,
    }),
    '--kangur-nav-item-active-border': mixCssColor(args.borderColor, pillActiveColor, args.isDark ? 58 : 52),
    '--kangur-nav-item-active-text': navActiveText,
    '--kangur-text-field-background': resolveThemedSurfaceGradient({
      tone: inputTone,
      pageTone: args.pageTone,
      isDark: args.isDark,
      startWeight: args.isDark ? 96 : 98,
      endWeight: args.isDark ? 90 : 94,
    }),
    '--kangur-text-field-border': mixCssColor(inputBorder, args.pageTone, args.isDark ? 72 : 86),
    '--kangur-text-field-text': inputText,
    '--kangur-text-field-placeholder': inputPlaceholder,
    '--kangur-text-field-disabled-background': mixCssColor(inputTone, args.pageTone, args.isDark ? 78 : 84),
    '--kangur-text-field-disabled-border': mixCssColor(args.borderColor, args.pageTone, args.isDark ? 62 : 78),
    '--kangur-progress-track': resolveThemeCssValue(
      args.theme.progressTrackColor,
      mixCssColor(args.borderColor, args.pageTone, args.isDark ? 76 : 84)
    ),
    '--kangur-button-primary-background': primaryButtonBackground,
    '--kangur-button-primary-hover-background': isGradientValue(args.theme.btnPrimaryBg)
      ? args.theme.btnPrimaryBg.trim()
      : resolveThemedInteractiveBackground({
          background: args.theme.btnPrimaryBg,
          fallbackColor: primaryButtonColor,
          pageTone: args.pageTone,
          isDark: args.isDark,
          highlightColor: '#ffffff',
          startWeight: args.isDark ? 72 : 84,
          endWeight: args.isDark ? 82 : 90,
        }),
    '--kangur-button-primary-shadow': `0 14px 30px -18px ${applyTransparency(
      primaryButtonColor,
      args.isDark ? 0.42 : 0.28
    )}`,
    '--kangur-button-primary-hover-shadow': `0 18px 34px -20px ${applyTransparency(
      primaryButtonColor,
      args.isDark ? 0.5 : 0.32
    )}`,
    '--kangur-button-secondary-background': secondaryButtonBackground,
    '--kangur-button-secondary-hover-background': isGradientValue(args.theme.btnSecondaryBg)
      ? args.theme.btnSecondaryBg.trim()
      : resolveThemedInteractiveBackground({
          background: args.theme.btnSecondaryBg,
          fallbackColor: secondaryButtonColor,
          pageTone: args.pageTone,
          isDark: args.isDark,
          direction: '180deg',
          highlightColor: '#ffffff',
          startWeight: args.isDark ? 90 : 88,
          endWeight: args.isDark ? 74 : 82,
        }),
    '--kangur-button-secondary-shadow': `0 16px 28px -24px ${applyTransparency(
      args.isDark ? '#020617' : args.borderColor,
      args.isDark ? 0.58 : 0.16
    )}`,
    '--kangur-button-secondary-text': resolveThemeCssValue(
      args.theme.btnSecondaryText,
      args.isDark ? '#dbe7f6' : args.pageText
    ),
    '--kangur-button-secondary-hover-text': resolveThemeCssValue(
      args.theme.btnSecondaryText,
      args.isDark ? '#f8fafc' : args.pageText
    ),
    '--kangur-button-surface-background': surfaceButtonBackground,
    '--kangur-button-surface-hover-background': surfaceButtonHoverBackground,
    '--kangur-button-surface-shadow': `0 16px 28px -24px ${applyTransparency(
      args.accent,
      args.isDark ? 0.22 : 0.16
    )}`,
    '--kangur-button-surface-text': mixCssColor(args.pageText, args.accent, args.isDark ? 76 : 72),
    '--kangur-button-surface-hover-text': mixCssColor(args.pageText, args.accent, args.isDark ? 88 : 82),
    '--kangur-button-warning-background': `linear-gradient(180deg, ${warningStart} 0%, ${warningEnd} 100%)`,
    '--kangur-button-warning-hover-background': `linear-gradient(180deg, ${mixCssColor(
      warningStart,
      '#ffffff',
      args.isDark ? 72 : 84
    )} 0%, ${mixCssColor(warningEnd, args.pageTone, args.isDark ? 88 : 92)} 100%)`,
    '--kangur-button-warning-shadow': `0 16px 28px -24px ${applyTransparency(
      warningEnd,
      args.isDark ? 0.42 : 0.22
    )}`,
    '--kangur-button-warning-hover-shadow': `0 20px 32px -24px ${applyTransparency(
      warningEnd,
      args.isDark ? 0.5 : 0.28
    )}`,
    '--kangur-button-warning-text': args.isDark ? '#fde68a' : '#7c2d12',
    '--kangur-button-warning-hover-text': args.isDark ? '#fef3c7' : '#7c2d12',
    '--kangur-button-success-background': `linear-gradient(180deg, ${successStart} 0%, ${successEnd} 100%)`,
    '--kangur-button-success-shadow': `0 16px 28px -24px ${applyTransparency(
      successEnd,
      args.isDark ? 0.4 : 0.22
    )}`,
    '--kangur-button-success-text': args.isDark ? '#d1fae5' : '#ecfdf5',
    '--kangur-button-success-hover-text': args.isDark ? '#ecfdf5' : '#ffffff',
    '--kangur-chat-panel-background': chatPanelBackground,
    '--kangur-chat-panel-border': mixCssColor(args.borderColor, args.accent, args.isDark ? 72 : 64),
    '--kangur-chat-panel-shadow': `0 20px 48px -30px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.56 : 0.2
    )}`,
    '--kangur-chat-header-background': `linear-gradient(180deg, ${mixCssColor(
      softCardTone,
      args.accent,
      args.isDark ? 62 : 72
    )} 0%, ${chatPanelBackground} 100%)`,
    '--kangur-chat-header-snap-background': `linear-gradient(180deg, ${mixCssColor(
      softCardTone,
      args.accent,
      args.isDark ? 68 : 74
    )} 0%, ${mixCssColor(softCardTone, args.accent, args.isDark ? 78 : 84)} 100%)`,
    '--kangur-chat-header-border': mixCssColor(args.borderColor, args.accent, args.isDark ? 68 : 58),
    '--kangur-chat-spotlight-border': mixCssColor(args.accent, args.pageTone, args.isDark ? 78 : 84),
    '--kangur-chat-spotlight-background': applyTransparency(args.accent, args.isDark ? 0.16 : 0.08),
    '--kangur-chat-spotlight-shadow': applyTransparency(args.accent, args.isDark ? 0.3 : 0.12),
    '--kangur-chat-avatar-shell-background': 'rgba(255,255,255,0.18)',
    '--kangur-chat-avatar-shell-border': 'rgba(255,255,255,0.35)',
    '--kangur-chat-avatar-shell-shadow':
      'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.12)',
    '--kangur-chat-avatar-svg-shadow': '0 1px 2px rgba(15,23,42,0.18)',
    '--kangur-chat-warm-overlay-background': `radial-gradient(circle at top, ${mixCssColor(
      softCardTone,
      args.accent,
      78
    )} 0%, ${mixCssColor(softCardTone, args.pageTone, args.isDark ? 78 : 86)} 44%, ${mixCssColor(
      args.pageTone,
      args.accent,
      args.isDark ? 82 : 88
    )} 100%)`,
    '--kangur-chat-warm-overlay-border': applyTransparency(args.accent, args.isDark ? 0.32 : 0.22),
    '--kangur-chat-warm-overlay-shadow-callout': `0 20px 48px -30px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.68 : 0.24
    )}, inset 0 1px 0 rgba(255,255,255,0.18)`,
    '--kangur-chat-warm-overlay-shadow-modal': `0 26px 60px -34px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.72 : 0.28
    )}, inset 0 1px 0 rgba(255,255,255,0.18)`,
    '--kangur-chat-pointer-glow': applyTransparency(args.accent, 0.28),
    '--kangur-chat-pointer-marker': args.accent,
    '--kangur-chat-tail-background': 'var(--kangur-soft-card-background)',
    '--kangur-chat-tail-border': applyTransparency(args.accent, args.isDark ? 0.24 : 0.18),
    '--kangur-chat-sheet-handle-background': applyTransparency(args.accent, args.isDark ? 0.22 : 0.18),
    '--kangur-chat-composer-background': `linear-gradient(180deg, ${mixCssColor(
      softCardTone,
      'transparent',
      92
    )} 0%, transparent 100%)`,
    '--kangur-chat-selection-badge-background': mixCssColor(
      softCardTone,
      'rgba(255,255,255,0.16)',
      args.isDark ? 28 : 18
    ),
    '--kangur-chat-divider': mixCssColor(mutedBorder, args.accent, args.isDark ? 82 : 80),
    '--kangur-chat-surface-soft-background': `linear-gradient(135deg, ${mixCssColor(
      softCardTone,
      'transparent',
      92
    )} 0%, ${mixCssColor(softCardTone, args.pageTone, args.isDark ? 86 : 84)} 100%)`,
    '--kangur-chat-surface-soft-border': 'var(--kangur-soft-card-border)',
    '--kangur-chat-surface-soft-shadow': `0 12px 28px -18px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.55 : 0.18
    )}`,
    '--kangur-chat-surface-warm-background': `linear-gradient(135deg, ${mixCssColor(
      softCardTone,
      args.accent,
      90
    )} 0%, ${mixCssColor(softCardTone, args.accent, 84)} 100%)`,
    '--kangur-chat-surface-warm-border': mixCssColor(mutedBorder, args.accent, 72),
    '--kangur-chat-surface-warm-shadow': `0 8px 18px -12px ${applyTransparency(
      args.isDark ? '#020617' : args.accent,
      args.isDark ? 0.65 : 0.2
    )}`,
    '--kangur-chat-surface-info-background': `linear-gradient(135deg, ${mixCssColor(
      softCardTone,
      resolveThemeColor(args.theme.gradientSkyStart, '#38bdf8'),
      90
    )} 0%, ${mixCssColor(
      softCardTone,
      resolveThemeColor(args.theme.gradientSkyEnd, '#2563eb'),
      86
    )} 100%)`,
    '--kangur-chat-surface-info-border': mixCssColor(
      mutedBorder,
      resolveThemeColor(args.theme.gradientSkyStart, '#38bdf8'),
      72
    ),
    '--kangur-chat-surface-info-shadow': `0 8px 18px -12px ${applyTransparency(
      resolveThemeColor(args.theme.gradientSkyEnd, '#2563eb'),
      args.isDark ? 0.6 : 0.22
    )}`,
    '--kangur-chat-surface-success-background': mixCssColor(softCardTone, successStart, args.isDark ? 88 : 82),
    '--kangur-chat-surface-success-border': mixCssColor(mutedBorder, successStart, 72),
    '--kangur-chat-surface-success-shadow': `0 6px 16px -10px ${applyTransparency(
      successEnd,
      args.isDark ? 0.55 : 0.18
    )}`,
    '--kangur-chat-panel-text': args.isDark ? '#f8fafc' : args.pageText,
    '--kangur-chat-muted-text': args.isDark ? '#d7e1ee' : args.pageMutedText,
    '--kangur-chat-kicker-text': mixCssColor(args.pageText, args.accent, args.isDark ? 74 : 78),
    '--kangur-chat-kicker-dot': args.accent,
    '--kangur-chat-chip-background': `linear-gradient(135deg, ${mixCssColor(
      softCardTone,
      args.accent,
      82
    )}, ${mixCssColor(softCardTone, args.accent, 74)})`,
    '--kangur-chat-chip-border': applyTransparency(args.accent, args.isDark ? 0.22 : 0.18),
    '--kangur-chat-chip-text': args.pageText,
    '--kangur-chat-control-background': `linear-gradient(180deg, ${mixCssColor(
      softCardTone,
      args.accent,
      78
    )} 0%, ${mixCssColor(softCardTone, args.accent, 70)} 100%)`,
    '--kangur-chat-control-hover-background': `linear-gradient(180deg, ${mixCssColor(
      softCardTone,
      args.accent,
      70
    )} 0%, ${mixCssColor(softCardTone, args.accent, 62)} 100%)`,
    '--kangur-chat-control-border': applyTransparency(args.accent, args.isDark ? 0.22 : 0.18),
    '--kangur-chat-control-text': args.pageText,
  };
};

export const resolveThemedKangurStorefrontAppearance = (
  theme: ThemeSettings,
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const defaultAppearance = resolveDefaultKangurStorefrontAppearance(mode);
  const accent = theme.accentColor || theme.primaryColor || theme.secondaryColor || theme.textColor;
  const isDark = isDarkStorefrontAppearanceMode(mode);
  const primary = theme.primaryColor || accent;
  const secondary = theme.secondaryColor || primary;
  const surfaceBackground = theme.cardBg || theme.containerBg || theme.surfaceColor;
  const borderColor = theme.containerBorderColor || theme.borderColor || theme.inputBorderColor || theme.btnOutlineBorder;
  
  const buttonGlossOpacity = clampNumber(theme.btnGlossOpacity, 0, 1) * (isDark ? 0.65 : 1);
  const buttonGlossHeight = `${clampNumber(theme.btnGlossHeight, 0, 100)}%`;
  const buttonGlossAngle = `${clampNumber(theme.btnGlossAngle, 0, 360)}deg`;
  const buttonGlossColor = isNonEmptyString(theme.btnGlossColor) ? theme.btnGlossColor.trim() : '#ffffff';
  const buttonBorderOpacity = clampNumber(theme.btnBorderOpacity, 0, 100) / 100;
  const buttonBorderColor = applyTransparency(
    isNonEmptyString(theme.btnOutlineBorder) ? theme.btnOutlineBorder.trim() : borderColor,
    buttonBorderOpacity
  );
  
  const runtimeThemeVars = resolveKangurRuntimeThemeVars(theme);
  const homeActionVars = resolveHomeActionVars(theme);
  const baseToneText = resolveThemeCssValue(theme.pageTextColor, isDark ? '#f8fafc' : theme.textColor);
  const baseMutedText = resolveThemeCssValue(
    theme.pageMutedTextColor,
    isDark ? '#94a3b8' : theme.mutedTextColor
  );
  const resolvedBackground = resolveThemedPageBackground({
    backgroundColor: theme.backgroundColor,
    fallbackBackground: defaultAppearance.background,
    fallbackTone: defaultAppearance.tone.background,
    isDark,
  });
  const background = resolvedBackground.background;
  const pageTone = resolvedBackground.tone;
  
  const accents: Record<KangurAccentThemeName, KangurAccentThemeInput> = {
    indigo: { start: '#818cf8', end: '#4f46e5' },
    violet: { start: '#a78bfa', end: '#7c3aed' },
    emerald: { start: '#34d399', end: '#059669' },
    sky: { start: '#38bdf8', end: '#0284c7' },
    amber: { start: '#fbbf24', end: '#d97706' },
    rose: { start: '#fb7185', end: '#e11d48' },
    teal: { start: '#2dd4bf', end: '#0d9488' },
    slate: { start: '#94a3b8', end: '#475569' },
  };

  const accentVars = buildKangurAccentThemeVars({
    softCardBackground: theme.cardBg || '#ffffff',
    softCardBorder: borderColor,
    glassPanelBorder: borderColor,
    textFieldBorder: theme.inputBorderColor || borderColor,
    toneText: baseToneText,
    pageMutedText: baseMutedText,
    pageBackground: background,
    contrastText: '#ffffff',
    isDark,
    accents,
  });

  const glassVars = buildKangurGlassSurfaceThemeVars({
    softCardBackground: theme.cardBg || '#ffffff',
    softCardBorder: borderColor,
    glassPanelBorder: borderColor,
    glassPanelShadow: '0 4px 12px rgba(0,0,0,0.05)',
    pageBackground: pageTone,
    accents,
  });
  const legacyThemeVars = buildKangurLegacyThemeVars({
    theme,
    isDark,
    background,
    pageTone,
    surfaceTone: resolveThemeColor(surfaceBackground, pageTone),
    borderColor,
    accent,
    primary,
    secondary,
    pageText: baseToneText,
    pageMutedText: baseMutedText,
  });

  return {
    background,
    tone: {
      background: pageTone,
      border: borderColor,
      text: baseToneText,
      accent,
    },
    vars: {
      ...defaultAppearance.vars,
      ...legacyThemeVars,
      '--kangur-primary': primary,
      '--kangur-secondary': secondary,
      '--kangur-accent': accent,
      '--kangur-border': borderColor,
      '--kangur-surface': surfaceBackground,
      '--kangur-text': baseToneText,
      '--kangur-muted-text': baseMutedText,
      '--kangur-button-gloss-opacity': String(buttonGlossOpacity),
      '--kangur-button-gloss-height': buttonGlossHeight,
      '--kangur-button-gloss-angle': buttonGlossAngle,
      '--kangur-button-gloss-color': buttonGlossColor,
      '--kangur-button-border-color': buttonBorderColor,
      '--kangur-button-border-width': toCssPx(theme.btnBorderWidth),
      '--kangur-button-border-radius': toCssPx(theme.btnBorderRadius),
      ...runtimeThemeVars,
      ...homeActionVars,
      ...accentVars,
      ...glassVars,
    },
  };
};

export const resolveKangurStorefrontAppearance = (
  mode: CmsStorefrontAppearanceMode,
  theme?: ThemeSettings
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => (theme ? resolveThemedKangurStorefrontAppearance(theme, mode) : resolveDefaultKangurStorefrontAppearance(mode));

export const resolveCmsStorefrontAppearance = (
  theme: ThemeSettings,
  mode: CmsStorefrontAppearanceMode
): {
  pageTone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const kangurAppearance = resolveThemedKangurStorefrontAppearance(theme, mode);
  const isDark = isDarkStorefrontAppearanceMode(mode);
  const pageTone = resolveStorefrontAppearanceTone(
    {
      background: theme.backgroundColor || kangurAppearance.background,
      text: theme.textColor || kangurAppearance.tone.text,
      border: theme.borderColor || kangurAppearance.tone.border,
      accent: theme.accentColor || theme.primaryColor || kangurAppearance.tone.accent,
    },
    mode
  );
  const surfaceTone = resolveStorefrontAppearanceTone(
    {
      background: theme.surfaceColor || theme.containerBg || theme.cardBg || pageTone.background,
      text: pageTone.text,
      border: theme.containerBorderColor || theme.borderColor || pageTone.border,
      accent: pageTone.accent,
    },
    mode
  );

  return {
    pageTone,
    vars: {
      ...kangurAppearance.vars,
      '--cms-appearance-bg': pageTone.background,
      '--cms-appearance-page-background': pageTone.background,
      '--cms-appearance-page-text': pageTone.text,
      '--cms-appearance-page-border': pageTone.border,
      '--cms-appearance-page-accent': pageTone.accent,
      '--cms-appearance-muted-text': isDark
        ? 'color-mix(in srgb, #94a3b8 82%, white)'
        : theme.mutedTextColor,
      '--cms-appearance-surface-background': surfaceTone.background,
      '--cms-appearance-surface-border': surfaceTone.border,
      '--cms-appearance-input-border': pageTone.border,
      '--cms-appearance-button-primary-text': isDark
        ? `color-mix(in srgb, ${theme.btnPrimaryText || '#ffffff'} 72%, white)`
        : theme.btnPrimaryText || pageTone.text,
    },
  };
};

export {
  resolveStorefrontAppearanceColorSchemes,
  resolveStorefrontAppearanceTone,
  withFallbackTone,
};
