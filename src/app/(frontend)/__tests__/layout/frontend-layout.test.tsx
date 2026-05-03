/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';

const {
  cmsStorefrontAppearanceProviderMock,
  frontendPublicOwnerProviderMock,
  frontendPublicOwnerShellClientMock,
  getCmsThemeSettingsMock,
  getKangurAuthBootstrapScriptMock,
  getKangurStorefrontInitialStateMock,
  getLiteSettingsCacheMock,
  headersMock,
  kangurServerShellMock,
  kangurSSRSkeletonMock,
  queryErrorBoundaryMock,
  readServerRequestHeadersMock,
  readServerRequestPathnameMock,
  resolveFrontPageSelectionMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  cmsStorefrontAppearanceProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerShellClientMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getCmsThemeSettingsMock: vi.fn(),
  getKangurAuthBootstrapScriptMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  getLiteSettingsCacheMock: vi.fn(),
  headersMock: vi.fn(),
  kangurServerShellMock: vi.fn(() => <div data-testid='kangur-server-shell' />),
  kangurSSRSkeletonMock: vi.fn(() => <div data-testid='kangur-ssr-skeleton' />),
  queryErrorBoundaryMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  readServerRequestHeadersMock: vi.fn(),
  readServerRequestPathnameMock: vi.fn(),
  resolveFrontPageSelectionMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: resolveFrontPageSelectionMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsThemeSettings: getCmsThemeSettingsMock,
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurAuthBootstrapScript: getKangurAuthBootstrapScriptMock,
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyle: vi.fn(
    () => ':root{--kangur-soft-card-border:rgba(15,23,42,0.18);}'
  ),
  KANGUR_SURFACE_HINT_SCRIPT: 'document.documentElement.classList.add(\'kangur-surface-active\')',
}));

vi.mock('@/shared/lib/request/server-request-context', () => ({
  readServerRequestHeaders: readServerRequestHeadersMock,
  readServerRequestPathname: readServerRequestPathnameMock,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  getLiteSettingsCache: getLiteSettingsCacheMock,
}));

vi.mock('@/shared/ui/cms-appearance/CmsStorefrontAppearance', () => ({
  CmsStorefrontAppearanceProvider: cmsStorefrontAppearanceProviderMock,
}));

vi.mock('@/shared/ui/QueryErrorBoundary', () => ({
  QueryErrorBoundary: queryErrorBoundaryMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  FrontendPublicOwnerProvider: frontendPublicOwnerProviderMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerShellClient', () => ({
  default: frontendPublicOwnerShellClientMock,
}));

vi.mock('@/features/kangur/ui/KangurSSRSkeleton', () => ({
  KangurSSRSkeleton: kangurSSRSkeletonMock,
}));

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: kangurServerShellMock,
}));

vi.mock('@/features/kangur/public', () => ({
  FrontendPublicOwnerProvider: frontendPublicOwnerProviderMock,
  FrontendPublicOwnerShellClient: frontendPublicOwnerShellClientMock,
  KangurSSRSkeleton: kangurSSRSkeletonMock,
  KangurServerShell: kangurServerShellMock,
}));

