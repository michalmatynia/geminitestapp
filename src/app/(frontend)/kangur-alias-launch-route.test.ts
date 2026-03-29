import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  notFoundMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  permanentRedirect: redirectMock,
  redirect: redirectMock,
}));

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

describe('kangur alias route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(false);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'cms' });
    getFrontPagePublicOwnerMock.mockReturnValue('cms');
    authMock.mockResolvedValue(null);
  });

  it(
    'resolves the explicit kangur alias route without resolving launch redirects',
    async () => {
      const { default: KangurAliasPage } = await import(
        '@/app/(frontend)/kangur/(app)/[...slug]/page'
      );

      const result = await KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never);

      expect(result).toBeNull();

      expect(redirectMock).not.toHaveBeenCalled();
    },
    60_000
  );

  it('resolves the explicit hot kangur alias pages without per-route shell markup', async () => {
    const [
      { default: KangurAliasHomePage },
      { default: KangurAliasLessonsPage },
      { default: KangurAliasDuelsPage },
      { default: KangurAliasTestsPage },
    ] = await Promise.all([
      import('@/app/(frontend)/kangur/(app)/page'),
      import('@/app/(frontend)/kangur/(app)/lessons/page'),
      import('@/app/(frontend)/kangur/(app)/duels/page'),
      import('@/app/(frontend)/kangur/(app)/tests/page'),
    ]);

    await expect(KangurAliasHomePage()).resolves.toBeNull();
    await expect(KangurAliasLessonsPage()).resolves.toBeNull();
    await expect(KangurAliasDuelsPage()).resolves.toBeNull();
    await expect(KangurAliasTestsPage()).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not redirect blocked games aliases to the canonical public route for non-super-admin users', async () => {
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[...slug]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['games'] }),
        searchParams: Promise.resolve({ tab: 'runtime' }),
      } as never)
    ).rejects.toThrow('notFound');

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('resolves games aliases for exact super admins when Kangur owns home', async () => {
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue({
      user: {
        role: 'super_admin',
      },
    });

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[...slug]/page');

    const result = await KangurAliasPage({
      params: Promise.resolve({ slug: ['games'] }),
    } as never);

    expect(result).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('resolves the localized explicit kangur alias route without redirecting', async () => {
    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[...slug]/page'
    );

    const result = await LocalizedKangurAliasPage({
      params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
      searchParams: Promise.resolve({ focus: 'division' }),
    } as never);

    expect(result).toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('resolves the localized explicit hot kangur alias pages without per-route shell markup', async () => {
    const [
      { default: LocalizedKangurAliasHomePage },
      { default: LocalizedKangurAliasLessonsPage },
      { default: LocalizedKangurAliasDuelsPage },
      { default: LocalizedKangurAliasTestsPage },
    ] = await Promise.all([
      import('@/app/[locale]/(frontend)/kangur/(app)/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/lessons/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/duels/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/tests/page'),
    ]);

    await expect(LocalizedKangurAliasHomePage()).resolves.toBeNull();
    await expect(LocalizedKangurAliasLessonsPage()).resolves.toBeNull();
    await expect(LocalizedKangurAliasDuelsPage()).resolves.toBeNull();
    await expect(LocalizedKangurAliasTestsPage()).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not render localized blocked games aliases for non-super-admin users', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'admin',
      },
    });

    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[...slug]/page'
    );

    await expect(
      LocalizedKangurAliasPage({
        params: Promise.resolve({ locale: 'pl', slug: ['games'] }),
      } as never)
    ).rejects.toThrow('notFound');

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
