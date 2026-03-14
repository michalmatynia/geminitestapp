'use client';

import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { darkenCssColor } from '@/shared/utils/color-utils';

export type CmsStorefrontAppearanceMode = 'default' | 'dark' | 'dawn' | 'sunset';

export type CmsAppearanceTone = {
  background?: string;
  text?: string;
  border?: string;
  accent?: string;
};

type CmsStorefrontAppearanceContextValue = {
  mode: CmsStorefrontAppearanceMode;
  setMode: React.Dispatch<React.SetStateAction<CmsStorefrontAppearanceMode>>;
};

type CmsStorefrontAppearanceProviderProps = {
  children: React.ReactNode;
  initialMode?: CmsStorefrontAppearanceMode;
  storageKey?: string;
};

type CmsStorefrontAppearanceButtonsProps = {
  tone?: CmsAppearanceTone;
  className?: string;
  label?: string;
  testId?: string;
  modes?: CmsStorefrontAppearanceMode[];
  modeLabels?: Partial<Record<CmsStorefrontAppearanceMode, string>>;
};

const DEFAULT_TONE: Required<CmsAppearanceTone> = {
  background: '#ffffff',
  text: '#111827',
  border: '#d1d5db',
  accent: '#2563eb',
};

export const isDarkStorefrontAppearanceMode = (
  mode: CmsStorefrontAppearanceMode
): boolean => mode === 'dark' || mode === 'sunset';

const DEFAULT_MODE_LABELS: Record<CmsStorefrontAppearanceMode, string> = {
  default: 'Default',
  dawn: 'Dawn',
  sunset: 'Sunset',
  dark: 'Dark',
};

const MODE_ICON_MAP: Record<CmsStorefrontAppearanceMode, typeof Sun> = {
  default: Sun,
  dawn: Sunrise,
  sunset: Sunset,
  dark: Moon,
};

const VALID_MODES = new Set<CmsStorefrontAppearanceMode>(['default', 'dark', 'dawn', 'sunset']);

const CmsStorefrontAppearanceContext =
  createContext<CmsStorefrontAppearanceContextValue | null>(null);

const normalizeMode = (value: string | null | undefined): CmsStorefrontAppearanceMode => {
  if (!value) return 'default';
  return VALID_MODES.has(value as CmsStorefrontAppearanceMode)
    ? (value as CmsStorefrontAppearanceMode)
    : 'default';
};

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readPersistedMode = (storageKey: string): CmsStorefrontAppearanceMode | null => {
  if (!canUseLocalStorage()) return null;

  try {
    const value = window.localStorage.getItem(storageKey);
    return VALID_MODES.has(value as CmsStorefrontAppearanceMode)
      ? (value as CmsStorefrontAppearanceMode)
      : null;
  } catch {
    return null;
  }
};

const writePersistedMode = (storageKey: string, mode: CmsStorefrontAppearanceMode): void => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore localStorage persistence failures and keep the in-memory selection.
  }
};

