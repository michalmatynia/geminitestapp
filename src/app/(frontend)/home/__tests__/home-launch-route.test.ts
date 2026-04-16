import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCmsRepositoryMock,
  getKangurConfiguredLaunchRouteMock,
  resolveFrontPageSelectionMock,
  getSlugsForDomainMock,
  redirectMock,
  permanentRedirectMock,
  resolveCmsDomainFromHeadersMock,
} = vi.hoisted(() => ({
  getCmsRepositoryMock: vi.fn(),
  getKangurConfiguredLaunchRouteMock: vi.fn(),
  resolveFrontPageSelectionMock: vi.fn(),
  getSlugsForDomainMock: vi.fn(),
  redirectMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  getSlugsForDomain: getSlugsForDomainMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: resolveFrontPageSelectionMock,
}));

vi.mock('@/features/kangur/public', () => ({
  getKangurPublicLaunchHref: (route?: string) =>
    route === 'dedicated_app' ? '/kangur?__kangurLaunch=dedicated_app' : '/kangur',
}));

vi.mock('@/features/kangur/server/launch-route', () => {
  return {
    getKangurConfiguredLaunchRoute: getKangurConfiguredLaunchRouteMock,
  };
});

describe('frontend home launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
  });

  it('redirects the root home route into the web shell with a dedicated-app launch hint', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');

    const { default: Home } = await import('@/app/(frontend)/page');

    await expect(Home()).rejects.toThrow('redirect:/kangur?__kangurLaunch=dedicated_app');
    expect(redirectMock).toHaveBeenCalledWith('/kangur?__kangurLaunch=dedicated_app');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('redirects the web mount to the /kangur alias route when Kangur owns home', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('web_mobile_view');

    const { default: Home } = await import('@/app/(frontend)/page');
    await expect(Home()).rejects.toThrow('redirect:/kangur');
    expect(redirectMock).toHaveBeenCalledWith('/kangur');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('omits the default locale prefix on dedicated-app web handoff routes', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');

    const { default: LocalizedHome } = await import('@/app/[locale]/(frontend)/page');

    await expect(
      LocalizedHome({
        params: Promise.resolve({ locale: 'pl' }),
      })
    ).rejects.toThrow('redirect:/kangur?__kangurLaunch=dedicated_app');
    expect(redirectMock).toHaveBeenCalledWith('/kangur?__kangurLaunch=dedicated_app');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('redirects localized home routes to the localized /kangur alias when Kangur owns home', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('web_mobile_view');

    const { default: LocalizedHome } = await import('@/app/[locale]/(frontend)/page');
    await expect(
      LocalizedHome({
        params: Promise.resolve({ locale: 'en' }),
      })
    ).rejects.toThrow('redirect:/en/kangur');
    expect(redirectMock).toHaveBeenCalledWith('/en/kangur');
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });
});
