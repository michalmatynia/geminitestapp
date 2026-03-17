import {
  CmsStorefrontAppearanceMode,
  CmsAppearanceTone,
  DEFAULT_KANGUR_RUNTIME_VARS,
} from '../CmsStorefrontAppearance.contracts';
import { isDarkStorefrontAppearanceMode } from '../CmsStorefrontAppearance.utils';

export const resolveDefaultKangurStorefrontAppearance = (
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
        '--kangur-chat-spotlight-border': 'rgba(251, 191, 36, 0.8)',
        '--kangur-chat-spotlight-background': 'rgba(15, 23, 42, 0.18)',
        '--kangur-chat-spotlight-shadow': 'rgba(15, 23, 42, 0.32)',
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
