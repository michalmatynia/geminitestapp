'use client';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  CmsStorefrontAppearanceMode,
  CmsAppearanceTone,
} from './CmsStorefrontAppearance.contracts';
import {
  applyTransparency,
  clampNumber,
  isNonEmptyString,
  isDarkStorefrontAppearanceMode,
  mixCssColor,
  resolveBackgroundValue,
  resolveSolidColor,
  toCssPx,
} from './CmsStorefrontAppearance.utils';
import { resolveHomeActionVars } from './CmsStorefrontAppearance.home-actions';
import {
  resolveButtonTextShadow,
} from './appearance-logic/CmsStorefrontAppearance.color-resolvers';
import { resolveKangurRuntimeThemeVars } from './appearance-logic/CmsStorefrontAppearance.runtime-vars';
import {
  buildKangurAccentThemeVars,
  type KangurAccentThemeInput,
  type KangurAccentThemeName,
} from './appearance-logic/CmsStorefrontAppearance.accent-vars';
import { buildKangurGlassSurfaceThemeVars } from './appearance-logic/CmsStorefrontAppearance.glass-vars';

export const resolveThemedKangurStorefrontAppearance = (
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
  const baseToneText = isDark ? '#f8fafc' : theme.textColor;
  const baseMutedText = isDark ? '#94a3b8' : theme.mutedTextColor;
  
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
    pageBackground: theme.bodyBg || '#f8fafc',
    contrastText: '#ffffff',
    isDark,
    accents,
  });

  const glassVars = buildKangurGlassSurfaceThemeVars({
    softCardBackground: theme.cardBg || '#ffffff',
    softCardBorder: borderColor,
    glassPanelBorder: borderColor,
    glassPanelShadow: '0 4px 12px rgba(0,0,0,0.05)',
    pageBackground: theme.bodyBg || '#f8fafc',
    accents,
  });

  return {
    background: resolveBackgroundValue(theme.bodyBg, '#f8fafc'),
    tone: {
      mode,
      theme: 'custom',
      primary,
      secondary,
      accent,
    },
    vars: {
      '--kangur-primary': primary,
      '--kangur-secondary': secondary,
      '--kangur-accent': accent,
      '--kangur-border': borderColor,
      '--kangur-surface': surfaceBackground,
      '--kangur-text': baseToneText,
      '--kangur-muted-text': baseMutedText,
      '--kangur-btn-gloss-opacity': String(buttonGlossOpacity),
      '--kangur-btn-gloss-height': buttonGlossHeight,
      '--kangur-btn-gloss-angle': buttonGlossAngle,
      '--kangur-btn-gloss-color': buttonGlossColor,
      '--kangur-btn-border-color': buttonBorderColor,
      '--kangur-btn-border-width': toCssPx(theme.btnBorderWidth),
      '--kangur-btn-border-radius': toCssPx(theme.btnBorderRadius),
      ...runtimeThemeVars,
      ...homeActionVars,
      ...accentVars,
      ...glassVars,
    },
  };
};