const withFallbackTone = (tone?: CmsAppearanceTone): Required<CmsAppearanceTone> => ({
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

export const resolveCmsStorefrontAppearance = (
  theme: {
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor?: string;
    borderColor: string;
    accentColor?: string;
    primaryColor?: string;
    inputBg?: string;
    inputText?: string;
    inputBorderColor?: string;
    btnPrimaryBg?: string;
    btnPrimaryText?: string;
  },
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
  const inputTone = resolveStorefrontAppearanceTone(
    {
      background: theme.inputBg || theme.surfaceColor,
      text: theme.inputText || theme.textColor,
      border: theme.inputBorderColor || theme.borderColor,
      accent,
    },
    mode
  );
  const primaryButtonBase = resolveSolidColor(theme.btnPrimaryBg, accent);
  const primaryButtonTone = resolveStorefrontAppearanceTone(
    {
      background: primaryButtonBase,
      text: theme.btnPrimaryText || '#ffffff',
      border: theme.borderColor,
      accent,
    },
    mode
  );
  const resolvedPrimaryButtonTone =
    isDarkStorefrontAppearanceMode(mode)
      ? {
          ...primaryButtonTone,
          background: darkenCssColor(primaryButtonBase, 28),
          border: darkenCssColor(primaryButtonBase, 36),
          text: '#f8fafc',
        }
      : primaryButtonTone;
  const primaryButtonBackground = resolveBackgroundValue(
    theme.btnPrimaryBg,
    resolvedPrimaryButtonTone.background
  );
  const resolvedPrimaryButtonToneWithBackground = {
    ...resolvedPrimaryButtonTone,
    background: primaryButtonBackground,
  };

  const subtleSurface =
    isDarkStorefrontAppearanceMode(mode)
      ? `color-mix(in srgb, ${surfaceTone.background} 72%, ${pageTone.background})`
      : `color-mix(in srgb, ${surfaceTone.background} 88%, ${pageTone.background})`;
  const mutedText =
    isDarkStorefrontAppearanceMode(mode)
      ? 'rgba(243,244,246,0.72)'
      : theme.mutedTextColor ||
        `color-mix(in srgb, ${pageTone.text} 62%, ${pageTone.background})`;

  return {
    pageTone,
    surfaceTone,
    subtleSurface,
    mutedText,
    inputTone,
    primaryButtonTone: resolvedPrimaryButtonToneWithBackground,
    vars: {
      '--cms-appearance-page-background': pageTone.background,
      '--cms-appearance-page-text': pageTone.text,
      '--cms-appearance-page-border': pageTone.border,
      '--cms-appearance-page-accent': pageTone.accent,
      '--cms-appearance-surface-background': surfaceTone.background,
      '--cms-appearance-surface-text': surfaceTone.text,
      '--cms-appearance-surface-border': surfaceTone.border,
      '--cms-appearance-subtle-surface': subtleSurface,
      '--cms-appearance-muted-text': mutedText,
      '--cms-appearance-input-background': inputTone.background,
      '--cms-appearance-input-text': inputTone.text,
      '--cms-appearance-input-border': inputTone.border,
      '--cms-appearance-button-primary-background': primaryButtonBackground,
      '--cms-appearance-button-primary-text': resolvedPrimaryButtonTone.text,
      '--cms-appearance-button-primary-border': resolvedPrimaryButtonTone.border,
    },
  };
};

const mixCssColor = (base: string, mixin: string, weight: number): string =>
  `color-mix(in srgb, ${base} ${Math.max(0, Math.min(100, weight))}%, ${mixin})`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isGradientValue = (value: string | null | undefined): boolean =>
  isNonEmptyString(value) && value.toLowerCase().includes('gradient(');
const extractFirstColorStop = (value: string): string | null => {
  const hexMatch = value.match(/#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})/i);
  if (hexMatch) return hexMatch[0];
  const rgbMatch = value.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return rgbMatch[0];
  const hslMatch = value.match(/hsla?\([^)]+\)/i);
  if (hslMatch) return hslMatch[0];
  return null;
};
const resolveSolidColor = (value: string | undefined, fallback: string): string => {
  if (!isNonEmptyString(value)) return fallback;
  const trimmed = value.trim();
  if (!isGradientValue(trimmed)) return trimmed;
  return extractFirstColorStop(trimmed) ?? fallback;
};
const resolveBackgroundValue = (value: string | undefined, fallback: string): string => {
  if (isGradientValue(value)) return value.trim();
  return fallback;
};

const clampRgbChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseRgbTuple = (value: string): [number, number, number] | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    const normalized = trimmed.slice(1);
    if (normalized.length === 3 || normalized.length === 4) {
      const [r, g, b] = normalized.split('').map((channel) => channel + channel);
      return [
        clampRgbChannel(parseInt(r, 16)),
        clampRgbChannel(parseInt(g, 16)),
        clampRgbChannel(parseInt(b, 16)),
      ];
    }
    if (normalized.length === 6 || normalized.length === 8) {
      return [
        clampRgbChannel(parseInt(normalized.slice(0, 2), 16)),
        clampRgbChannel(parseInt(normalized.slice(2, 4), 16)),
        clampRgbChannel(parseInt(normalized.slice(4, 6), 16)),
      ];
    }
  }

  const tupleMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (tupleMatch) {
    return [
      clampRgbChannel(Number(tupleMatch[1])),
      clampRgbChannel(Number(tupleMatch[2])),
      clampRgbChannel(Number(tupleMatch[3])),
    ];
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const channels = parts.slice(0, 3).map((part) => {
        if (part.endsWith('%')) {
          const percent = Number(part.replace('%', ''));
          if (Number.isNaN(percent)) return null;
          return clampRgbChannel((percent / 100) * 255);
        }
        const value = Number(part);
        if (Number.isNaN(value)) return null;
        return clampRgbChannel(value);
      });
      if (channels.every((c): c is number => typeof c === 'number')) {
        return channels as [number, number, number];
      }
    }
  }

  return null;
};

const toRgbTupleString = (value: string): string | null => {
  const parsed = parseRgbTuple(value);
  if (!parsed) return null;
  return `${parsed[0]}, ${parsed[1]}, ${parsed[2]}`;
};

const toCssPx = (value: number): string => `${Math.max(0, Math.round(value * 100) / 100)}px`;
const toCssPxSigned = (value: number): string => `${Math.round(value * 100) / 100}px`;
const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toShadowColor = (color: string, opacity: number): string => {
  const clamped = clampNumber(opacity, 0, 1);
  if (clamped <= 0) return 'transparent';
  if (clamped >= 1) return color;
  const percent = Math.round(clamped * 100);
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
};

const applyTransparency = (color: string, opacity: number): string => {
  const clamped = clampNumber(opacity, 0, 1);
  if (clamped <= 0) return 'transparent';
  if (clamped >= 1) return color;
  const percent = Math.round(clamped * 100);
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
};

const buildShadow = ({
  x,
  y,
  blur,
  spread,
  color,
  opacity,
}: {
  x: number;
  y: number;
  blur: number;
  spread?: number;
  color: string;
  opacity: number;
}): string => {
  const safeBlur = Math.max(0, blur);
  const safeSpread = spread ? ` ${toCssPxSigned(Math.max(0, spread))}` : '';
  return `${toCssPxSigned(x)} ${toCssPxSigned(y)} ${toCssPxSigned(safeBlur)}${safeSpread} ${toShadowColor(
    color,
    opacity
  )}`;
};

const resolvePagePadding = (theme: ThemeSettings) => {
  const basePadding = theme.pagePadding;

  return {
    top: theme.pagePaddingTop ?? basePadding,
    right: theme.pagePaddingRight ?? basePadding,
    bottom: theme.pagePaddingBottom ?? basePadding,
    left: theme.pagePaddingLeft ?? basePadding,
  };
};

const resolveButtonHeight = (theme: ThemeSettings): number =>
  Math.max(theme.btnFontSize + theme.btnPaddingY * 2 + 16, 32);

const resolvePanelPadding = (theme: ThemeSettings) => ({
  md: Math.max(theme.containerPaddingInner - 4, 12),
  lg: Math.max(theme.containerPaddingInner, 16),
  xl: Math.max(theme.containerPaddingInner + 8, 20),
});

