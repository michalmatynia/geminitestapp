'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { darkenCssColor } from '@/shared/utils/color-utils';

export const CMS_STOREFRONT_APPEARANCE_STORAGE_KEY = 'cms.storefront.appearance.v1';

export type CmsStorefrontAppearanceMode = 'default' | 'darker' | 'dark';

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

type CmsStorefrontAppearanceProviderProps = { children: React.ReactNode };

type CmsStorefrontAppearanceButtonsProps = {
  tone?: CmsAppearanceTone;
  className?: string;
  label?: string;
  testId?: string;
};

const DEFAULT_TONE: Required<CmsAppearanceTone> = {
  background: '#ffffff',
  text: '#111827',
  border: '#d1d5db',
  accent: '#2563eb',
};

const VALID_MODES = new Set<CmsStorefrontAppearanceMode>(['default', 'darker', 'dark']);

const CmsStorefrontAppearanceContext =
  createContext<CmsStorefrontAppearanceContextValue | null>(null);

const normalizeMode = (value: string | null | undefined): CmsStorefrontAppearanceMode => {
  if (!value) return 'default';
  return VALID_MODES.has(value as CmsStorefrontAppearanceMode)
    ? (value as CmsStorefrontAppearanceMode)
    : 'default';
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

  if (mode === 'darker') {
    return {
      ...baseTone,
      background: darkenCssColor(baseTone.background, 8),
      border: darkenCssColor(baseTone.border, 6),
    };
  }

  if (mode === 'dark') {
    return {
      ...baseTone,
      background: `color-mix(in srgb, ${baseTone.background} 18%, black)`,
      text: '#f3f4f6',
      border: 'rgba(255,255,255,0.18)',
    };
  }

  return baseTone;
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
  const primaryButtonTone = resolveStorefrontAppearanceTone(
    {
      background: theme.btnPrimaryBg || accent,
      text: theme.btnPrimaryText || '#ffffff',
      border: theme.borderColor,
      accent,
    },
    mode
  );

  const subtleSurface =
    mode === 'dark'
      ? `color-mix(in srgb, ${surfaceTone.background} 72%, ${pageTone.background})`
      : `color-mix(in srgb, ${surfaceTone.background} 88%, ${pageTone.background})`;
  const mutedText =
    mode === 'dark'
      ? 'rgba(243,244,246,0.72)'
      : theme.mutedTextColor ||
        `color-mix(in srgb, ${pageTone.text} 62%, ${pageTone.background})`;

  return {
    pageTone,
    surfaceTone,
    subtleSurface,
    mutedText,
    inputTone,
    primaryButtonTone,
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
      '--cms-appearance-button-primary-background': primaryButtonTone.background,
      '--cms-appearance-button-primary-text': primaryButtonTone.text,
      '--cms-appearance-button-primary-border': primaryButtonTone.border,
    },
  };
};

