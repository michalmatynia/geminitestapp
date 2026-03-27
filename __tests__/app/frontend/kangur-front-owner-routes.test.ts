import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildSlugMetadataMock,
  kangurFeatureRouteShellMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurConfiguredLaunchTargetMock,
  kangurPublicAppMock,
  loadSlugRenderDataMock,
  notFoundMock,
  redirectMock,
  resolveSlugToPageMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  buildSlugMetadataMock: vi.fn(),
  kangurFeatureRouteShellMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurConfiguredLaunchTargetMock: vi.fn(),
  kangurPublicAppMock: vi.fn(),
  loadSlugRenderDataMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveSlugToPageMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => vi.fn((key) => {
    if (key === 'loginTitle') return 'StudiQ Login';
    return key;
  })),
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/kangur/public', () => ({
  KangurPublicApp: kangurPublicAppMock,
  KangurFeatureRouteShell: kangurFeatureRouteShellMock,
  getKangurPublicAliasHref: (
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

    const serialized = query.toString();
    return serialized ? `${pathname}?${serialized}` : pathname;
  },
  getKangurCanonicalPublicHref: (
    slugSegments: readonly string[] = [],
    searchParams?: Record<string, string | string[] | undefined>
  ) => {
    const pathname = slugSegments.length > 0 ? `/${slugSegments.join('/')}` : '/';
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

    const serialized = query.toString();
    return serialized ? `${pathname}?${serialized}` : pathname;
  },
  getKangurHomeHref: (pathname = '/') => pathname,
}));

vi.mock('@/features/kangur/server/launch-route', () => ({
  getKangurConfiguredLaunchTarget: getKangurConfiguredLaunchTargetMock,
  getKangurConfiguredLaunchHref: vi.fn(async (slug, searchParams) => {
    const resolved = await getKangurConfiguredLaunchTargetMock(slug, searchParams);
    return resolved.href;
  }),
}));

vi.mock('@/features/cms/components/frontend/CmsPageRenderer', () => ({
  CmsPageRenderer: () => null,
}));

vi.mock('@/features/cms/components/frontend/CmsPageShell', () => ({
  CmsPageShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/features/cms/components/frontend/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/app/(frontend)/[...slug]/slug-page-data', () => ({
  buildSlugMetadata: buildSlugMetadataMock,
  loadSlugRenderData: loadSlugRenderDataMock,
  resolveSlugToPage: resolveSlugToPageMock,
}));

vi.mock('@/features/kangur/server/storefront-appearance', () => ({
  getKangurStorefrontInitialState: vi.fn().mockResolvedValue({
    initialMode: 'default',
    initialThemeSettings: {},
  }),
}));

describe('kangur public-owner frontend routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockImplementation((value: string | null | undefined) =>
      value === 'kangur' ? 'kangur' : 'cms'
    );
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getKangurConfiguredLaunchTargetMock.mockImplementation(
      async (slug: string[] = [], searchParams?: Record<string, string | string[] | undefined>) => {
        const pathname = `/${slug.join('/') || ''}`.replace(/\/+$/, '') || '/';
        const query = new URLSearchParams();
        Object.entries(searchParams ?? {}).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((entry) => {
              if (typeof entry === 'string') query.append(key, entry);
            });
            return;
          }
          if (typeof value === 'string') {
            query.set(key, value);
          }
        });
        const serializedQuery = query.toString();
        const href = serializedQuery ? `${pathname}?${serializedQuery}` : pathname;
        return {
          href,
          fallbackHref: pathname,
        };
      }
    );
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
    kangurPublicAppMock.mockReturnValue(null);
    kangurFeatureRouteShellMock.mockReturnValue(null);
  });

  it('redirects root-owned public frontend slugs to the Kangur alias path without CMS lookup', async () => {
    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');
    const { KANGUR_BASE_PATH } = await import('@/features/kangur/config/routing');

    await expect(
      CmsSlugPage({
        params: Promise.resolve({ slug: ['tests'] }),
      })
    ).rejects.toThrow(`redirect:${KANGUR_BASE_PATH}/tests`);

    expect(redirectMock).toHaveBeenCalledWith(`${KANGUR_BASE_PATH}/tests`);
    expect(kangurPublicAppMock).not.toHaveBeenCalled();
    expect(kangurFeatureRouteShellMock).not.toHaveBeenCalled();
    expect(resolveSlugToPageMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('returns Kangur metadata for the public login slug when Kangur owns the frontend', async () => {
    const { generateMetadata } = await import('@/app/(frontend)/[...slug]/page');

    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: ['login'] }),
      })
    ).resolves.toEqual({
      title: 'StudiQ Login',
    });

    expect(resolveSlugToPageMock).not.toHaveBeenCalled();
    expect(buildSlugMetadataMock).not.toHaveBeenCalled();
  });

  it('keeps legacy /kangur child routes on the server shell when Kangur owns the frontend', async () => {
    const { default: KangurAliasPage } = await import(
      '@/app/(frontend)/kangur/(app)/[...slug]/page'
    );

    const result = await KangurAliasPage({
      params: Promise.resolve({ slug: ['tests'] }),
      searchParams: Promise.resolve({ focus: 'division' }),
    });

    expect(result).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('keeps legacy /kangur child routes on the server shell when CMS owns the frontend', async () => {
    getFrontPageSettingMock.mockResolvedValue('cms');

    const { default: KangurAliasPage } = await import(
      '@/app/(frontend)/kangur/(app)/[...slug]/page'
    );

    const result = await KangurAliasPage({
      params: Promise.resolve({ slug: ['tests'] }),
    });

    expect(result).toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects legacy /kangur/login to /login when Kangur owns the frontend', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { default: KangurAliasLoginPage } = await import('@/app/(frontend)/kangur/login/page');

    await expect(
      KangurAliasLoginPage({
        searchParams: Promise.resolve({ callbackUrl: '/tests' }),
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Ftests');

    process.env.NODE_ENV = originalNodeEnv;
  });

});