const resolveCardPadding = (theme: ThemeSettings) => ({
  sm: Math.max(theme.containerPaddingInner - 12, 8),
  md: Math.max(theme.containerPaddingInner - 8, 12),
  lg: Math.max(theme.containerPaddingInner - 4, 16),
  xl: Math.max(theme.containerPaddingInner, 20),
});

const resolveStackGap = (theme: ThemeSettings) => ({
  sm: Math.max(Math.round(theme.gridGutter / 3), 8),
  md: Math.max(Math.round(theme.gridGutter * (2 / 3)), 12),
  lg: Math.max(Math.round(theme.gridGutter * (5 / 6)), 16),
});

const resolveGradientIconTileRadius = (theme: ThemeSettings) => ({
  md: Math.max(theme.cardRadius - 10, 12),
  lg: Math.max(theme.cardRadius - 2, 20),
});

const resolveChatRadius = (theme: ThemeSettings) => ({
  bubble: Math.max(theme.cardRadius - 4, 18),
  card: Math.max(theme.cardRadius - 4, 18),
  inset: Math.max(theme.cardRadius - 6, 16),
});

const resolveChatPanelRadius = (theme: ThemeSettings) => ({
  minimal: Math.max(theme.cardRadius + 2, 24),
  compact: Math.max(theme.cardRadius - 2, 20),
  spotlightSm: Math.max(theme.cardRadius - 8, 16),
  spotlightMd: Math.max(theme.cardRadius - 4, 18),
});

