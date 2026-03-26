import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getFrontPagePublicOwnerMock,
  getFrontPageSettingMock,
  getKangurCanonicalPublicHrefMock,
  redirectMock,
  shouldApplyFrontPageAppSelectionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getFrontPagePublicOwnerMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  getKangurCanonicalPublicHrefMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldApplyFrontPageAppSelectionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => () => 'Loading route'),
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

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: () => <div data-testid='kangur-feature-route-shell'>Kangur route shell</div>,
}));

const buildCanonicalHref = (
  slug: string[],
  searchParams?: Record<string, string | string[] | undefined>
): string => {
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
};

describe('kangur login alias route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    shouldApplyFrontPageAppSelectionMock.mockReturnValue(true);
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'kangur' });
    getFrontPagePublicOwnerMock.mockReturnValue('kangur');
    authMock.mockResolvedValue(null);
    getKangurCanonicalPublicHrefMock.mockImplementation(
      (slug: string[], searchParams?: Record<string, string | string[] | undefined>) =>
        buildCanonicalHref(slug, searchParams)
    );
  });

  it('redirects the unlocalized login alias to the canonical public login route when Kangur owns home', async () => {
    const { default: Page } = await import('@/app/(frontend)/kangur/login/page');

    await expect(
      Page({
        searchParams: Promise.resolve({
          callbackUrl: '/kangur/tests',
        }),
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Ftests');
  });

  it('redirects the localized login alias to the localized canonical public login route when Kangur owns home', async () => {
    const { default: LocalizedPage } = await import('@/app/[locale]/(frontend)/kangur/login/page');

    await expect(
      LocalizedPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({
          callbackUrl: '/kangur/tests',
        }),
      })
    ).rejects.toThrow('redirect:/en/login?callbackUrl=%2Fen%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/en/login?callbackUrl=%2Fen%2Ftests');
  });

  it('sanitizes blocked games callbacks on the unlocalized login alias for non-super-admin users', async () => {
    const { default: Page } = await import('@/app/(frontend)/kangur/login/page');

    await expect(
      Page({
        searchParams: Promise.resolve({
          callbackUrl: '/kangur/games',
        }),
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2F');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2F');
  });

  it('sanitizes blocked games callbacks on the localized login alias for non-super-admin users', async () => {
    const { default: LocalizedPage } = await import('@/app/[locale]/(frontend)/kangur/login/page');

    await expect(
      LocalizedPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({
          callbackUrl: '/kangur/games',
        }),
      })
    ).rejects.toThrow('redirect:/en/login?callbackUrl=%2Fen');

    expect(redirectMock).toHaveBeenCalledWith('/en/login?callbackUrl=%2Fen');
  });

  it('preserves games callbacks on the unlocalized login alias for exact super admins', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'super_admin',
      },
    });

    const { default: Page } = await import('@/app/(frontend)/kangur/login/page');

    await expect(
      Page({
        searchParams: Promise.resolve({
          callbackUrl: '/kangur/games',
        }),
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Fgames');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Fgames');
  });

  it('renders the legacy login shell when Kangur does not own home', async () => {
    getFrontPageSettingMock.mockResolvedValue({ publicOwner: 'cms' });
    getFrontPagePublicOwnerMock.mockReturnValue('cms');

    const { default: Page } = await import('@/app/(frontend)/kangur/login/page');
    const result = await Page({});

    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
