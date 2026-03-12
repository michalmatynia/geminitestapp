'use client';

import { Moon, Sun } from 'lucide-react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { darkenCssColor } from '@/shared/utils/color-utils';

export type CmsStorefrontAppearanceMode = 'default' | 'dark';

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
};

const DEFAULT_TONE: Required<CmsAppearanceTone> = {
  background: '#ffffff',
  text: '#111827',
  border: '#d1d5db',
  accent: '#2563eb',
};

const VALID_MODES = new Set<CmsStorefrontAppearanceMode>(['default', 'dark']);

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

  if (mode === 'dark') {
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
  const primaryButtonTone = resolveStorefrontAppearanceTone(
    {
      background: theme.btnPrimaryBg || accent,
      text: theme.btnPrimaryText || '#ffffff',
      border: theme.borderColor,
      accent,
    },
    mode
  );
  const resolvedPrimaryButtonTone =
    mode === 'dark'
      ? {
          ...primaryButtonTone,
          background: darkenCssColor(theme.btnPrimaryBg || accent, 28),
          border: darkenCssColor(theme.btnPrimaryBg || accent, 36),
          text: '#f8fafc',
        }
      : primaryButtonTone;

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
    primaryButtonTone: resolvedPrimaryButtonTone,
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
      '--cms-appearance-button-primary-background': resolvedPrimaryButtonTone.background,
      '--cms-appearance-button-primary-text': resolvedPrimaryButtonTone.text,
      '--cms-appearance-button-primary-border': resolvedPrimaryButtonTone.border,
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
        '--kangur-chat-header-border': 'rgba(251, 191, 36, 0.18)',
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
}: CmsStorefrontAppearanceButtonsProps): React.JSX.Element | null {
  const appearance = useOptionalCmsStorefrontAppearance();
  if (!appearance) return null;

  const { mode, setMode } = appearance;
  const resolvedTone = withFallbackTone(tone);
  const isDarkMode = mode === 'dark';
  const nextMode: CmsStorefrontAppearanceMode = isDarkMode ? 'default' : 'dark';
  const buttonLabel = isDarkMode ? 'Default' : 'Dark';
  const buttonAriaLabel = isDarkMode ? 'Switch to Default theme' : 'Switch to Dark theme';
  const buttonAccentWeight = isDarkMode ? '11%' : '16%';
  const wrapperClassName = ['inline-flex flex-wrap items-center gap-2', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName} role='group' aria-label={label} data-testid={testId}>
      <button
        type='button'
        aria-label={buttonAriaLabel}
        aria-pressed={isDarkMode}
        onClick={() => setMode(nextMode)}
        title={buttonAriaLabel}
        className='relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor: `color-mix(in srgb, ${resolvedTone.accent} ${buttonAccentWeight}, ${resolvedTone.background})`,
          color: isDarkMode ? '#f8fafc' : resolvedTone.accent,
          boxShadow: `0 14px 24px -20px ${isDarkMode ? 'rgba(15,23,42,0.45)' : resolvedTone.accent}`,
        }}
      >
        <Sun
          aria-hidden='true'
          className={[
            'absolute h-4 w-4 transition-all duration-300 ease-out',
            isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
          ].join(' ')}
        />
        <Moon
          aria-hidden='true'
          className={[
            'absolute h-4 w-4 transition-all duration-300 ease-out',
            isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
          ].join(' ')}
        />
        <span className='sr-only'>{buttonLabel}</span>
      </button>
    </div>
  );
}