const resolveChatPadding = (theme: ThemeSettings) => {
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

const resolveChatHeaderPadding = (theme: ThemeSettings) => {
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

const DEFAULT_KANGUR_RUNTIME_VARS = {
  '--kangur-font-heading': 'system-ui, sans-serif',
  '--kangur-font-body': 'system-ui, sans-serif',
  '--kangur-font-base-size': '16px',
  '--kangur-font-line-height': '1.6',
  '--kangur-page-max-width': '1440px',
  '--kangur-page-padding-top': '40px',
  '--kangur-page-padding-right': '32px',
  '--kangur-page-padding-bottom': '80px',
  '--kangur-page-padding-left': '32px',
  '--kangur-grid-gutter': '24px',
  '--kangur-panel-radius-elevated': '36px',
  '--kangur-panel-radius-soft': '34px',
  '--kangur-panel-radius-subtle': '26px',
  '--kangur-card-radius': '26px',
  '--kangur-lesson-callout-radius': '24px',
  '--kangur-lesson-inset-radius': '18px',
  '--kangur-gradient-icon-tile-radius-md': '16px',
  '--kangur-gradient-icon-tile-radius-lg': '24px',
  '--kangur-accent-indigo-start': '#a855f7',
  '--kangur-accent-indigo-end': '#6366f1',
  '--kangur-accent-violet-start': '#8b5cf6',
  '--kangur-accent-violet-end': '#d946ef',
  '--kangur-accent-emerald-start': '#10b981',
  '--kangur-accent-emerald-end': '#06b6d4',
  '--kangur-accent-sky-start': '#38bdf8',
  '--kangur-accent-sky-end': '#818cf8',
  '--kangur-accent-amber-start': '#fb923c',
  '--kangur-accent-amber-end': '#facc15',
  '--kangur-accent-rose-start': '#f87171',
  '--kangur-accent-rose-end': '#f472b6',
  '--kangur-accent-teal-start': '#3b82f6',
  '--kangur-accent-teal-end': '#2dd4bf',
  '--kangur-accent-slate-start': '#94a3b8',
  '--kangur-accent-slate-end': '#475569',
  '--kangur-gradient-soft-mid': '#ffffff',
  '--kangur-chat-bubble-radius': '22px',
  '--kangur-chat-card-radius': '22px',
  '--kangur-chat-inset-radius': '20px',
  '--kangur-chat-panel-radius-minimal': '28px',
  '--kangur-chat-panel-radius-compact': '24px',
  '--kangur-chat-spotlight-radius-sm': '18px',
  '--kangur-chat-spotlight-radius-md': '22px',
  '--kangur-chat-spotlight-border': 'rgba(251, 191, 36, 0.75)',
  '--kangur-chat-spotlight-background': 'rgba(254, 243, 199, 0.1)',
  '--kangur-chat-spotlight-shadow': 'rgba(251, 191, 36, 0.12)',
  '--kangur-chat-avatar-shell-background': 'rgba(255,255,255,0.15)',
  '--kangur-chat-avatar-shell-border': 'rgba(255,255,255,0.3)',
  '--kangur-chat-avatar-shell-shadow':
    'inset 0 1px 0 rgba(255,255,255,0.24), 0 1px 2px rgba(15,23,42,0.06)',
  '--kangur-chat-avatar-svg-shadow': '0 1px 2px rgba(15,23,42,0.14)',
  '--kangur-chat-warm-overlay-background':
    'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background) 74%, #fef3c7), var(--kangur-soft-card-background) 44%, color-mix(in srgb, var(--kangur-page-background) 80%, #eef2ff))',
  '--kangur-chat-warm-overlay-border': 'rgba(253,230,138,0.6)',
  '--kangur-chat-warm-overlay-shadow-callout':
    '0 20px 48px -30px rgba(180,83,9,0.34), inset 0 1px 0 rgba(255,255,255,0.5)',
  '--kangur-chat-warm-overlay-shadow-modal':
    '0 26px 60px -34px rgba(180,83,9,0.34), inset 0 1px 0 rgba(255,255,255,0.5)',
  '--kangur-chat-header-snap-background':
    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background) 64%, #fff2c6) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 78%, #ffe8b4) 100%)',
  '--kangur-chat-pointer-glow': '#fef3c7',
  '--kangur-chat-pointer-marker': '#b45309',
  '--kangur-chat-tail-background': 'var(--kangur-soft-card-background)',
  '--kangur-chat-tail-border': 'rgba(251,191,36,0.32)',
  '--kangur-chat-sheet-handle-background': 'rgba(251,191,36,0.22)',
  '--kangur-chat-composer-background':
    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background) 88%, transparent) 0%, transparent 100%)',
  '--kangur-chat-selection-badge-background':
    'color-mix(in srgb, var(--kangur-soft-card-background) 18%, rgba(255,255,255,0.16))',
  '--kangur-chat-backdrop': 'rgba(15, 23, 42, 0.18)',
  '--kangur-chat-backdrop-strong': 'rgba(15, 23, 42, 0.32)',
  '--kangur-chat-panel-snap-ring': 'rgba(251, 191, 36, 0.8)',
  '--kangur-chat-panel-snap-shadow':
    '0 0 0 1px rgba(251,191,36,0.22), 0 28px 56px -28px rgba(217,119,6,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
  '--kangur-chat-accent-border': '#f59e0b',
  '--kangur-chat-user-bubble-background': 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
  '--kangur-chat-user-bubble-shadow':
    '0 14px 28px -18px rgba(249,115,22,0.52), 0 1px 0 rgba(255,255,255,0.18) inset',
  '--kangur-chat-user-bubble-border': 'rgba(251, 146, 60, 0.6)',
  '--kangur-chat-user-bubble-text': '#ffffff',
  '--kangur-chat-user-drawing-border': 'rgba(253, 186, 116, 0.5)',
  '--kangur-chat-user-drawing-shadow': '0 8px 20px -12px rgba(249,115,22,0.3)',
  '--kangur-chat-typing-dot': '#b45309',
  '--kangur-chat-floating-avatar-background':
    'linear-gradient(135deg, #fcd34d 0%, #fb923c 55%, #f97316 100%)',
  '--kangur-chat-floating-avatar-border': '#78350f',
  '--kangur-chat-floating-avatar-shadow': '0 14px 28px -16px rgba(154,82,24,0.26)',
  '--kangur-chat-floating-avatar-focus-ring': 'rgba(251,191,36,0.7)',
  '--kangur-chat-floating-avatar-rim': '#78350f',
  '--kangur-chat-notice-badge-background': '#ef4444',
  '--kangur-chat-notice-badge-ring': '#ffffff',
  '--kangur-chat-notice-badge-dot': '#ffffff',
  '--kangur-chat-info-text': '#0369a1',
  '--kangur-chat-info-pill-background': 'rgba(186, 230, 253, 0.7)',
  '--kangur-chat-info-pill-text': '#0369a1',
  '--kangur-chat-feedback-positive-background': '#ecfdf5',
  '--kangur-chat-feedback-positive-border': '#a7f3d0',
  '--kangur-chat-feedback-positive-text': '#047857',
  '--kangur-chat-feedback-negative-background': '#fff1f2',
  '--kangur-chat-feedback-negative-border': '#fecdd3',
  '--kangur-chat-feedback-negative-text': '#be123c',
  '--kangur-chat-danger-background': '#fff1f2',
  '--kangur-chat-danger-text': '#ef4444',
  '--kangur-chat-selection-action-shadow':
    '0 12px 28px -14px rgba(245,158,11,0.45), 0 4px 10px -6px rgba(15,23,42,0.2)',
  '--kangur-chat-send-shadow': '0 8px 20px -10px rgba(245,158,11,0.4)',
  '--kangur-chat-divider':
    'color-mix(in srgb, var(--kangur-soft-card-border) 80%, rgba(245,158,11,0.15))',
  '--kangur-chat-surface-soft-background':
    'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 92%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 84%, var(--kangur-page-background)) 100%)',
  '--kangur-chat-surface-soft-border': 'var(--kangur-soft-card-border)',
  '--kangur-chat-surface-soft-shadow': '0 12px 28px -18px rgba(15,23,42,0.18)',
  '--kangur-chat-surface-warm-background':
    'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 90%, rgba(255,248,220,0.98)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 84%, rgba(254,243,199,0.9)) 100%)',
  '--kangur-chat-surface-warm-border':
    'color-mix(in srgb, var(--kangur-soft-card-border) 76%, rgb(251 191 36))',
  '--kangur-chat-surface-warm-shadow': '0 8px 18px -12px rgba(245,158,11,0.18)',
  '--kangur-chat-surface-info-background':
    'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(224,242,254,0.9)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(239,246,255,0.82)) 100%)',
  '--kangur-chat-surface-info-border':
    'color-mix(in srgb, var(--kangur-soft-card-border) 74%, rgb(125 211 252))',
  '--kangur-chat-surface-info-shadow': '0 8px 18px -12px rgba(14,165,233,0.22)',
  '--kangur-chat-surface-success-background':
    'color-mix(in srgb, var(--kangur-soft-card-background) 82%, rgba(209,250,229,0.92))',
  '--kangur-chat-surface-success-border':
    'color-mix(in srgb, var(--kangur-soft-card-border) 74%, rgb(110 231 183))',
  '--kangur-chat-surface-success-shadow': '0 6px 16px -10px rgba(5,150,105,0.18)',
  '--kangur-chat-padding-x-sm': '12px',
  '--kangur-chat-padding-y-sm': '8px',
  '--kangur-chat-padding-x-md': '12px',
  '--kangur-chat-padding-y-md': '12px',
  '--kangur-chat-padding-x-lg': '16px',
  '--kangur-chat-padding-y-lg': '12px',
  '--kangur-chat-header-padding-x-sm': '12px',
  '--kangur-chat-header-padding-y-sm': '10px',
  '--kangur-chat-header-padding-x-md': '16px',
  '--kangur-chat-header-padding-y-md': '12px',
  '--kangur-chat-header-padding-x-lg': '20px',
  '--kangur-chat-header-padding-y-lg': '16px',
  '--kangur-panel-padding-md': '20px',
  '--kangur-panel-padding-lg': '24px',
  '--kangur-panel-padding-xl': '32px',
  '--kangur-card-padding-sm': '12px',
  '--kangur-card-padding-md': '16px',
  '--kangur-card-padding-lg': '20px',
  '--kangur-card-padding-xl': '24px',
  '--kangur-media-padding-sm': '12px',
  '--kangur-media-padding-md': '16px',
  '--kangur-stack-gap-sm': '8px',
  '--kangur-stack-gap-md': '16px',
  '--kangur-stack-gap-lg': '20px',
  '--kangur-nav-group-radius': '30px',
  '--kangur-nav-item-radius': '20px',
  '--kangur-segmented-control-radius': '28px',
  '--kangur-segmented-item-radius': '18px',
  '--kangur-menu-item-radius': '16px',
  '--kangur-pill-padding-x': '16px',
  '--kangur-pill-padding-y': '10px',
  '--kangur-pill-font-size': '14px',
  '--kangur-button-padding-x': '20px',
  '--kangur-button-padding-y': '10px',
  '--kangur-button-font-size': '14px',
  '--kangur-button-height': '50px',
  '--kangur-button-radius': '999px',
  '--kangur-input-height': '50px',
  '--kangur-input-radius': '22px',
  '--kangur-input-font-size': '14px',
} satisfies Record<string, string>;

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

