import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCmsRepositoryMock,
  getFrontPagePublicOwnerMock,
  getFrontPageRedirectPathMock,
  getFrontPageSettingMock,
  getKangurConfiguredLaunchTargetMock,
  getSlugsForDomainMock,
  redirectMock,
  resolveCmsDomainFromHeadersMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  getCmsRepositoryMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageRedirectPathMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurConfiguredLaunchTargetMock: vi.fn(),
  getSlugsForDomainMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  getSlugsForDomain: getSlugsForDomainMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
  getFrontPageRedirectPath: getFrontPageRedirectPathMock,
}));

vi.mock('@/features/kangur/server/launch-route', () => ({
  getKangurConfiguredLaunchTarget: getKangurConfiguredLaunchTargetMock,
}));

describe('frontend home launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    getFrontPageRedirectPathMock.mockReturnValue(null);
  });

  it('redirects the root home route to the dedicated Kangur app when configured', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://',
      fallbackHref: '/',
    });

    const { default: Home } = await import('@/app/(frontend)/page');

    await expect(Home()).rejects.toThrow('redirect:kangur://');
    expect(redirectMock).toHaveBeenCalledWith('kangur://');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('keeps the root home route on the web mount when the mobile web route is configured', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'web_mobile_view',
      href: '/',
      fallbackHref: '/',
    });

    const { default: Home } = await import('@/app/(frontend)/page');

    await expect(Home()).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('does not localize dedicated app redirects on localized home routes', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://',
      fallbackHref: '/',
    });

    const { default: LocalizedHome } = await import('@/app/[locale]/(frontend)/page');

    await expect(
      LocalizedHome({
        params: Promise.resolve({ locale: 'pl' }),
      })
    ).rejects.toThrow('redirect:kangur://');
    expect(redirectMock).toHaveBeenCalledWith('kangur://');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });
});
