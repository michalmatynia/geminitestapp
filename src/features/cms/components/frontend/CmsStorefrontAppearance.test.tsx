/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '@/shared/contracts/cms-theme';

import {
  CmsStorefrontAppearanceButtons,
  CmsStorefrontAppearanceProvider,
  resolveCmsStorefrontAppearance,
  resolveKangurStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from './CmsStorefrontAppearance';

function AppearanceModeProbe(): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();

  return <div data-testid='appearance-mode' data-mode={appearance?.mode ?? 'missing'} />;
}

const TEST_STORAGE_KEY = 'cms-storefront-appearance-test-mode';

describe('CmsStorefrontAppearance', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('updates the selected appearance mode', () => {
    render(
      <CmsStorefrontAppearanceProvider>
        <CmsStorefrontAppearanceButtons />
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'default');
    expect(screen.getAllByRole('button')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Dark theme' }));

    expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to Default theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('restores a persisted light selection over a dark initial mode', async () => {
    window.localStorage.setItem(TEST_STORAGE_KEY, 'default');

    render(
      <CmsStorefrontAppearanceProvider initialMode='dark' storageKey={TEST_STORAGE_KEY}>
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'default');
    });
  });

  it('persists mode changes when a storage key is configured', async () => {
    render(
      <CmsStorefrontAppearanceProvider storageKey={TEST_STORAGE_KEY}>
        <CmsStorefrontAppearanceButtons />
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Dark theme' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(TEST_STORAGE_KEY)).toBe('dark');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Default theme' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(TEST_STORAGE_KEY)).toBe('default');
    });
  });

  it('hydrates the selected appearance mode from the provider input', () => {
    render(
      <CmsStorefrontAppearanceProvider initialMode='dark'>
        <CmsStorefrontAppearanceButtons />
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to Default theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('builds page-wide CMS appearance variables for dark mode', () => {
    const appearance = resolveCmsStorefrontAppearance(
      {
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc',
        textColor: '#111827',
        mutedTextColor: '#6b7280',
        borderColor: '#d1d5db',
        accentColor: '#2563eb',
        inputBg: '#ffffff',
        inputText: '#111827',
        inputBorderColor: '#cbd5e1',
        btnPrimaryBg: '#2563eb',
        btnPrimaryText: '#ffffff',
      },
      'dark'
    );

    expect(appearance.vars['--cms-appearance-bg']).toContain('color-mix');
    expect(appearance.vars['--cms-appearance-button-primary-text']).toContain('color-mix');
    expect(appearance.vars['--cms-appearance-input-border']).toContain('rgba(255,255,255,0.18)');
  });

  it('builds darker Kangur button and brighter tutor text variables for dark mode', () => {
    const appearance = resolveKangurStorefrontAppearance('dark');

    expect(appearance.vars['--kangur-button-secondary-background']).toContain('rgba(51,65,85');
    expect(appearance.vars['--kangur-button-warning-text']).toBe('#fde68a');
    expect(appearance.vars['--kangur-chat-panel-text']).toBe('#f8fafc');
    expect(appearance.vars['--kangur-chat-muted-text']).toBe('#d7e1ee');
    expect(appearance.vars['--kangur-page-max-width']).toBe('1440px');
    expect(appearance.vars['--kangur-page-padding-top']).toBe('40px');
    expect(appearance.vars['--kangur-page-padding-right']).toBe('32px');
    expect(appearance.vars['--kangur-page-padding-bottom']).toBe('80px');
    expect(appearance.vars['--kangur-page-padding-left']).toBe('32px');
    expect(appearance.vars['--kangur-grid-gutter']).toBe('24px');
    expect(appearance.vars['--kangur-nav-group-radius']).toBe('20px');
    expect(appearance.vars['--kangur-nav-item-radius']).toBe('18px');
    expect(appearance.vars['--kangur-card-radius']).toBe('26px');
    expect(appearance.vars['--kangur-lesson-callout-radius']).toBe('24px');
    expect(appearance.vars['--kangur-lesson-inset-radius']).toBe('18px');
    expect(appearance.vars['--kangur-gradient-icon-tile-radius-md']).toBe('16px');
    expect(appearance.vars['--kangur-gradient-icon-tile-radius-lg']).toBe('24px');
    expect(appearance.vars['--kangur-chat-bubble-radius']).toBe('22px');
    expect(appearance.vars['--kangur-chat-card-radius']).toBe('22px');
    expect(appearance.vars['--kangur-chat-inset-radius']).toBe('20px');
    expect(appearance.vars['--kangur-chat-panel-radius-minimal']).toBe('28px');
    expect(appearance.vars['--kangur-chat-panel-radius-compact']).toBe('24px');
    expect(appearance.vars['--kangur-chat-spotlight-radius-sm']).toBe('18px');
    expect(appearance.vars['--kangur-chat-spotlight-radius-md']).toBe('22px');
    expect(appearance.vars['--kangur-chat-spotlight-border']).toBe('rgba(251, 191, 36, 0.8)');
    expect(appearance.vars['--kangur-chat-avatar-shell-background']).toBe('rgba(255,255,255,0.12)');
    expect(appearance.vars['--kangur-chat-avatar-shell-border']).toBe('rgba(255,255,255,0.25)');
    expect(appearance.vars['--kangur-chat-pointer-marker']).toBe('#f59e0b');
    expect(appearance.vars['--kangur-chat-header-snap-background']).toContain(
      'rgba(251,191,36,0.32)'
    );
    expect(appearance.vars['--kangur-chat-warm-overlay-border']).toBe('rgba(251,191,36,0.32)');
    expect(appearance.vars['--kangur-chat-warm-overlay-shadow-callout']).toContain(
      'rgba(2,6,23,0.68)'
    );
    expect(appearance.vars['--kangur-chat-tail-border']).toBe('rgba(251,191,36,0.24)');
    expect(appearance.vars['--kangur-chat-sheet-handle-background']).toBe(
      'rgba(251,191,36,0.22)'
    );
  });

  it('preserves custom button gradients for Kangur themes', () => {
    const gradient = 'linear-gradient(135deg, #ff8a3d 0%, #ff5f6d 100%)';
    const appearance = resolveKangurStorefrontAppearance('default', {
      ...DEFAULT_THEME,
      btnPrimaryBg: gradient,
      btnSecondaryBg: gradient,
    });

    expect(appearance.vars['--kangur-button-primary-background']).toBe(gradient);
    expect(appearance.vars['--kangur-button-primary-hover-background']).toBe(gradient);
    expect(appearance.vars['--kangur-button-secondary-background']).toBe(gradient);
  });

  it('builds Kangur appearance variables from a provided theme document', () => {
    const appearance = resolveKangurStorefrontAppearance('default', {
      ...DEFAULT_THEME,
      backgroundColor: '#f5f0ff',
      surfaceColor: '#ffffff',
      textColor: '#1f1b3a',
      mutedTextColor: '#6c648c',
      borderColor: '#d9cff7',
      accentColor: '#8b5cf6',
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      btnPrimaryBg: '#7c3aed',
      btnPrimaryText: '#ffffff',
      btnSecondaryBg: '#ede9fe',
      btnSecondaryText: '#312e81',
      inputBg: '#ffffff',
      inputText: '#1f1b3a',
      inputBorderColor: '#c4b5fd',
      inputPlaceholder: '#7c3aed',
      containerBg: '#ffffff',
      containerBorderColor: '#ddd6fe',
      cardBg: '#ffffff',
      pillBg: '#f5f3ff',
      pillText: '#6d28d9',
      pillActiveBg: '#7c3aed',
      pillActiveText: '#ffffff',
      headingFont: 'Outfit, sans-serif',
      bodyFont: 'Manrope, sans-serif',
      baseSize: 18,
      lineHeight: 1.75,
      maxContentWidth: 1520,
      pagePaddingTop: 48,
      pagePaddingRight: 36,
      pagePaddingBottom: 88,
      pagePaddingLeft: 30,
      gridGutter: 30,
      containerRadius: 28,
      containerPaddingInner: 28,
      cardRadius: 22,
      btnPaddingX: 24,
      btnPaddingY: 12,
      btnFontSize: 16,
      btnRadius: 32,
      pillRadius: 18,
      pillPaddingX: 20,
      pillPaddingY: 12,
      pillFontSize: 15,
      inputHeight: 56,
      inputRadius: 16,
      inputFontSize: 16,
    });

    expect(appearance.background).toContain('#f5f0ff');
    expect(appearance.vars['--kangur-nav-item-active-background']).toContain('#7c3aed');
    expect(appearance.vars['--kangur-button-primary-background']).toContain('#7c3aed');
    expect(appearance.vars['--kangur-text-field-border']).toContain('#c4b5fd');
    expect(appearance.vars['--kangur-chat-panel-background']).toContain('#ffffff');
    expect(appearance.vars['--kangur-font-heading']).toBe('Outfit, sans-serif');
    expect(appearance.vars['--kangur-font-body']).toBe('Manrope, sans-serif');
    expect(appearance.vars['--kangur-font-base-size']).toBe('18px');
    expect(appearance.vars['--kangur-font-line-height']).toBe('1.75');
    expect(appearance.vars['--kangur-page-max-width']).toBe('1520px');
    expect(appearance.vars['--kangur-page-padding-top']).toBe('48px');
    expect(appearance.vars['--kangur-page-padding-right']).toBe('36px');
    expect(appearance.vars['--kangur-page-padding-bottom']).toBe('88px');
    expect(appearance.vars['--kangur-page-padding-left']).toBe('30px');
    expect(appearance.vars['--kangur-grid-gutter']).toBe('30px');
    expect(appearance.vars['--kangur-panel-radius-subtle']).toBe('28px');
    expect(appearance.vars['--kangur-card-radius']).toBe('22px');
    expect(appearance.vars['--kangur-lesson-callout-radius']).toBe('20px');
    expect(appearance.vars['--kangur-lesson-inset-radius']).toBe('14px');
    expect(appearance.vars['--kangur-gradient-icon-tile-radius-md']).toBe('12px');
    expect(appearance.vars['--kangur-gradient-icon-tile-radius-lg']).toBe('20px');
    expect(appearance.vars['--kangur-chat-bubble-radius']).toBe('18px');
    expect(appearance.vars['--kangur-chat-card-radius']).toBe('18px');
    expect(appearance.vars['--kangur-chat-inset-radius']).toBe('16px');
    expect(appearance.vars['--kangur-chat-panel-radius-minimal']).toBe('24px');
    expect(appearance.vars['--kangur-chat-panel-radius-compact']).toBe('20px');
    expect(appearance.vars['--kangur-chat-spotlight-radius-sm']).toBe('16px');
    expect(appearance.vars['--kangur-chat-spotlight-radius-md']).toBe('18px');
    expect(appearance.vars['--kangur-chat-padding-x-sm']).toBe('16px');
    expect(appearance.vars['--kangur-chat-padding-y-sm']).toBe('12px');
    expect(appearance.vars['--kangur-chat-padding-x-lg']).toBe('20px');
    expect(appearance.vars['--kangur-chat-padding-y-lg']).toBe('16px');
    expect(appearance.vars['--kangur-chat-header-padding-x-sm']).toBe('16px');
    expect(appearance.vars['--kangur-chat-header-padding-y-sm']).toBe('14px');
    expect(appearance.vars['--kangur-chat-header-padding-x-md']).toBe('16px');
    expect(appearance.vars['--kangur-chat-header-padding-y-md']).toBe('14px');
    expect(appearance.vars['--kangur-chat-header-padding-x-lg']).toBe('20px');
    expect(appearance.vars['--kangur-chat-header-padding-y-lg']).toBe('16px');
    expect(appearance.vars['--kangur-chat-spotlight-border']).toContain('#8b5cf6');
    expect(appearance.vars['--kangur-chat-avatar-shell-background']).toBe('rgba(255,255,255,0.18)');
    expect(appearance.vars['--kangur-chat-avatar-shell-border']).toBe('rgba(255,255,255,0.35)');
    expect(appearance.vars['--kangur-chat-pointer-marker']).toContain('#8b5cf6');
    expect(appearance.vars['--kangur-chat-header-snap-background']).toContain('#8b5cf6');
    expect(appearance.vars['--kangur-chat-warm-overlay-background']).toContain('#8b5cf6');
    expect(appearance.vars['--kangur-chat-tail-background']).toBe('var(--kangur-soft-card-background)');
    expect(appearance.vars['--kangur-chat-sheet-handle-background']).toContain('#8b5cf6');
    expect(appearance.vars['--kangur-panel-padding-md']).toBe('24px');
    expect(appearance.vars['--kangur-panel-padding-lg']).toBe('28px');
    expect(appearance.vars['--kangur-card-padding-sm']).toBe('16px');
    expect(appearance.vars['--kangur-card-padding-md']).toBe('20px');
    expect(appearance.vars['--kangur-stack-gap-sm']).toBe('10px');
    expect(appearance.vars['--kangur-stack-gap-md']).toBe('20px');
    expect(appearance.vars['--kangur-stack-gap-lg']).toBe('25px');
    expect(appearance.vars['--kangur-button-padding-x']).toBe('24px');
    expect(appearance.vars['--kangur-button-padding-y']).toBe('12px');
    expect(appearance.vars['--kangur-button-font-size']).toBe('16px');
    expect(appearance.vars['--kangur-button-height']).toBe('56px');
    expect(appearance.vars['--kangur-button-radius']).toBe('32px');
    expect(appearance.vars['--kangur-nav-group-radius']).toBe('28px');
    expect(appearance.vars['--kangur-nav-item-radius']).toBe('18px');
    expect(appearance.vars['--kangur-menu-item-radius']).toBe('14px');
    expect(appearance.vars['--kangur-pill-padding-x']).toBe('20px');
    expect(appearance.vars['--kangur-pill-padding-y']).toBe('12px');
    expect(appearance.vars['--kangur-pill-font-size']).toBe('15px');
    expect(appearance.vars['--kangur-input-height']).toBe('56px');
    expect(appearance.vars['--kangur-input-radius']).toBe('16px');
    expect(appearance.vars['--kangur-input-font-size']).toBe('16px');
  });
});
