import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurCanonicalPublicHrefMock,
  notFoundMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurCanonicalPublicHrefMock: vi.fn(),
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

vi.mock('@/features/kangur/config/routing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/config/routing')>();
  return {
    ...actual,
    getKangurCanonicalPublicHref: getKangurCanonicalPublicHrefMock,
  };
});

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
    getKangurCanonicalPublicHrefMock.mockImplementation(
      (slug: string[], searchParams?: Record<string, string | string[] | undefined>) => {
        const path = slug.length > 0 ? `/${slug.join('/')}` : '/';
        const query = new URLSearchParams();

        for (const [key, value] of Object.entries(searchParams ?? {})) {
          if (Array.isArray(value)) {
            for (const entry of value) {
              query.append(key, entry);
            }
            continue;
          }

          if (typeof value === 'string') {
            query.set(key, value);
          }
        }

        const serialized = query.toString();
        return serialized ? `${path}?${serialized}` : path;
      }
    );
  });

  it('renders the explicit kangur alias route without resolving launch redirects', async () => {
    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never)
    ).resolves.toBeNull();

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
    expect(getKangurCanonicalPublicHrefMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('still redirects games aliases for exact super admins when Kangur owns home', async () => {
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue({
      user: {
        role: 'super_admin',
      },
    });

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['games'] }),
        searchParams: Promise.resolve({ tab: 'runtime' }),
      } as never)
    ).rejects.toThrow('redirect:/games?tab=runtime');

    expect(redirectMock).toHaveBeenCalledWith('/games?tab=runtime');
  });

  it('renders the localized explicit kangur alias route without redirecting', async () => {
    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page'
    );

    await expect(
      LocalizedKangurAliasPage({
        params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never)
    ).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