describe('frontend layout bootstrap', () => {
  const resolveSuspenseRuntime = async (element: React.ReactElement) => {
    expect(React.isValidElement(element)).toBe(true);
    const child = element.props.children as React.ReactElement;
    expect(React.isValidElement(child)).toBe(true);
    return child.type(child.props);
  };

  const renderResolvedFrontendLayout = async (children: React.ReactNode) => {
    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');
    const layout = await FrontendLayout({ children });
    const resolvedLayout = await resolveSuspenseRuntime(layout);
    render(resolvedLayout as React.ReactElement);
    return { layout, resolvedLayout };
  };

  const renderFrontendLayoutFallback = async (children: React.ReactNode) => {
    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');
    const layout = await FrontendLayout({ children });
    render(layout.props.fallback as React.ReactElement);
    return layout;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    readServerRequestHeadersMock.mockReturnValue(null);
    readServerRequestPathnameMock.mockReturnValue(null);
    getLiteSettingsCacheMock.mockReturnValue(null);
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getCmsThemeSettingsMock.mockResolvedValue({ darkMode: false });
    getKangurAuthBootstrapScriptMock.mockResolvedValue(null);
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'cms',
      publicOwner: 'cms',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'default',
      initialThemeSettings: {
        dark: null,
        dawn: null,
        default: null,
        sunset: null,
      },
    });
  });

  it(
    'skips Kangur storefront bootstrap when the frontend public owner is cms',
    async () => {
    await renderResolvedFrontendLayout(<div>cms</div>);

    expect(resolveFrontPageSelectionMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'cms'
    );
    expect(frontendPublicOwnerProviderMock.mock.calls[0]?.[0]).toMatchObject({
      publicOwner: 'cms',
      routeFamily: 'cms',
    });
    expect(cmsStorefrontAppearanceProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialMode: 'default' }),
      undefined
    );
    expect(frontendPublicOwnerShellClientMock).not.toHaveBeenCalled();
    },
    60_000
  );

  it('does not render route children inside the shared suspense fallback shell', async () => {
    await renderFrontendLayoutFallback(<div>blocked route child</div>);

    expect(screen.queryByText('blocked route child')).not.toBeInTheDocument();
    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'pending'
    );
    expect(document.querySelector('#kangur-main-content')).toHaveAttribute('aria-busy', 'true');
    expect(frontendPublicOwnerProviderMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerShellClientMock).not.toHaveBeenCalled();
  });

  it('renders the StudiQ loading shell in the shared fallback for explicit Kangur routes', async () => {
    readServerRequestPathnameMock.mockReturnValue('/en/kangur/library');

    await renderFrontendLayoutFallback(<div>blocked route child</div>);

    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'studiq'
    );
    expect(
      document.querySelector('#__KANGUR_SURFACE_BOOTSTRAP_FALLBACK__')?.textContent
    ).toContain('--kangur-soft-card-border:');
  });

  it('reuses the cached front-page app selection to render the StudiQ root fallback shell', async () => {
    readServerRequestPathnameMock.mockReturnValue('/');
    getLiteSettingsCacheMock.mockReturnValue({
      data: [{ key: 'front_page_app', value: 'kangur' }],
      ts: Date.now(),
    });

    await renderFrontendLayoutFallback(<div>blocked route child</div>);

    expect(screen.getByTestId('kangur-ssr-skeleton')).toBeInTheDocument();
    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'studiq'
    );
  });

  it(
    'loads Kangur storefront bootstrap only when the frontend public owner is kangur',
    async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'lite',
      fallbackReason: null,
    });
    getKangurAuthBootstrapScriptMock.mockResolvedValue(
      'window.__KANGUR_AUTH_BOOTSTRAP__=null;'
    );

    await renderResolvedFrontendLayout(<div>kangur</div>);

    expect(resolveFrontPageSelectionMock).toHaveBeenCalled();
    // CMS theme is speculatively fetched in parallel but its result is
    // discarded when publicOwner is 'kangur'.
    expect(getCmsThemeSettingsMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).toContain('window.__KANGUR_AUTH_BOOTSTRAP__=null;');
    expect(
      document.querySelector('#__KANGUR_SURFACE_BOOTSTRAP__')?.textContent
    ).toContain('--kangur-soft-card-border:');
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: 'default',
          themeSettings: {
            dark: null,
            dawn: null,
            default: null,
            sunset: null,
          },
        },
        renderStandaloneKangurShell: true,
      }),
      undefined
    );
    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
    },
    60_000
  );

  it('skips Kangur bootstrap work on the root route when Kangur home will redirect immediately', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'runtime',
      fallbackReason: null,
    });

    await renderResolvedFrontendLayout(<div>root-redirect</div>);

    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
    expect(kangurSSRSkeletonMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerShellClientMock).not.toHaveBeenCalled();
  });

  it('loads Kangur storefront bootstrap on standalone Kangur routes like lessons', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });

    await renderResolvedFrontendLayout(<div>kangur-lessons</div>);

    expect(resolveFrontPageSelectionMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('#__KANGUR_SURFACE_BOOTSTRAP__')?.textContent
    ).toContain('--kangur-soft-card-border:');
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: 'default',
          themeSettings: {
            dark: null,
            dawn: null,
            default: null,
            sunset: null,
          },
        },
        renderStandaloneKangurShell: true,
      }),
      undefined
    );
    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
  });

  it('passes Mongo-backed Kangur theme slot settings into standalone shell initialAppearance', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'sunset',
      initialThemeSettings: {
        dark: '{"backgroundColor":"#020617"}',
        dawn: '{"backgroundColor":"#f59e0b"}',
        default: '{"backgroundColor":"#123456"}',
        sunset: '{"backgroundColor":"#ef4444"}',
      },
    });

    await renderResolvedFrontendLayout(<div>kangur-themed-lessons</div>);

    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: 'sunset',
          themeSettings: {
            dark: '{"backgroundColor":"#020617"}',
            dawn: '{"backgroundColor":"#f59e0b"}',
            default: '{"backgroundColor":"#123456"}',
            sunset: '{"backgroundColor":"#ef4444"}',
          },
        },
        renderStandaloneKangurShell: true,
      }),
      undefined
    );
  });

  it('renders a frontend timing payload only for debug timing requests', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'next-url': '/en',
        'x-debug-frontend-timing': '1',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    getKangurAuthBootstrapScriptMock.mockResolvedValue(
      'window.__KANGUR_AUTH_BOOTSTRAP__=null;'
    );

    await renderResolvedFrontendLayout(<div>kangur-home</div>);

    const timingScript = document.querySelector('#__FRONTEND_LAYOUT_TIMING__');
    expect(timingScript).not.toBeNull();
    expect(timingScript?.textContent).toContain('"source":"frontend-layout"');
    expect(timingScript?.textContent).toContain('"publicOwner":"kangur"');
    expect(timingScript?.textContent).toContain('"routeFamily":"studiq"');
    expect(timingScript?.textContent).toContain('"frontPageSelection"');
    expect(timingScript?.textContent).toContain('"frontPageSelectionSource":"mongo"');
    expect(timingScript?.textContent).toContain('"expectsRootRedirectToKangur":true');
    expect(timingScript?.textContent).not.toContain('"kangurStorefrontInitialState"');
    expect(timingScript?.textContent).not.toContain('"kangurAuthBootstrapScript"');
  });

  it('classifies product routes separately from StudiQ in the frontend layout shell metadata', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/products/sku-123',
      })
    );

    await renderResolvedFrontendLayout(<div>product</div>);

    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'products'
    );
    expect(frontendPublicOwnerProviderMock.mock.calls[0]?.[0]).toMatchObject({
      publicOwner: 'cms',
      routeFamily: 'products',
    });
  });

  it('skips front-page selection while still loading Kangur appearance bootstrap for explicit alias routes', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/kangur/library',
      })
    );

    await renderResolvedFrontendLayout(<div>kangur-explicit</div>);

    expect(document.querySelector('#kangur-main-content')).toHaveAttribute(
      'data-frontend-public-route-family',
      'studiq'
    );
    expect(resolveFrontPageSelectionMock).not.toHaveBeenCalled();
    expect(getCmsThemeSettingsMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
    expect(
      document.querySelector('#__KANGUR_SURFACE_BOOTSTRAP__')?.textContent
    ).toContain('--kangur-soft-card-border:');
    expect(document.body.innerHTML).toContain(
      'document.documentElement.classList.add(\'kangur-surface-active\')'
    );
    expect(frontendPublicOwnerProviderMock.mock.calls[0]?.[0]).toMatchObject({
      publicOwner: 'cms',
      routeFamily: 'studiq',
    });
    expect(cmsStorefrontAppearanceProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialMode: 'default' }),
      undefined
    );
    expect(frontendPublicOwnerShellClientMock).not.toHaveBeenCalled();
  });

  it('prefers the custom server pathname header over missing next-url metadata', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'lite',
      fallbackReason: 'transient-mongo-error',
    });

    await renderResolvedFrontendLayout(<div>kangur-lessons</div>);

    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: 'default',
          themeSettings: {
            dark: null,
            dawn: null,
            default: null,
            sunset: null,
          },
        },
        renderStandaloneKangurShell: true,
      }),
      undefined
    );
    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
  });

  it('prefers the custom server request context over next headers', async () => {
    readServerRequestHeadersMock.mockReturnValue(
      new Headers({
        'x-app-request-pathname': '/en/kangur/library',
      })
    );
    readServerRequestPathnameMock.mockReturnValue('/en/kangur/library');

    await renderResolvedFrontendLayout(<div>kangur-explicit</div>);

    expect(headersMock).not.toHaveBeenCalled();
    expect(resolveFrontPageSelectionMock).not.toHaveBeenCalled();
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
  });

  it('keeps resolving the saved front-page owner when request header resolution stalls', async () => {
    vi.useFakeTimers();
    headersMock.mockImplementation(() => new Promise<Headers>(() => {}));
    const originalDebugFrontendTiming = process.env['DEBUG_FRONTEND_TIMING'];
    process.env['DEBUG_FRONTEND_TIMING'] = 'true';
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'lite',
      fallbackReason: 'transient-mongo-error',
    });

    try {
      const { default: FrontendLayout } = await import('@/app/(frontend)/layout');
      const layoutPromise = FrontendLayout({
        children: <div>kangur-explicit</div>,
      });

      const layout = await layoutPromise;
      const resolvedLayoutPromise = resolveSuspenseRuntime(layout);
      await vi.advanceTimersByTimeAsync(1200);
      const resolvedLayout = await resolvedLayoutPromise;
      render(resolvedLayout as React.ReactElement);

      expect(resolveFrontPageSelectionMock).toHaveBeenCalledTimes(1);
      expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
      expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
      expect(frontendPublicOwnerShellClientMock).not.toHaveBeenCalled();
      const timingScript = document.querySelector('#__FRONTEND_LAYOUT_TIMING__');
      expect(timingScript?.textContent).toContain('"requestHeadersTimedOut":true');
      expect(timingScript?.textContent).toContain('"frontPageSelectionSource":"lite"');
      expect(timingScript?.textContent).toContain(
        '"frontPageSelectionFallbackReason":"transient-mongo-error"'
      );
      expect(timingScript?.textContent).toContain('"expectsRootRedirectToKangur":true');
    } finally {
      if (originalDebugFrontendTiming === undefined) {
        delete process.env['DEBUG_FRONTEND_TIMING'];
      } else {
        process.env['DEBUG_FRONTEND_TIMING'] = originalDebugFrontendTiming;
      }
      vi.useRealTimers();
    }
  });
});
