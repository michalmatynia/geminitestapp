/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurConfiguredLaunchTargetMock,
  getKangurStorefrontInitialStateMock,
  notFoundMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurConfiguredLaunchTargetMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/kangur/server/launch-route', () => ({
  getKangurConfiguredLaunchTarget: getKangurConfiguredLaunchTargetMock,
}));

vi.mock('@/features/kangur/server/storefront-appearance', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
}));

vi.mock('@/features/kangur/public', () => ({
  KangurPublicApp: () => null,
}));

vi.mock('@/app/(frontend)/cms-render', () => ({
  renderCmsPage: vi.fn(),
}));

vi.mock('@/app/(frontend)/[...slug]/slug-page-data', () => ({
  buildSlugMetadata: vi.fn(),
  loadSlugRenderData: vi.fn(),
  resolveSlugToPage: vi.fn(),
}));

describe('frontend slug launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue(null);
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'default',
      initialThemeSettings: {},
    });
  });

  it('redirects supported public Kangur slug routes to the dedicated app', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://lessons?focus=division',
      fallbackHref: '/lessons?focus=division',
    });

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');

    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:kangur://lessons?focus=division');
    expect(redirectMock).toHaveBeenCalledWith('kangur://lessons?focus=division');
  });

  it('redirects supported public Kangur slug routes to the /kangur alias on the web path', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'web_mobile_view',
      href: '/lessons?focus=division',
      fallbackHref: '/lessons?focus=division',
    });

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');

    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:/kangur/lessons?focus=division');
    expect(redirectMock).toHaveBeenCalledWith('/kangur/lessons?focus=division');
  });

  it('keeps unsupported slug routes on the shared Kangur shell path without redirecting', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: '/login',
      fallbackHref: '/login',
    });

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');
    const page = await CmsSlugPage({
      params: Promise.resolve({ slug: ['login'] }),
      searchParams: Promise.resolve({ callbackUrl: '/lessons' }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(page).toBeNull();
  });

  it('does not redirect the games slug for non-super-admin sessions', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://games',
      fallbackHref: '/games',
    });
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');
    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['games'] }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('notFound');

    expect(getKangurConfiguredLaunchTargetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('still redirects the games slug for exact super-admin sessions', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://games',
      fallbackHref: '/games',
    });
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'owner@example.com',
        role: 'super_admin',
      },
    });

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');

    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['games'] }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('redirect:kangur://games');
    expect(redirectMock).toHaveBeenCalledWith('kangur://games');
  });

  it('does not redirect localized games slugs for non-super-admin sessions', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://games',
      fallbackHref: '/games',
    });
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    const { default: LocalizedCmsSlugPage } = await import('@/app/[locale]/(frontend)/[...slug]/page');
    await expect(
      LocalizedCmsSlugPage({
        params: Promise.resolve({ locale: 'pl', slug: ['games'] }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('notFound');

    expect(getKangurConfiguredLaunchTargetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('does not add locale prefixes to dedicated app redirects on localized slug routes', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'dedicated_app',
      href: 'kangur://duels?join=invite-1',
      fallbackHref: '/duels?join=invite-1',
    });

    const { default: LocalizedCmsSlugPage } = await import('@/app/[locale]/(frontend)/[...slug]/page');

    await expect(
      LocalizedCmsSlugPage({
        params: Promise.resolve({ locale: 'pl', slug: ['duels'] }),
        searchParams: Promise.resolve({ join: 'invite-1' }),
      })
    ).rejects.toThrow('redirect:kangur://duels?join=invite-1');
    expect(redirectMock).toHaveBeenCalledWith('kangur://duels?join=invite-1');
  });

  it('redirects localized Kangur slug routes to the localized /kangur alias on the web path', async () => {
    getKangurConfiguredLaunchTargetMock.mockResolvedValue({
      route: 'web_mobile_view',
      href: '/duels?join=invite-1',
      fallbackHref: '/duels?join=invite-1',
    });

    const { default: LocalizedCmsSlugPage } = await import('@/app/[locale]/(frontend)/[...slug]/page');

    await expect(
      LocalizedCmsSlugPage({
        params: Promise.resolve({ locale: 'en', slug: ['duels'] }),
        searchParams: Promise.resolve({ join: 'invite-1' }),
      })
    ).rejects.toThrow('redirect:/en/kangur/duels?join=invite-1');
    expect(redirectMock).toHaveBeenCalledWith('/en/kangur/duels?join=invite-1');
  });
});
