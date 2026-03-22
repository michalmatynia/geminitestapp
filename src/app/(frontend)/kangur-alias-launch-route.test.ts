import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurConfiguredLaunchHrefMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurConfiguredLaunchHrefMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  getFrontPageSetting: getFrontPageSettingMock,
  shouldApplyFrontPageAppSelection: shouldApplyFrontPageAppSelectionMock,
}));

vi.mock('@/shared/lib/front-page-app', () => ({
  getFrontPagePublicOwner: getFrontPagePublicOwnerMock,
}));

vi.mock('@/features/kangur/server/launch-route', () => ({
  getKangurConfiguredLaunchHref: getKangurConfiguredLaunchHrefMock,
}));

describe('kangur alias launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
  });

  it('redirects the root kangur alias route through the configured launch href', async () => {
    getKangurConfiguredLaunchHrefMock.mockResolvedValue('kangur://lessons?focus=division');

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:kangur://lessons?focus=division');

    expect(getKangurConfiguredLaunchHrefMock).toHaveBeenCalledWith(['lessons'], {
      focus: 'division',
    });
    expect(redirectMock).toHaveBeenCalledWith('kangur://lessons?focus=division');
  });

  it('returns null without resolving launch href when kangur is not the selected front page app', async () => {
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'cms' });
    getFrontPagePublicOwnerMock.mockReturnValue('cms');

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
      })
    ).resolves.toBeNull();

    expect(getKangurConfiguredLaunchHrefMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('passes localized fallback handling to the localized kangur alias route', async () => {
    getKangurConfiguredLaunchHrefMock.mockImplementation(
      async (
        slug: string[],
        searchParams: Record<string, string | string[] | undefined> | undefined,
        options?: { localizeFallbackHref?: (href: string) => string }
      ) => {
        expect(slug).toEqual(['lessons']);
        expect(searchParams).toEqual({ focus: 'division' });
        expect(options?.localizeFallbackHref).toEqual(expect.any(Function));
        return options?.localizeFallbackHref?.('/lessons?focus=division') ?? '/lessons?focus=division';
      }
    );

    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page'
    );

    await expect(
      LocalizedKangurAliasPage({
        params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      })
    ).rejects.toThrow('redirect:/lessons?focus=division');

    expect(redirectMock).toHaveBeenCalledWith('/lessons?focus=division');
  });
});
