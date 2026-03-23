import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';

export type CmsStorefrontAppearanceMode = 'default' | 'dark' | 'dawn' | 'sunset';

export type CmsAppearanceTone = {
  background?: string;
  text?: string;
  border?: string;
  accent?: string;
};

export type CmsStorefrontAppearanceContextValue = {
  mode: CmsStorefrontAppearanceMode;
  setMode: React.Dispatch<React.SetStateAction<CmsStorefrontAppearanceMode>>;
};

export type CmsStorefrontAppearanceProviderProps = {
  children: React.ReactNode;
  initialMode?: CmsStorefrontAppearanceMode;
  storageKey?: string;
  persistMode?: boolean;
};

export type CmsStorefrontAppearanceButtonsProps = {
  tone?: CmsAppearanceTone;
  className?: string;
  label?: string;
  testId?: string;
  modes?: CmsStorefrontAppearanceMode[];
  modeLabels?: Partial<Record<CmsStorefrontAppearanceMode, string>>;
};

export const DEFAULT_TONE: Required<CmsAppearanceTone> = {
  background: '#ffffff',
  text: '#111827',
  border: '#d1d5db',
  accent: '#2563eb',
};

export const DEFAULT_MODE_LABELS: Record<CmsStorefrontAppearanceMode, string> = {
  default: 'Default',
  dawn: 'Dawn',
  sunset: 'Sunset',
  dark: 'Dark',
};

export const MODE_ICON_MAP: Record<CmsStorefrontAppearanceMode, typeof Sun> = {
  default: Sun,
  dawn: Sunrise,
  sunset: Sunset,
  dark: Moon,
};

export const VALID_MODES = new Set<CmsStorefrontAppearanceMode>(['default', 'dark', 'dawn', 'sunset']);

export const DEFAULT_KANGUR_RUNTIME_VARS = {
  '--kangur-font-heading': 'system-ui, sans-serif',
  '--kangur-font-body': 'system-ui, sans-serif',
  '--kangur-font-base-size': '16px',
  '--kangur-font-line-height': '1.6',
  '--kangur-font-heading-line-height': '1.2',
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
  '--kangur-nav-group-radius': '20px',
  '--kangur-nav-item-radius': '18px',
  '--kangur-segmented-control-radius': '20px',
  '--kangur-segmented-item-radius': '16px',
  '--kangur-menu-item-radius': '14px',
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
  '--kangur-button-primary-text': '#ffffff',
  '--kangur-button-text-shadow': 'none',
  '--kangur-button-gloss-opacity': '0',
  '--kangur-button-gloss-height': '48%',
  '--kangur-button-gloss-angle': '180deg',
  '--kangur-button-border-width': '0px',
  '--kangur-button-border-color': 'transparent',
  '--kangur-button-border-radius': '999px',
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
};