const HOME_ACTION_THEME_CONFIG = [
  { id: 'lessons', prefix: 'homeActionLessons' },
  { id: 'play', prefix: 'homeActionPlay' },
  { id: 'training', prefix: 'homeActionTraining' },
  { id: 'kangur', prefix: 'homeActionKangur' },
] as const;

const resolveHomeActionVars = (theme: ThemeSettings): Record<string, string> => {
  const vars: Record<string, string> = {};
  const setVar = (name: string, value: unknown): void => {
    if (isNonEmptyString(value)) {
      vars[name] = value.trim();
    }
  };
  const setMidVar = (
    name: string,
    start: string | undefined,
    mid: string | undefined,
    end: string | undefined
  ): void => {
    if (isNonEmptyString(mid)) {
      vars[name] = mid.trim();
      return;
    }
    if (isNonEmptyString(start) && isNonEmptyString(end)) {
      vars[name] = mixCssColor(start.trim(), end.trim(), 50);
    }
  };
  const setRgbVar = (name: string, value: string | undefined): void => {
    if (!isNonEmptyString(value)) return;
    const tuple = toRgbTupleString(value);
    if (tuple) vars[name] = tuple;
  };

  HOME_ACTION_THEME_CONFIG.forEach(({ id, prefix }) => {
    const get = (suffix: string): string | undefined =>
      (theme as Record<string, string>)[`${prefix}${suffix}`];

    const text = get('TextColor');
    const textActive = get('TextActiveColor');
    setVar(`--kangur-home-action-${id}-text`, text);
    setVar(`--kangur-home-action-${id}-text-active`, textActive);

    const labelStart = get('LabelStart');
    const labelMid = get('LabelMid');
    const labelEnd = get('LabelEnd');
    setVar(`--kangur-home-action-${id}-label-start`, labelStart);
    setVar(`--kangur-home-action-${id}-label-end`, labelEnd);
    setMidVar(`--kangur-home-action-${id}-label-mid`, labelStart, labelMid, labelEnd);

    const accentStart = get('AccentStart');
    const accentMid = get('AccentMid');
    const accentEnd = get('AccentEnd');
    setVar(`--kangur-home-action-${id}-accent-start`, accentStart);
    setVar(`--kangur-home-action-${id}-accent-end`, accentEnd);
    setMidVar(`--kangur-home-action-${id}-accent-mid`, accentStart, accentMid, accentEnd);

    const underlayStart = get('UnderlayStart');
    const underlayMid = get('UnderlayMid');
    const underlayEnd = get('UnderlayEnd');
    setVar(`--kangur-home-action-${id}-underlay-start`, underlayStart);
    setVar(`--kangur-home-action-${id}-underlay-end`, underlayEnd);
    setMidVar(`--kangur-home-action-${id}-underlay-mid`, underlayStart, underlayMid, underlayEnd);

    const underlayTintStart = get('UnderlayTintStart');
    const underlayTintMid = get('UnderlayTintMid');
    const underlayTintEnd = get('UnderlayTintEnd');
    setVar(`--kangur-home-action-${id}-underlay-tint-start`, underlayTintStart);
    setVar(`--kangur-home-action-${id}-underlay-tint-end`, underlayTintEnd);
    setMidVar(
      `--kangur-home-action-${id}-underlay-tint-mid`,
      underlayTintStart,
      underlayTintMid,
      underlayTintEnd
    );

    const accentShadowSource =
      get('AccentShadowColor') || accentMid || accentStart || accentEnd;
    const underlayShadowSource =
      get('UnderlayShadowColor') || underlayTintMid || underlayMid || underlayTintStart || underlayStart;
    const surfaceShadowSource =
      get('SurfaceShadowColor') || underlayTintEnd || underlayEnd || underlayTintMid || underlayMid;

    setRgbVar(`--kangur-home-action-${id}-accent-shadow-rgb`, accentShadowSource);
    setRgbVar(`--kangur-home-action-${id}-underlay-shadow-rgb`, underlayShadowSource);
    setRgbVar(`--kangur-home-action-${id}-surface-shadow-rgb`, surfaceShadowSource);
  });

  return vars;
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
  const primaryButtonBase = resolveSolidColor(theme.btnPrimaryBg, primary);
  const secondaryButtonBase = resolveSolidColor(theme.btnSecondaryBg, surfaceBackground);
  const warningBackground = theme.accentColor || accent;
  const successBackground = theme.successColor || '#22c55e';
  const dangerBackground = theme.errorColor || '#ef4444';
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
  const accentBorder = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(warningBackground, '#ffffff', 68)
    : darkenCssColor(warningBackground, 6);
  const userBubbleBackground = `linear-gradient(135deg, ${mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 70 : 82
  )} 0%, ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 18 : 10)} 100%)`;
  const userBubbleShadow = `0 14px 28px -18px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 36
  )}, 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 10 : 18)} inset`;
  const userBubbleBorder = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 32 : 58
  );
  const userBubbleText = theme.btnPrimaryText || '#ffffff';
  const userDrawingBorder = `color-mix(in srgb, ${warningBackground} ${
    isDarkStorefrontAppearanceMode(mode) ? 30 : 40
  }%, transparent)`;
  const userDrawingShadow = `0 8px 20px -12px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 58 : 32
  )}`;
  const typingDot = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(warningBackground, '#000000', 38)
    : darkenCssColor(warningBackground, 28);
  const floatingAvatarBackground = `linear-gradient(135deg, ${mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 64 : 72
  )} 0%, ${mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 44 : 56)} 55%, ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 22 : 12
  )} 100%)`;
  const floatingAvatarBorder = mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 62 : 72
  );
  const floatingAvatarShadow = `0 14px 28px -16px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 62 : 32
  )}`;
  const floatingAvatarFocusRing = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 42 : 34
  );
  const noticeBadgeBackground =
    isDarkStorefrontAppearanceMode(mode) ? mixCssColor(dangerBackground, '#000000', 12) : dangerBackground;
  const noticeBadgeRing = '#ffffff';
  const noticeBadgeDot = '#ffffff';
  const infoText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(infoBackground, '#ffffff', 72)
    : darkenCssColor(infoBackground, 22);
  const infoPillBackground = `color-mix(in srgb, ${infoBackground} ${
    isDarkStorefrontAppearanceMode(mode) ? 24 : 18
  }%, ${surfaceTone.background})`;
  const feedbackPositiveBackground = `color-mix(in srgb, ${successBackground} ${
    isDarkStorefrontAppearanceMode(mode) ? 20 : 12
  }%, ${surfaceTone.background})`;
  const feedbackPositiveBorder = mixCssColor(
    successBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 32 : 62
  );
  const feedbackPositiveText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(successBackground, '#ffffff', 78)
    : darkenCssColor(successBackground, 30);
  const feedbackNegativeBackground = `color-mix(in srgb, ${dangerBackground} ${
    isDarkStorefrontAppearanceMode(mode) ? 18 : 12
  }%, ${surfaceTone.background})`;
  const feedbackNegativeBorder = mixCssColor(
    dangerBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 30 : 62
  );
  const feedbackNegativeText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(dangerBackground, '#ffffff', 78)
    : darkenCssColor(dangerBackground, 18);
  const dangerHoverBackground = `color-mix(in srgb, ${dangerBackground} ${
    isDarkStorefrontAppearanceMode(mode) ? 22 : 10
  }%, ${surfaceTone.background})`;
  const dangerText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(dangerBackground, '#ffffff', 82)
    : darkenCssColor(dangerBackground, 6);
  const selectionActionShadow = `0 12px 28px -14px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 54 : 32
  )}, 0 4px 10px -6px ${mixCssColor(
    theme.backgroundColor,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 24
  )}`;
  const sendShadow = `0 8px 20px -10px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 52 : 30
  )}`;
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
  const primaryGradientStart = mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 82 : 68
  );
  const primaryGradientMid = mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 58
  );
  const primaryGradientEnd = darkenCssColor(
    primaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? 18 : 8
  );
  const primaryGradientHoverStart = mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 58
  );
  const primaryGradientHoverMid = darkenCssColor(
    primaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? 10 : 2
  );
  const primaryGradientHoverEnd = darkenCssColor(
    primaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? 20 : 10
  );
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
      '--kangur-cta-warning-start': warningGradientStart,
      '--kangur-cta-warning-end': warningGradientEnd,
      '--kangur-cta-warning-hover-start': warningGradientHoverStart,
      '--kangur-cta-warning-hover-end': warningGradientHoverEnd,
      '--kangur-cta-success-start': successGradientStart,
      '--kangur-cta-success-end': successGradientEnd,
      '--kangur-page-text': toneText,
      '--kangur-page-muted-text': pageMutedText,
      '--kangur-button-primary-background': primaryButtonBackground,
      '--kangur-button-primary-hover-background': primaryButtonHoverBackground,
      '--kangur-button-primary-shadow':
        `0 12px 24px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 34 : 24)}, inset 0 1px 0 ${mixCssColor(theme.btnPrimaryText || '#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 18 : 38)}`,
      '--kangur-button-primary-hover-shadow':
        `0 22px 34px -18px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 40 : 30)}, 0 14px 24px -18px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 22 : 16)}, inset 0 1px 0 ${mixCssColor(theme.btnPrimaryText || '#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 24 : 42)}`,
      '--kangur-button-secondary-background': secondaryButtonBackground,
      '--kangur-button-secondary-hover-background': secondaryButtonHoverBackground,
      '--kangur-button-secondary-shadow':
        `0 16px 28px -24px ${mixCssColor(secondaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 28)}, inset 0 1px 0 ${mixCssColor(theme.btnSecondaryText || toneText, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 10 : 28)}`,
      '--kangur-button-secondary-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.btnSecondaryText || toneText, '#ffffff', 92)
          : theme.btnSecondaryText || toneText,
      '--kangur-button-secondary-hover-text': toneText,
      '--kangur-button-surface-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 92 : 90)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 12 : 16)} 100%)`,
      '--kangur-button-surface-hover-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 84)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 18 : 22)} 100%)`,
      '--kangur-button-surface-shadow':
        `0 16px 28px -24px ${mixCssColor(primary, '#000000', isDarkStorefrontAppearanceMode(mode) ? 26 : 18)}, inset 0 1px 0 ${mixCssColor(primary, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 10 : 18)}`,
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
      '--kangur-button-warning-shadow':
        `0 16px 28px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 44 : 26)}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 10 : 50)}`,
      '--kangur-button-warning-hover-shadow':
        `0 20px 32px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 34)}, 0 14px 24px -24px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 18 : 10)}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 14 : 56)}`,
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
      '--kangur-button-success-shadow':
        `0 16px 28px -24px ${mixCssColor(successBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 42 : 24)}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 10 : 42)}`,
      '--kangur-button-success-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#d1fae5', '#ffffff', 92)
          : darkenCssColor(successBackground, 36),
      '--kangur-button-success-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#ecfdf5', '#ffffff', 96)
          : darkenCssColor(successBackground, 44),
      '--kangur-chat-panel-background':
        `linear-gradient(180deg, ${mixCssColor(chatBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 92 : 94)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 94 : 88)} 100%)`,
      '--kangur-chat-panel-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 24)
          : mixCssColor(accent, '#ffffff', 34),
      '--kangur-chat-panel-shadow':
        `0 20px 48px -30px ${mixCssColor(chatBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 20)}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 6 : 22)}`,
      '--kangur-chat-header-background':
        `linear-gradient(180deg, ${mixCssColor(accent, chatBackground, isDarkStorefrontAppearanceMode(mode) ? 32 : 22)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 92 : 86)} 100%)`,
      '--kangur-chat-header-snap-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceTone.background, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 28 : 22)} 0%, ${mixCssColor(surfaceTone.background, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 36 : 28)} 100%)`,
      '--kangur-chat-header-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 20)
          : mixCssColor(accent, '#ffffff', 28),
      '--kangur-chat-spotlight-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 36)
          : mixCssColor(accent, '#ffffff', 46),
      '--kangur-chat-spotlight-background':
        `color-mix(in srgb, ${accent} ${isDarkStorefrontAppearanceMode(mode) ? 18 : 12}%, transparent)`,
      '--kangur-chat-spotlight-shadow':
        `color-mix(in srgb, ${accent} ${isDarkStorefrontAppearanceMode(mode) ? 22 : 12}%, transparent)`,
      '--kangur-chat-avatar-shell-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(chatBackground, '#ffffff', 24)
          : mixCssColor(surfaceTone.background, '#ffffff', 78),
      '--kangur-chat-avatar-shell-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 34)
          : mixCssColor(borderColor, '#ffffff', 72),
      '--kangur-chat-avatar-shell-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.24), 0 1px 2px rgba(15,23,42,0.06)',
      '--kangur-chat-avatar-svg-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? '0 1px 2px rgba(15,23,42,0.18)'
          : '0 1px 2px rgba(15,23,42,0.12)',
      '--kangur-chat-warm-overlay-background': warmOverlayBackground,
      '--kangur-chat-warm-overlay-border': warmOverlayBorder,
      '--kangur-chat-warm-overlay-shadow-callout': warmOverlayShadowCallout,
      '--kangur-chat-warm-overlay-shadow-modal': warmOverlayShadowModal,
      '--kangur-chat-pointer-glow':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 18)
          : mixCssColor(warningBackground, '#ffffff', 16),
      '--kangur-chat-pointer-marker':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 72)
          : mixCssColor(warningBackground, '#000000', 82),
      '--kangur-chat-tail-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(surfaceTone.background, pageTone.background, 90)
          : mixCssColor(surfaceTone.background, '#ffffff', 94),
      '--kangur-chat-tail-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 20)
          : mixCssColor(accent, '#ffffff', 28),
      '--kangur-chat-sheet-handle-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 20)
          : mixCssColor(accent, '#ffffff', 28),
      '--kangur-chat-composer-background': composerBackground,
      '--kangur-chat-selection-badge-background': selectionBadgeBackground,
      '--kangur-chat-backdrop': backdrop,
      '--kangur-chat-backdrop-strong': backdropStrong,
      '--kangur-chat-panel-snap-ring': panelSnapRing,
      '--kangur-chat-panel-snap-shadow': panelSnapShadow,
      '--kangur-chat-accent-border': accentBorder,
      '--kangur-chat-user-bubble-background': userBubbleBackground,
      '--kangur-chat-user-bubble-shadow': userBubbleShadow,
      '--kangur-chat-user-bubble-border': userBubbleBorder,
      '--kangur-chat-user-bubble-text': userBubbleText,
      '--kangur-chat-user-drawing-border': userDrawingBorder,
      '--kangur-chat-user-drawing-shadow': userDrawingShadow,
      '--kangur-chat-typing-dot': typingDot,
      '--kangur-chat-floating-avatar-background': floatingAvatarBackground,
      '--kangur-chat-floating-avatar-border': floatingAvatarBorder,
      '--kangur-chat-floating-avatar-shadow': floatingAvatarShadow,
      '--kangur-chat-floating-avatar-focus-ring': floatingAvatarFocusRing,
      '--kangur-chat-floating-avatar-rim': floatingAvatarBorder,
      '--kangur-chat-notice-badge-background': noticeBadgeBackground,
      '--kangur-chat-notice-badge-ring': noticeBadgeRing,
      '--kangur-chat-notice-badge-dot': noticeBadgeDot,
      '--kangur-chat-info-text': infoText,
      '--kangur-chat-info-pill-background': infoPillBackground,
      '--kangur-chat-info-pill-text': infoText,
      '--kangur-chat-feedback-positive-background': feedbackPositiveBackground,
      '--kangur-chat-feedback-positive-border': feedbackPositiveBorder,
      '--kangur-chat-feedback-positive-text': feedbackPositiveText,
      '--kangur-chat-feedback-negative-background': feedbackNegativeBackground,
      '--kangur-chat-feedback-negative-border': feedbackNegativeBorder,
      '--kangur-chat-feedback-negative-text': feedbackNegativeText,
      '--kangur-chat-danger-background': dangerHoverBackground,
      '--kangur-chat-danger-text': dangerText,
      '--kangur-chat-selection-action-shadow': selectionActionShadow,
      '--kangur-chat-send-shadow': sendShadow,
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
} => (theme ? resolveThemedKangurStorefrontAppearance(theme, mode) : resolveDefaultKangurStorefrontAppearance(mode));

