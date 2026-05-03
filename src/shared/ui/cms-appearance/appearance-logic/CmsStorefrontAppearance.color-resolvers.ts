import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { darkenCssColor } from '@/shared/utils/color-utils';
import {
  type CmsStorefrontAppearanceMode,
  type CmsAppearanceTone,
  DEFAULT_TONE,
} from '../CmsStorefrontAppearance.contracts';
import {
  isNonEmptyString,
  isDarkStorefrontAppearanceMode,
  toCssPx,
  toCssPxSigned,
  toShadowColor,
} from '../CmsStorefrontAppearance.utils';

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
