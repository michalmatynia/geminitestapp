/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurConfiguredLaunchTargetMock,
  getKangurStorefrontInitialStateMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurConfiguredLaunchTargetMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: vi.fn(),
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
  KangurPublicApp: ({
    slug = [],
    basePath = '/',
  }: {
    slug?: string[];
    basePath?: string;
  }) => (
    <div
      data-testid='kangur-public-app'
      data-base-path={basePath}
      data-slug={slug.join('/')}
    />
  ),
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
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
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

  it('keeps unsupported slug routes on the web render path', async () => {
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

    render(page);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('kangur-public-app')).toHaveAttribute('data-base-path', '/');
    expect(screen.getByTestId('kangur-public-app')).toHaveAttribute('data-slug', 'login');
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
});
