import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  flushMock,
  frontPageAllowed,
  getFrontPagePublicOwnerMock,
  getFrontPageRedirectPathMock,
  getCmsRepositoryMock,
  getSlugsForDomainMock,
  getFrontPageSettingMock,
  headersMock,
  homeContentMock,
  redirectMock,
  resolveCmsDomainFromHeadersMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  flushMock: vi.fn(),
  frontPageAllowed: new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageRedirectPathMock: vi.fn(),
  getCmsRepositoryMock: vi.fn(),
  getSlugsForDomainMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  headersMock: vi.fn(),
  homeContentMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  getSlugsForDomain: getSlugsForDomainMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/app/(frontend)/HomeContent', () => ({
  HomeContent: homeContentMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  FRONT_PAGE_ALLOWED: frontPageAllowed,
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
  getFrontPageRedirectPath: getFrontPageRedirectPathMock,
}));

vi.mock('@/app/(frontend)/home-timing', () => ({
  createHomeTimingRecorder: () => ({
    withTiming: async (_label: string, fn: () => Promise<unknown>) => fn(),
    flush: flushMock,
  }),
}));

vi.mock('@/app/(frontend)/home-helpers', () => {
  return {
    FRONT_PAGE_ALLOWED: frontPageAllowed,
    getFrontPageSetting: getFrontPageSettingMock,
    shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
  };
});

describe('front page app selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    getCmsRepositoryMock.mockResolvedValue({});
    getSlugsForDomainMock.mockResolvedValue([]);
    getFrontPageSettingMock.mockResolvedValue('kangur');
    headersMock.mockResolvedValue(new Headers());
    flushMock.mockResolvedValue(undefined);
    homeContentMock.mockReturnValue(null);
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

  it('lets the frontend layout own the Kangur shell when Front Manage assigns Kangur as the public owner', async () => {
    const { Home } = await loadHomeModule();

    getFrontPageSettingMock.mockResolvedValue('kangur');

    const result = await Home();

    expect(result).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
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
    expect(headersMock).toHaveBeenCalled();
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalled();
    expect(getSlugsForDomainMock).toHaveBeenCalledWith('default-domain', {});
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
    expect(headersMock).toHaveBeenCalled();
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalled();
    expect(getSlugsForDomainMock).toHaveBeenCalledWith('default-domain', {});
    expect(flushMock).toHaveBeenCalledTimes(1);
  });
});
