import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  flushMock,
  frontPageAllowed,
  getFrontPagePublicOwnerMock,
  getFrontPageRedirectPathMock,
  getKangurConfiguredLaunchRouteMock,
  getCmsRepositoryMock,
  isDomainZoningEnabledMock,
  getSlugsForDomainMock,
  getFrontPageSettingMock,
  headersMock,
  homeContentMock,
  kangurSsrSkeletonMock,
  redirectMock,
  resolveCmsDomainFromHeadersMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  flushMock: vi.fn(),
  frontPageAllowed: new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageRedirectPathMock: vi.fn(),
  getKangurConfiguredLaunchRouteMock: vi.fn(),
  getCmsRepositoryMock: vi.fn(),
  isDomainZoningEnabledMock: vi.fn(),
  getSlugsForDomainMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  headersMock: vi.fn(),
  homeContentMock: vi.fn(),
  kangurSsrSkeletonMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  permanentRedirect: redirectMock,
}));

vi.mock('@/shared/lib/request/optional-headers', () => ({
  readOptionalRequestHeaders: headersMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  isDomainZoningEnabled: isDomainZoningEnabledMock,
  getSlugsForDomain: getSlugsForDomainMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/app/(frontend)/home/HomeContent', () => ({
  HomeContent: homeContentMock,
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurConfiguredLaunchRoute: getKangurConfiguredLaunchRouteMock,
}));

vi.mock('@/features/kangur/public', () => ({
  getKangurPublicLaunchHref: (
    route: string | undefined,
    slugSegments: readonly string[] = [],
    searchParams?: Record<string, string | string[] | undefined>
  ) => {
    const pathname = slugSegments.length > 0 ? `/kangur/${slugSegments.join('/')}` : '/kangur';
    const query = new URLSearchParams();

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          query.append(key, entry);
        });
        return;
      }
      if (value != null) {
        query.set(key, value);
      }
    });

    if (route === 'dedicated_app' && slugSegments.length === 0) {
      query.set('__kangurLaunch', 'dedicated_app');
    }

    const serialized = query.toString();
    return serialized ? `${pathname}?${serialized}` : pathname;
  },
}));

vi.mock('@/features/kangur/ui/KangurSSRSkeleton', () => ({
  KangurSSRSkeleton: kangurSsrSkeletonMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  FRONT_PAGE_ALLOWED: frontPageAllowed,
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
  getFrontPageRedirectPath: getFrontPageRedirectPathMock,
}));

vi.mock('@/app/(frontend)/home/home-timing', () => ({
  createHomeTimingRecorder: () => ({
    withTiming: async (_label: string, fn: () => Promise<unknown>) => fn(),
    flush: flushMock,
  }),
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => {
  return {
    FRONT_PAGE_ALLOWED: frontPageAllowed,
    getFrontPageSetting: getFrontPageSettingMock,
    shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
    resolveFrontPageSelection: async () => {
      const enabled = shouldApplyFrontPageAppSelectionMock();
      if (!enabled) {
        return {
          enabled: false,
          setting: null,
          publicOwner: 'cms',
          redirectPath: null,
          source: 'disabled',
          fallbackReason: null,
        };
      }
      const setting = await getFrontPageSettingMock();
      return {
        enabled: true,
        setting,
        publicOwner: getFrontPagePublicOwnerMock(setting),
        redirectPath: getFrontPageRedirectPathMock(setting),
        source: 'mongo',
        fallbackReason: null,
      };
    },
  };
});

describe('front page app selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    getCmsRepositoryMock.mockResolvedValue({});
    isDomainZoningEnabledMock.mockResolvedValue(false);
    getSlugsForDomainMock.mockResolvedValue([]);
    getFrontPageSettingMock.mockResolvedValue('kangur');
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('web_mobile_view');
    headersMock.mockResolvedValue(new Headers());
    flushMock.mockResolvedValue(undefined);
    homeContentMock.mockReturnValue('home-content');
    resolveCmsDomainFromHeadersMock.mockResolvedValue({ id: 'default-domain' });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPagePublicOwnerMock.mockImplementation((value: string | null | undefined) =>
      value === 'kangur' ? 'kangur' : 'cms'
    );
    getFrontPageRedirectPathMock.mockImplementation((value: string | null | undefined) => {
      if (value === 'chatbot') return '/admin/chatbot';
      if (value === 'notes') return '/admin/notes';
      return null;
    });
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  const loadHomeModule = async () => {
    const [{ default: Home }, { KANGUR_BASE_PATH }] = await Promise.all([
      import('@/app/(frontend)/page'),
      import('@/features/kangur/config/routing'),
    ]);

    return { Home, KANGUR_BASE_PATH };
  };

  it.each([
    ['chatbot', '/admin/chatbot'],
    ['notes', '/admin/notes'],
  ] as const)('redirects HOME to %s when configured', async (frontPageApp, expectedTarget) => {
    const { Home } = await loadHomeModule();

    getFrontPageSettingMock.mockResolvedValue(frontPageApp);

    await expect(Home()).rejects.toThrow(`redirect:${expectedTarget}`);

    expect(redirectMock).toHaveBeenCalledWith(expectedTarget);
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
    expect(headersMock).not.toHaveBeenCalled();
    expect(homeContentMock).not.toHaveBeenCalled();
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('redirects HOME to the Kangur public alias when Front Manage assigns Kangur as the public owner', async () => {
    const { Home, KANGUR_BASE_PATH } = await loadHomeModule();

    getFrontPageSettingMock.mockResolvedValue('kangur');

    await expect(Home()).rejects.toThrow(`redirect:${KANGUR_BASE_PATH}`);
    expect(redirectMock).toHaveBeenCalledWith(KANGUR_BASE_PATH);
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
    expect(headersMock).not.toHaveBeenCalled();
    expect(homeContentMock).not.toHaveBeenCalled();
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy products setting on the CMS home flow', async () => {
    const { Home } = await loadHomeModule();
    getFrontPageSettingMock.mockResolvedValue('products');

    const result = await Home();

    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCmsRepositoryMock).toHaveBeenCalled();
    expect(headersMock).not.toHaveBeenCalled();
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalledWith(null);
    expect(getSlugsForDomainMock).toHaveBeenCalledWith('default-domain', {}, undefined);
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('keeps HOME on the CMS flow when Front Manage routing is explicitly disabled', async () => {
    const { Home } = await loadHomeModule();
    getFrontPageSettingMock.mockResolvedValue('kangur');
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(false);

    const result = await Home();

    expect(result).toBeTruthy();
    expect(getFrontPageSettingMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCmsRepositoryMock).toHaveBeenCalled();
    expect(headersMock).not.toHaveBeenCalled();
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalledWith(null);
    expect(getSlugsForDomainMock).toHaveBeenCalledWith('default-domain', {}, undefined);
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('reads request headers only when domain zoning is enabled', async () => {
    const { Home } = await loadHomeModule();

    getFrontPageSettingMock.mockResolvedValue('products');
    isDomainZoningEnabledMock.mockResolvedValue(true);

    const result = await Home();

    expect(result).toBeTruthy();
    expect(headersMock).toHaveBeenCalledTimes(1);
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalledWith(expect.any(Headers));
  });
});
