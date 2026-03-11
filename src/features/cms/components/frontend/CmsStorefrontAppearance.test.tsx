/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  CMS_STOREFRONT_APPEARANCE_STORAGE_KEY,
  CmsStorefrontAppearanceButtons,
  CmsStorefrontAppearanceProvider,
  resolveCmsStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from './CmsStorefrontAppearance';

function AppearanceModeProbe(): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();

  return <div data-testid='appearance-mode' data-mode={appearance?.mode ?? 'missing'} />;
}

describe('CmsStorefrontAppearance', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('updates and persists the selected appearance mode', async () => {
    render(
      <CmsStorefrontAppearanceProvider>
        <CmsStorefrontAppearanceButtons />
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'default');

    fireEvent.click(screen.getByRole('button', { name: 'Slightly darker background' }));

    expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'darker');
    expect(screen.getByRole('button', { name: 'Slightly darker background' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(CMS_STOREFRONT_APPEARANCE_STORAGE_KEY)).toBe('darker');
    });
  });

  it('hydrates the last selected appearance mode from local storage', async () => {
    window.localStorage.setItem(CMS_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');

    render(
      <CmsStorefrontAppearanceProvider>
        <CmsStorefrontAppearanceButtons />
        <AppearanceModeProbe />
      </CmsStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('appearance-mode')).toHaveAttribute('data-mode', 'dark');
    });

    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
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
    expect(appearance.vars['--cms-appearance-button-primary-text']).toBe('#f3f4f6');
    expect(appearance.vars['--cms-appearance-input-border']).toBe('rgba(255,255,255,0.18)');
  });
});