export function CmsStorefrontAppearanceProvider({
  children,
  initialMode = 'default',
  storageKey,
}: CmsStorefrontAppearanceProviderProps): React.JSX.Element {
  const [mode, setMode] = useState<CmsStorefrontAppearanceMode>(normalizeMode(initialMode));
  const skipNextPersistenceWriteRef = React.useRef(false);

  useEffect(() => {
    if (!storageKey) {
      setMode(normalizeMode(initialMode));
      return;
    }

    skipNextPersistenceWriteRef.current = true;
    setMode(readPersistedMode(storageKey) ?? normalizeMode(initialMode));
  }, [initialMode, storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    if (skipNextPersistenceWriteRef.current) {
      skipNextPersistenceWriteRef.current = false;
      return;
    }

    writePersistedMode(storageKey, mode);
  }, [mode, storageKey]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
    }),
    [mode]
  );

  return (
    <CmsStorefrontAppearanceContext.Provider value={value}>
      {children}
    </CmsStorefrontAppearanceContext.Provider>
  );
}

export function useOptionalCmsStorefrontAppearance():
  | CmsStorefrontAppearanceContextValue
  | null {
  return useContext(CmsStorefrontAppearanceContext);
}

export function CmsStorefrontAppearanceButtons({
  tone,
  className,
  label = 'Storefront appearance',
  testId,
  modes,
  modeLabels,
}: CmsStorefrontAppearanceButtonsProps): React.JSX.Element | null {
  const appearance = useOptionalCmsStorefrontAppearance();
  if (!appearance) return null;

  const { mode, setMode } = appearance;
  const fallbackModes: CmsStorefrontAppearanceMode[] = ['default', 'dark'];
  const resolvedModes = (modes && modes.length > 0 ? modes : fallbackModes)
    .map((entry) => (VALID_MODES.has(entry) ? entry : null))
    .filter(Boolean) as CmsStorefrontAppearanceMode[];
  const uniqueModes = Array.from(new Set(resolvedModes));
  const orderedModes = uniqueModes.length >= 2 ? uniqueModes : fallbackModes;
  const currentIndex = orderedModes.indexOf(mode);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextMode = orderedModes[(safeIndex + 1) % orderedModes.length];
  const currentLabel = modeLabels?.[mode] ?? DEFAULT_MODE_LABELS[mode] ?? mode;
  const nextLabel = modeLabels?.[nextMode] ?? DEFAULT_MODE_LABELS[nextMode] ?? nextMode;
  const buttonAriaLabel = `Current theme: ${currentLabel}. Switch to ${nextLabel}`;
  const isTogglePair = orderedModes.length === 2;
  const resolvedTone = withFallbackTone(tone);
  const isDarkMode = isDarkStorefrontAppearanceMode(mode);
  const buttonAccentWeight = isDarkMode ? '11%' : '16%';
  const wrapperClassName = ['inline-flex flex-wrap items-center gap-2', className]
    .filter(Boolean)
    .join(' ');
  const CurrentIcon = MODE_ICON_MAP[mode] ?? Sun;

  return (
    <div className={wrapperClassName} role='group' aria-label={label} data-testid={testId}>
      <button
        type='button'
        aria-label={buttonAriaLabel}
        aria-pressed={isTogglePair ? isDarkMode : undefined}
        onClick={() => setMode(nextMode)}
        title={`Current theme: ${currentLabel}. Switch to ${nextLabel}`}
        className='group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-[background-color,border-color,color,box-shadow] duration-300 ease-out motion-reduce:transition-none'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor: `color-mix(in srgb, ${resolvedTone.accent} ${buttonAccentWeight}, ${resolvedTone.background})`,
          color: isDarkMode ? '#f8fafc' : resolvedTone.accent,
          boxShadow: `0 14px 24px -20px ${isDarkMode ? 'rgba(15,23,42,0.45)' : resolvedTone.accent}`,
        }}
      >
        <CurrentIcon
          aria-hidden='true'
          className='h-4 w-4 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none'
        />
        <span className='sr-only'>{`Current theme: ${currentLabel}`}</span>
      </button>
    </div>
  );
}
