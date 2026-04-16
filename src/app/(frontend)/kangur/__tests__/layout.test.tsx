/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { kangurStorefrontAppearanceProviderMock } = vi.hoisted(() => ({
  kangurStorefrontAppearanceProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-storefront-appearance-provider'>{children}</div>
  )),
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='kangur-vercel-analytics' />,
}));

vi.mock('@/features/kangur/public', () => ({
  KangurStorefrontAppearanceProvider: kangurStorefrontAppearanceProviderMock,
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-class-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/server', () => ({
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
  getKangurSurfaceBootstrapStyle: vi.fn(
    () => ':root{--kangur-soft-card-border:rgba(51,65,85,0.4);}'
  ),
  KANGUR_SURFACE_HINT_SCRIPT:
    'document.documentElement.classList.add(\'kangur-surface-active\')',
}));

vi.mock('@/shared/lib/security/safe-html', () => ({
  safeHtml: (value: string) => value,
}));

describe('kangur layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not mount vercel analytics by default for the shared kangur route boundary', async () => {
    const { resolveKangurLayoutView } = await import('@/app/(frontend)/kangur/layout');

    render(
      <>
        {await resolveKangurLayoutView({
          children: <div data-testid='kangur-layout-child' />,
        })}
      </>
    );

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
    expect(kangurStorefrontAppearanceProviderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialAppearance: {
          mode: 'dark',
          themeSettings: {
            default: null,
            dawn: null,
            sunset: null,
            dark: JSON.stringify({
              cardBg: '#0f172a',
              containerBorderColor: '#334155',
            }),
          },
        },
      }),
      undefined
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

    render(
      <KangurLayout>
        <div data-testid='kangur-layout-child' />
      </KangurLayout>
    );

    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
  });
});
