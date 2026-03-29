/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getKangurConfiguredLaunchRouteMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurStorefrontInitialStateMock,
  notFoundMock,
  permanentRedirectMock,
  redirectMock,
  requireAccessibleKangurSlugRouteMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getKangurConfiguredLaunchRouteMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  notFoundMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
  redirectMock: vi.fn(),
  requireAccessibleKangurSlugRouteMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();

  return {
    ...actual,
    redirect: redirectMock,
    permanentRedirect: permanentRedirectMock,
    notFound: notFoundMock,
  };
});

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  readOptionalServerAuthSession: authMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/kangur/server', () => {
  return {
    getKangurConfiguredLaunchRoute: getKangurConfiguredLaunchRouteMock,
    requireAccessibleKangurSlugRoute: requireAccessibleKangurSlugRouteMock,
  };
});

vi.mock('@/features/kangur/server/storefront-appearance', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
}));

vi.mock('@/features/kangur/config/routing', async () => {
  const actual = await vi.importActual('@/features/kangur/config/routing');

  return {
    ...actual,
    getKangurPublicLaunchHref: (
      route: string | undefined,
      slugSegments: readonly string[] = [],
      searchParams?: Record<string, string | string[] | undefined>
    ) => {
      const pathname = slugSegments.length > 0 ? `/kangur/${slugSegments.join('/')}` : '/kangur';
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(searchParams ?? {})) {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            query.append(key, entry);
          });
          continue;
        }
        if (value != null) {
          query.set(key, value);
        }
      }

      if (route === 'dedicated_app' && slugSegments[0] !== 'games' && slugSegments[0] !== 'parent-dashboard') {
        query.set('__kangurLaunch', 'dedicated_app');
      }

      const serialized = query.toString();
      return serialized ? `${pathname}?${serialized}` : pathname;
    },
  };
});

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
    permanentRedirectMock.mockImplementation((href: string) => {
      throw new Error(`permanentRedirect:${href}`);
    });
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue(null);
    requireAccessibleKangurSlugRouteMock.mockImplementation(async (slugSegments: readonly string[]) => {
      const slug = slugSegments[0]?.trim().toLowerCase();
      if (slug !== 'games' && slug !== 'parent-dashboard') {
        return;
      }

      const session = await authMock();
      if (session?.user?.role !== 'super_admin') {
        notFoundMock();
      }
    });
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'default',
      initialThemeSettings: {},
    });
  });

  it('redirects supported public Kangur slug routes into the web shell with a dedicated-app launch hint', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');

    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');

    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:/kangur/lessons?focus=division&__kangurLaunch=dedicated_app');
    expect(redirectMock).toHaveBeenCalledWith(
      '/kangur/lessons?focus=division&__kangurLaunch=dedicated_app'
    );
  });

  it('redirects supported public Kangur slug routes to the /kangur alias on the web path', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('web_mobile_view');

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
    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');
    const page = await CmsSlugPage({
      params: Promise.resolve({ slug: ['login'] }),
      searchParams: Promise.resolve({ callbackUrl: '/lessons' }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(page).toBeNull();
  });

  it('does not redirect the games slug for non-super-admin sessions', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');
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

    expect(getKangurConfiguredLaunchRouteMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the games slug on the shared web shell even when the dedicated app launch mode is selected', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');
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
    ).rejects.toThrow('redirect:/kangur/games');
    expect(redirectMock).toHaveBeenCalledWith('/kangur/games');
  });

  it('does not redirect localized games slugs for non-super-admin sessions', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');
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

    expect(getKangurConfiguredLaunchRouteMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('omits the default locale prefix on dedicated-app launch handoff routes', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('dedicated_app');

    const { default: LocalizedCmsSlugPage } = await import('@/app/[locale]/(frontend)/[...slug]/page');

    await expect(
      LocalizedCmsSlugPage({
        params: Promise.resolve({ locale: 'pl', slug: ['duels'] }),
        searchParams: Promise.resolve({ join: 'invite-1' }),
      })
    ).rejects.toThrow('redirect:/kangur/duels?join=invite-1&__kangurLaunch=dedicated_app');
    expect(redirectMock).toHaveBeenCalledWith(
      '/kangur/duels?join=invite-1&__kangurLaunch=dedicated_app'
    );
  });

  it('redirects localized Kangur slug routes to the localized /kangur alias on the web path', async () => {
    getKangurConfiguredLaunchRouteMock.mockResolvedValue('web_mobile_view');

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
