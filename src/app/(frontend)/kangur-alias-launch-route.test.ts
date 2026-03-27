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
  redirect: redirectMock,
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

  it('renders the explicit kangur alias route on the server shell without resolving launch redirects', async () => {
    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');
    const { KangurServerShell } = await import('@/features/kangur/ui/components/KangurServerShell');

    const result = await KangurAliasPage({
      params: Promise.resolve({ slug: ['lessons'] }),
      searchParams: Promise.resolve({ focus: 'division' }),
    } as never);

    expect(result).toMatchObject({
      type: KangurServerShell,
      props: {},
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not redirect blocked games aliases to the canonical public route for non-super-admin users', async () => {
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['games'] }),
        searchParams: Promise.resolve({ tab: 'runtime' }),
      } as never)
    ).rejects.toThrow('notFound');

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('renders games aliases for exact super admins when Kangur owns home', async () => {
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue({
      user: {
        role: 'super_admin',
      },
    });

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');
    const { KangurServerShell } = await import('@/features/kangur/ui/components/KangurServerShell');

    const result = await KangurAliasPage({
      params: Promise.resolve({ slug: ['games'] }),
    } as never);

    expect(result).toMatchObject({
      type: KangurServerShell,
      props: {},
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('renders the localized explicit kangur alias route on the server shell without redirecting', async () => {
    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page'
    );
    const { KangurServerShell } = await import('@/features/kangur/ui/components/KangurServerShell');

    const result = await LocalizedKangurAliasPage({
      params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
      searchParams: Promise.resolve({ focus: 'division' }),
    } as never);

    expect(result).toMatchObject({
      type: KangurServerShell,
      props: {},
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not render localized blocked games aliases for non-super-admin users', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'admin',
      },
    });

    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page'
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
