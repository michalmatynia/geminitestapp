/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

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

    expect(appearance.vars['--cms-appearance-page-background']).toContain('color-mix');
    expect(appearance.vars['--cms-appearance-button-primary-text']).toBe('#f8fafc');
    expect(appearance.vars['--cms-appearance-input-border']).toBe('rgba(255,255,255,0.18)');
  });

  it('builds darker Kangur button and brighter tutor text variables for dark mode', () => {
    const appearance = resolveKangurStorefrontAppearance('dark');

    expect(appearance.vars['--kangur-button-secondary-background']).toContain('rgba(51,65,85');
    expect(appearance.vars['--kangur-button-warning-text']).toBe('#fde68a');
    expect(appearance.vars['--kangur-chat-panel-text']).toBe('#f8fafc');
    expect(appearance.vars['--kangur-chat-muted-text']).toBe('#d7e1ee');
  });
});
