/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const {
  cmsStorefrontAppearanceProviderMock,
  frontendPublicOwnerKangurShellMock,
  frontendPublicOwnerProviderMock,
  frontendPublicOwnerShellClientMock,
  getCmsThemeSettingsMock,
  getKangurAuthBootstrapScriptMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurStorefrontInitialStateMock,
  headersMock,
  kangurServerShellMock,
  kangurSSRSkeletonMock,
  queryErrorBoundaryMock,
  readServerRequestHeadersMock,
  readServerRequestPathnameMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  cmsStorefrontAppearanceProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerKangurShellMock: vi.fn(() => <div data-testid='frontend-kangur-shell' />),
  frontendPublicOwnerProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerShellClientMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getCmsThemeSettingsMock: vi.fn(),
  getKangurAuthBootstrapScriptMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  headersMock: vi.fn(),
  kangurServerShellMock: vi.fn(() => <div data-testid='kangur-server-shell' />),
  kangurSSRSkeletonMock: vi.fn(() => <div data-testid='kangur-ssr-skeleton' />),
  queryErrorBoundaryMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  readServerRequestHeadersMock: vi.fn(),
  readServerRequestPathnameMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsThemeSettings: getCmsThemeSettingsMock,
}));

vi.mock('@/features/kangur/server/storefront-appearance', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
}));

vi.mock('@/features/kangur/server/auth-bootstrap', () => ({
  getKangurAuthBootstrapScript: getKangurAuthBootstrapScriptMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/shared/lib/request/server-request-context', () => ({
  readServerRequestHeaders: readServerRequestHeadersMock,
  readServerRequestPathname: readServerRequestPathnameMock,
}));

vi.mock('@/features/cms/components/frontend/CmsStorefrontAppearance', () => ({
  CmsStorefrontAppearanceProvider: cmsStorefrontAppearanceProviderMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  FrontendPublicOwnerProvider: frontendPublicOwnerProviderMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerKangurShell', () => ({
  FrontendPublicOwnerKangurShell: frontendPublicOwnerKangurShellMock,
}));

vi.mock('@/shared/ui/QueryErrorBoundary', () => ({
  QueryErrorBoundary: queryErrorBoundaryMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerShellClient', () => ({
  __esModule: true,
  default: frontendPublicOwnerShellClientMock,
}));

vi.mock('@/features/kangur/ui/KangurSSRSkeleton', () => ({
  KangurSSRSkeleton: kangurSSRSkeletonMock,
}));

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: kangurServerShellMock,
}));

describe('frontend layout bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    readServerRequestHeadersMock.mockReturnValue(null);
    readServerRequestPathnameMock.mockReturnValue(null);
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getCmsThemeSettingsMock.mockResolvedValue({ darkMode: false });
    getKangurAuthBootstrapScriptMock.mockResolvedValue(null);
    getFrontPageSettingMock.mockResolvedValue('cms');
    getFrontPagePublicOwnerMock.mockReturnValue('cms');
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

  it('skips Kangur storefront bootstrap when the frontend public owner is cms', async () => {
    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>cms</div>,
    });
    render(layout);

    expect(getFrontPageSettingMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'cms',
        initialAppearance: undefined,
      }),
      undefined
    );
  });

  it('loads Kangur storefront bootstrap only when the frontend public owner is kangur', async () => {
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    getKangurAuthBootstrapScriptMock.mockResolvedValue(
      'window.__KANGUR_AUTH_BOOTSTRAP__=null;'
    );

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur</div>,
    });
    render(layout);

    expect(getFrontPageSettingMock).toHaveBeenCalledTimes(1);
    // CMS theme is speculatively fetched in parallel but its result is
    // discarded when publicOwner is 'kangur'.
    expect(getCmsThemeSettingsMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).toContain('window.__KANGUR_AUTH_BOOTSTRAP__=null;');
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
      }),
      undefined
    );
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
    expect(kangurSSRSkeletonMock).toHaveBeenCalledTimes(1);
  });

  it('skips Kangur storefront bootstrap on explicit Kangur app routes like lessons', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-lessons</div>,
    });
    render(layout);

    expect(getFrontPageSettingMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).toHaveBeenCalledTimes(1);
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: undefined,
          themeSettings: undefined,
        },
      }),
      undefined
    );
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
  });

  it('renders a frontend timing payload only for debug timing requests', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'next-url': '/en',
        'x-debug-frontend-timing': '1',
      })
    );
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    getKangurAuthBootstrapScriptMock.mockResolvedValue(
      'window.__KANGUR_AUTH_BOOTSTRAP__=null;'
    );

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-home</div>,
    });
    render(layout);

    const timingScript = document.querySelector('#__FRONTEND_LAYOUT_TIMING__');
    expect(timingScript).not.toBeNull();
    expect(timingScript?.textContent).toContain('"source":"frontend-layout"');
    expect(timingScript?.textContent).toContain('"publicOwner":"kangur"');
    expect(timingScript?.textContent).toContain('"frontPageSetting"');
    expect(timingScript?.textContent).toContain('"kangurStorefrontInitialState"');
    expect(timingScript?.textContent).toContain('"kangurAuthBootstrapScript"');
  });

  it('skips front-page selection and cms theme reads for explicit Kangur alias routes', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/kangur/library',
      })
    );

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-explicit</div>,
    });
    render(layout);

    expect(getFrontPageSettingMock).not.toHaveBeenCalled();
    expect(getFrontPagePublicOwnerMock).not.toHaveBeenCalled();
    expect(getCmsThemeSettingsMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'cms',
        initialAppearance: undefined,
      }),
      undefined
    );
  });

  it('prefers the custom server pathname header over missing next-url metadata', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'x-app-request-pathname': '/en/lessons',
      })
    );
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-lessons</div>,
    });
    render(layout);

    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        initialAppearance: {
          mode: undefined,
          themeSettings: undefined,
        },
      }),
      undefined
    );
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
  });

  it('prefers the custom server request context over next headers', async () => {
    readServerRequestHeadersMock.mockReturnValue(
      new Headers({
        'x-app-request-pathname': '/en/kangur/library',
      })
    );
    readServerRequestPathnameMock.mockReturnValue('/en/kangur/library');

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-explicit</div>,
    });
    render(layout);

    expect(headersMock).not.toHaveBeenCalled();
    expect(getFrontPageSettingMock).not.toHaveBeenCalled();
    expect(getFrontPagePublicOwnerMock).not.toHaveBeenCalled();
    expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
    expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
  });

  it('fails open when request header resolution stalls on explicit Kangur routes', async () => {
    vi.useFakeTimers();
    headersMock.mockImplementation(() => new Promise<Headers>(() => {}));
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

    try {
      const { default: FrontendLayout } = await import('@/app/(frontend)/layout');
      const layoutPromise = FrontendLayout({
        children: <div>kangur-explicit</div>,
      });

      await vi.advanceTimersByTimeAsync(1200);

      const layout = await layoutPromise;
      render(layout);

      expect(getFrontPageSettingMock).not.toHaveBeenCalled();
      expect(getFrontPagePublicOwnerMock).not.toHaveBeenCalled();
      expect(getKangurStorefrontInitialStateMock).not.toHaveBeenCalled();
      expect(getKangurAuthBootstrapScriptMock).not.toHaveBeenCalled();
      expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          publicOwner: 'cms',
          initialAppearance: undefined,
        }),
        undefined
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