export const resolveKangurStorefrontAppearance = (
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  if (mode === 'darker') {
    return {
      background:
        'radial-gradient(circle at top, #f7f0f4 0%, #ede7ef 46%, #e4e0ef 100%)',
      tone: {
        background: '#f1e8f0',
        text: '#475569',
        border: 'rgba(255,255,255,0.78)',
        accent: '#4f46e5',
      },
      vars: {
        '--kangur-page-background':
          'radial-gradient(circle at top, #f7f0f4 0%, #ede7ef 46%, #e4e0ef 100%)',
        '--kangur-glass-panel-background':
          'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(247,240,244,0.78) 100%)',
        '--kangur-glass-panel-border': 'rgba(255,255,255,0.82)',
        '--kangur-glass-panel-shadow': '0 20px 60px rgba(126, 118, 154, 0.22)',
        '--kangur-soft-card-background': 'rgba(252,248,251,0.94)',
        '--kangur-soft-card-border': 'rgba(230,223,237,0.96)',
        '--kangur-soft-card-shadow': '0 14px 36px rgba(70, 82, 126, 0.1)',
        '--kangur-soft-card-text': '#334155',
        '--kangur-nav-group-background':
          'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(247,240,244,0.72) 100%)',
        '--kangur-nav-group-border': 'rgba(255,255,255,0.82)',
        '--kangur-nav-item-text': '#52627d',
        '--kangur-nav-item-hover-background': 'rgba(255,255,255,0.82)',
        '--kangur-nav-item-hover-border': 'rgba(255,255,255,0.88)',
        '--kangur-nav-item-hover-text': '#334155',
        '--kangur-nav-item-active-background':
          'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(237,233,254,0.94) 100%)',
        '--kangur-nav-item-active-border': 'rgba(224,231,255,0.92)',
        '--kangur-nav-item-active-text': '#4338ca',
        '--kangur-text-field-background': 'rgba(252,248,251,0.94)',
        '--kangur-text-field-border': 'rgba(230,223,237,0.96)',
        '--kangur-text-field-text': '#334155',
        '--kangur-text-field-placeholder': '#64748b',
        '--kangur-text-field-disabled-background': 'rgba(241,235,242,0.92)',
        '--kangur-text-field-disabled-border': 'rgba(222,215,231,0.96)',
        '--kangur-progress-track': 'rgba(226,232,240,0.92)',
        '--kangur-page-text': '#334155',
        '--kangur-page-muted-text': '#64748b',
      },
    };
  }

  if (mode === 'dark') {
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
      },
    };
  }

  return {
    background: 'radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%)',
    tone: {
      background: '#fffdfd',
      text: '#475569',
      border: 'rgba(255,255,255,0.78)',
      accent: '#4f46e5',
    },
    vars: {
      '--kangur-page-background':
        'radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%)',
      '--kangur-glass-panel-background':
        'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.58) 100%)',
      '--kangur-glass-panel-border': 'rgba(255,255,255,0.78)',
      '--kangur-glass-panel-shadow': '0 20px 60px rgba(168, 175, 216, 0.18)',
      '--kangur-soft-card-background': '#ffffff',
      '--kangur-soft-card-border': '#eef1f7',
      '--kangur-soft-card-shadow': '0 10px 28px rgba(33, 49, 91, 0.08)',
      '--kangur-soft-card-text': '#334155',
      '--kangur-nav-group-background':
        'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.58) 100%)',
      '--kangur-nav-group-border': 'rgba(255,255,255,0.78)',
      '--kangur-nav-item-text': '#64748b',
      '--kangur-nav-item-hover-background': 'rgba(255,255,255,0.78)',
      '--kangur-nav-item-hover-border': 'rgba(255,255,255,0.8)',
      '--kangur-nav-item-hover-text': '#334155',
      '--kangur-nav-item-active-background':
        'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(238,242,255,0.92) 100%)',
      '--kangur-nav-item-active-border': 'rgba(224,231,255,0.9)',
      '--kangur-nav-item-active-text': '#4338ca',
      '--kangur-text-field-background': 'rgba(255,255,255,0.92)',
      '--kangur-text-field-border': 'rgba(226,232,240,0.92)',
      '--kangur-text-field-text': '#334155',
      '--kangur-text-field-placeholder': '#94a3b8',
      '--kangur-text-field-disabled-background': 'rgba(241,245,249,0.92)',
      '--kangur-text-field-disabled-border': 'rgba(226,232,240,0.92)',
      '--kangur-progress-track': 'rgba(241,245,249,0.95)',
      '--kangur-page-text': '#334155',
      '--kangur-page-muted-text': '#64748b',
    },
  };
};

export function CmsStorefrontAppearanceProvider({
  children,
}: CmsStorefrontAppearanceProviderProps): React.JSX.Element {
  const [mode, setMode] = useState<CmsStorefrontAppearanceMode>('default');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedMode = normalizeMode(window.localStorage.getItem(CMS_STOREFRONT_APPEARANCE_STORAGE_KEY));
    setMode(storedMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(CMS_STOREFRONT_APPEARANCE_STORAGE_KEY, mode);
  }, [hydrated, mode]);

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
}: CmsStorefrontAppearanceButtonsProps): React.JSX.Element | null {
  const appearance = useOptionalCmsStorefrontAppearance();
  if (!appearance) return null;

  const { mode, setMode } = appearance;
  const resolvedTone = withFallbackTone(tone);
  const wrapperClassName = ['inline-flex flex-wrap items-center gap-2', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName} role='group' aria-label={label} data-testid={testId}>
      <button
        type='button'
        aria-label='Default background'
        aria-pressed={mode === 'default'}
        onClick={() => setMode('default')}
        className='inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor:
            mode === 'default'
              ? `color-mix(in srgb, ${resolvedTone.accent} 18%, ${resolvedTone.background})`
              : 'transparent',
          color: mode === 'default' ? resolvedTone.accent : resolvedTone.text,
        }}
      >
        Default
      </button>
      <button
        type='button'
        aria-label='Slightly darker background'
        aria-pressed={mode === 'darker'}
        onClick={() => setMode('darker')}
        className='inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor:
            mode === 'darker'
              ? `color-mix(in srgb, ${resolvedTone.accent} 18%, ${resolvedTone.background})`
              : 'transparent',
          color: mode === 'darker' ? resolvedTone.accent : resolvedTone.text,
        }}
      >
        Darker
      </button>
      <button
        type='button'
        aria-label='Dark mode'
        aria-pressed={mode === 'dark'}
        onClick={() => setMode('dark')}
        className='inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor:
            mode === 'dark'
              ? `color-mix(in srgb, ${resolvedTone.accent} 18%, ${resolvedTone.background})`
              : 'transparent',
          color: mode === 'dark' ? resolvedTone.accent : resolvedTone.text,
        }}
      >
        Dark
      </button>
    </div>
  );
}
