import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildSlugMetadataMock,
  kangurFeatureRouteShellMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
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

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/kangur/ui/KangurPublicApp', () => ({
  KangurPublicApp: kangurPublicAppMock,
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: kangurFeatureRouteShellMock,
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

describe('kangur public-owner frontend routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    getFrontPageSettingMock.mockResolvedValue('kangur');
    getFrontPagePublicOwnerMock.mockImplementation((value: string | null | undefined) =>
      value === 'kangur' ? 'kangur' : 'cms'
    );
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
    kangurPublicAppMock.mockReturnValue(null);
    kangurFeatureRouteShellMock.mockReturnValue(null);
  });

  it('routes public frontend slugs through Kangur when Kangur owns the frontend', async () => {
    const { default: CmsSlugPage } = await import('@/app/(frontend)/[...slug]/page');

    const result = await CmsSlugPage({
      params: Promise.resolve({ slug: ['tests'] }),
    });

    expect(result).toMatchObject({
      type: kangurPublicAppMock,
      props: { slug: ['tests'], basePath: '/' },
    });
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
      title: 'Kangur Login',
    });

    expect(resolveSlugToPageMock).not.toHaveBeenCalled();
    expect(buildSlugMetadataMock).not.toHaveBeenCalled();
  });

  it('redirects legacy /kangur child routes to root-owned public routes when Kangur owns the frontend', async () => {
    const { default: KangurAliasPage } = await import(
      '@/app/(frontend)/kangur/(app)/[[...slug]]/page'
    );

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['tests'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:/tests?focus=division');

    expect(redirectMock).toHaveBeenCalledWith('/tests?focus=division');
  });

  it('keeps legacy /kangur child routes inert when CMS owns the frontend', async () => {
    getFrontPageSettingMock.mockResolvedValue('cms');

    const { default: KangurAliasPage } = await import(
      '@/app/(frontend)/kangur/(app)/[[...slug]]/page'
    );

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['tests'] }),
      })
    ).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects legacy /kangur/login to /login when Kangur owns the frontend', async () => {
    const { default: KangurAliasLoginPage } = await import('@/app/(frontend)/kangur/login/page');

    await expect(
      KangurAliasLoginPage({
        searchParams: Promise.resolve({ callbackUrl: '/tests' }),
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Ftests');
  });

  it('keeps legacy /kangur/login rendering when CMS owns the frontend', async () => {
    getFrontPageSettingMock.mockResolvedValue('cms');

    const { default: KangurAliasLoginPage } = await import('@/app/(frontend)/kangur/login/page');

    const result = await KangurAliasLoginPage({});

    expect(result.type).toBe(Symbol.for('react.suspense'));
    expect(result.props.children).toMatchObject({
      type: kangurFeatureRouteShellMock,
    });
    expect(result.props.fallback).toMatchObject({
      props: {
        className: 'sr-only',
        children: 'Ladowanie Kangura...',
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
