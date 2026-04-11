/**
 * @vitest-environment node
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyleMock,
  shouldRenderVercelAnalyticsMock,
  KangurAliasAppLayoutMock,
} = vi.hoisted(() => ({
  getKangurStorefrontInitialStateMock: vi.fn(),
  getKangurSurfaceBootstrapStyleMock: vi.fn(),
  shouldRenderVercelAnalyticsMock: vi.fn(),
  KangurAliasAppLayoutMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyle: getKangurSurfaceBootstrapStyleMock,
  KANGUR_SURFACE_HINT_SCRIPT: 'window.__KANGUR_SURFACE_HINT__=1;',
  KangurAliasAppLayout: KangurAliasAppLayoutMock,
}));

vi.mock('@/features/kangur/public', () => ({
  KangurStorefrontAppearanceProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='kangur-storefront-appearance-provider'>{children}</div>
  ),
  KangurSurfaceClassSync: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='kangur-surface-class-sync'>{children}</div>
  ),
}));

vi.mock('@/shared/lib/analytics/vercel-analytics', () => ({
  shouldRenderVercelAnalytics: shouldRenderVercelAnalyticsMock,
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='vercel-analytics' />,
}));

import LocalizedKangurLayout from '@/app/[locale]/(frontend)/kangur/layout';
import LocalizedKangurAppLayout from '@/app/[locale]/(frontend)/kangur/(app)/layout';

describe('localized kangur layouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'light',
      initialThemeSettings: {
        default: '{"theme":"day"}',
        dawn: null,
        sunset: null,
        dark: null,
      },
    });
    getKangurSurfaceBootstrapStyleMock.mockReturnValue(':root{color-scheme:light;}');
    shouldRenderVercelAnalyticsMock.mockReturnValue(false);
    KangurAliasAppLayoutMock.mockResolvedValue(<div data-testid='kangur-alias-app-layout' />);
  });

  it('renders the localized storefront layout through feature helpers', async () => {
    const result = await LocalizedKangurLayout({
      children: <div data-testid='localized-kangur-child' />,
    });

    expect(React.isValidElement(result)).toBe(true);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurSurfaceBootstrapStyleMock).toHaveBeenCalledWith({
      mode: 'light',
      themeSettings: {
        default: '{"theme":"day"}',
        dawn: null,
        sunset: null,
        dark: null,
      },
    });
    expect(shouldRenderVercelAnalyticsMock).toHaveBeenCalledTimes(1);
  });

  it('renders the localized app layout through the alias shell helper', async () => {
    const child = <div data-testid='localized-kangur-app-child' />;

    const result = await LocalizedKangurAppLayout({ children: child });

    expect(React.isValidElement(result)).toBe(true);
    expect(KangurAliasAppLayoutMock).toHaveBeenCalledWith({ children: child });
  });
});
