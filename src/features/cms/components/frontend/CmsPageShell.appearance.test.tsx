/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';

describe('CmsPageShell appearance', () => {
  it('applies page-wide appearance variables when dark mode is selected', async () => {
    render(
      <CmsStorefrontAppearanceProvider initialMode='dark'>
        <CmsPageShell
          menu={
            {
              showMenu: false,
              items: [],
            } as never
          }
          theme={
            {
              backgroundColor: '#ffffff',
              surfaceColor: '#f8fafc',
              textColor: '#111827',
              mutedTextColor: '#6b7280',
              borderColor: '#d1d5db',
              accentColor: '#2563eb',
              primaryColor: '#2563eb',
              inputBg: '#ffffff',
              inputText: '#111827',
              inputBorderColor: '#cbd5e1',
              btnPrimaryBg: '#2563eb',
              btnPrimaryText: '#ffffff',
              pagePadding: 0,
              pageMargin: 0,
              borderRadius: 0,
              enableAnimations: false,
            } as never
          }
          colorSchemes={{}}
        >
          <div>Page body</div>
        </CmsPageShell>
      </CmsStorefrontAppearanceProvider>
    );

    const body = screen.getByText('Page body');
    const shell = body.closest('[data-cms-appearance-scope="true"]');

    expect(shell).not.toBeNull();

    await waitFor(() => {
      expect(shell).toHaveAttribute('data-appearance-mode', 'dark');
      expect(shell?.style.getPropertyValue('--cms-appearance-bg')).toContain(
        'color-mix'
      );
    });

    expect(shell?.style.getPropertyValue('--cms-appearance-input-border')).toBe(
      'rgba(255,255,255,0.18)'
    );
  });
});
