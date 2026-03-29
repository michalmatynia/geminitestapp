/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='kangur-vercel-analytics' />,
}));

vi.mock('@/features/kangur/ui/KangurStorefrontAppearanceProvider', () => ({
  KangurStorefrontAppearanceProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-storefront-appearance-provider'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-class-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/appearance/server/storefront-appearance', () => ({
  getKangurStorefrontInitialState: vi.fn(async () => ({
    initialMode: 'dark',
    initialThemeSettings: {
      default: null,
      dawn: null,
      sunset: null,
      dark: JSON.stringify({
        cardBg: '#0f172a',
        containerBorderColor: '#334155',
      }),
    },
  })),
}));

vi.mock('@/shared/lib/security/safe-html', () => ({
  safeHtml: (value: string) => value,
}));

describe('kangur layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not mount vercel analytics by default for the shared kangur route boundary', async () => {
    const { default: KangurLayout } = await import('@/app/(frontend)/kangur/layout');

    const view = await KangurLayout({
      children: <div data-testid='kangur-layout-child' />,
    });

    render(<>{view}</>);

    expect(screen.getByTestId('kangur-storefront-appearance-provider')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-surface-class-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-layout-child')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-vercel-analytics')).not.toBeInTheDocument();
    expect(
      document.querySelector('#__KANGUR_SURFACE_BOOTSTRAP__')?.textContent
    ).toContain('--kangur-soft-card-border:');
    expect(document.querySelector('script')?.textContent).toContain(
      'document.documentElement.classList.add(\'kangur-surface-active\')'
    );
  });

  it('reuses the same analytics-backed shared layout for localized kangur routes', async () => {
    vi.resetModules();
    vi.doMock('@/app/(frontend)/kangur/layout', () => ({
      default: ({ children }: { children: ReactNode }) => (
        <div data-testid='localized-shared-kangur-layout'>
          <div data-testid='kangur-vercel-analytics' />
          {children}
        </div>
      ),
    }));

    const { default: LocalizedKangurLayout } = await import('@/app/[locale]/(frontend)/kangur/layout');

    render(
      <LocalizedKangurLayout>
        <div data-testid='localized-kangur-layout-child' />
      </LocalizedKangurLayout>
    );

    expect(screen.getByTestId('localized-shared-kangur-layout')).toBeInTheDocument();
    expect(screen.getByTestId('localized-kangur-layout-child')).toBeInTheDocument();
    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
  });

  it('mounts vercel analytics when explicitly enabled for the shared kangur route boundary', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS', 'true');

    const { default: KangurLayout } = await import('@/app/(frontend)/kangur/layout');

    const view = await KangurLayout({
      children: <div data-testid='kangur-layout-child' />,
    });

    render(<>{view}</>);

    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
  });
});
