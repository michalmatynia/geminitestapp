/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const {
  cmsStorefrontAppearanceProviderMock,
  frontendPublicOwnerProviderMock,
  frontendPublicOwnerShellClientMock,
  getCmsThemeSettingsMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurStorefrontInitialStateMock,
  headersMock,
  queryErrorBoundaryMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  cmsStorefrontAppearanceProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  frontendPublicOwnerShellClientMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getCmsThemeSettingsMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  headersMock: vi.fn(),
  queryErrorBoundaryMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
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

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/cms/components/frontend/CmsStorefrontAppearance', () => ({
  CmsStorefrontAppearanceProvider: cmsStorefrontAppearanceProviderMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  FrontendPublicOwnerProvider: frontendPublicOwnerProviderMock,
}));

vi.mock('@/shared/ui/QueryErrorBoundary', () => ({
  QueryErrorBoundary: queryErrorBoundaryMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerShellClient', () => ({
  default: frontendPublicOwnerShellClientMock,
}));

describe('frontend layout bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getCmsThemeSettingsMock.mockResolvedValue({ darkMode: false });
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
    // Kangur storefront is speculatively fetched in parallel but its result is
    // discarded when publicOwner is 'cms'.
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'cms',
        kangurInitialMode: undefined,
        kangurInitialThemeSettings: undefined,
      }),
      undefined
    );
  });

  it('loads Kangur storefront bootstrap only when the frontend public owner is kangur', async () => {
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

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
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'kangur',
        kangurInitialMode: 'default',
        kangurInitialThemeSettings: {
          dark: null,
          dawn: null,
          default: null,
          sunset: null,
        },
      }),
      undefined
    );
  });

  it('skips front-page selection and cms theme reads for explicit Kangur alias routes', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        'next-url': '/en/kangur/library',
      })
    );

    const { default: FrontendLayout } = await import('@/app/(frontend)/layout');

    const layout = await FrontendLayout({
      children: <div>kangur-explicit</div>,
    });
    render(layout);

    expect(getFrontPageSettingMock).not.toHaveBeenCalled();
    expect(getFrontPagePublicOwnerMock).not.toHaveBeenCalled();
    // Both are speculatively fetched in parallel — their results are discarded
    // for explicit Kangur alias routes where publicOwner defaults to 'cms'.
    expect(getCmsThemeSettingsMock).toHaveBeenCalledTimes(1);
    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(frontendPublicOwnerShellClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicOwner: 'cms',
        kangurInitialMode: undefined,
        kangurInitialThemeSettings: undefined,
      }),
      undefined
    );
  });
});
