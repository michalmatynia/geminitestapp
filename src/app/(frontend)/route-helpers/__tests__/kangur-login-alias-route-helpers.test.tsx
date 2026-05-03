import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  resolveFrontPageSelectionMock,
  getKangurCanonicalPublicHrefMock,
  redirectMock,
  buildCanonicalHref,
} = vi.hoisted(() => {
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

  return {
    authMock: vi.fn(),
    resolveFrontPageSelectionMock: vi.fn(),
    getKangurCanonicalPublicHrefMock: vi.fn(),
    redirectMock: vi.fn(),
    buildCanonicalHref,
  };
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  permanentRedirect: redirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  redirect: redirectMock,
  permanentRedirect: redirectMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  readOptionalServerAuthSession: authMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => () => 'Loading route'),
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: resolveFrontPageSelectionMock,
}));

vi.mock('@/features/kangur/config/routing', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/config/routing')>(
    '@/features/kangur/config/routing'
  );

  return {
    ...actual,
    getKangurCanonicalPublicHref: getKangurCanonicalPublicHrefMock,
    getKangurHomeHref: (pathname = '/') => pathname,
  };
});

vi.mock('@/features/kangur/server', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/server/login-alias-search-params')>(
    '@/features/kangur/server/login-alias-search-params'
  );

  return {
    readSanitizedKangurAliasLoginSearchParams:
      actual.readSanitizedKangurAliasLoginSearchParams,
  };
});

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: () =>
    React.createElement(
      'div',
      { 'data-testid': 'kangur-feature-route-shell' },
      'Kangur route shell'
    ),
}));

describe('kangur login alias route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    authMock.mockResolvedValue(null);
    getKangurCanonicalPublicHrefMock.mockImplementation(
      (slug: string[], searchParams?: Record<string, string | string[] | undefined>) =>
        buildCanonicalHref(slug, searchParams)
    );
  });

  it('redirects the unlocalized login alias to the canonical public login route when Kangur owns home', async () => {
    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );

    await expect(
      renderKangurLoginAliasRoute({
        searchParams: {
          callbackUrl: '/kangur/tests',
        },
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Ftests');
  });

  it('redirects the localized login alias to the localized canonical public login route when Kangur owns home', async () => {
    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );

    await expect(
      renderKangurLoginAliasRoute({
        locale: 'en',
        searchParams: {
          callbackUrl: '/kangur/tests',
        },
      })
    ).rejects.toThrow('redirect:/en/login?callbackUrl=%2Fen%2Ftests');

    expect(redirectMock).toHaveBeenCalledWith('/en/login?callbackUrl=%2Fen%2Ftests');
  });

  it('sanitizes blocked games callbacks on the unlocalized login alias for non-super-admin users', async () => {
    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );

    await expect(
      renderKangurLoginAliasRoute({
        searchParams: {
          callbackUrl: '/kangur/games',
        },
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2F');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2F');
  });

  it('sanitizes blocked games callbacks on the localized login alias for non-super-admin users', async () => {
    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );

    await expect(
      renderKangurLoginAliasRoute({
        locale: 'en',
        searchParams: {
          callbackUrl: '/kangur/games',
        },
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

    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );

    await expect(
      renderKangurLoginAliasRoute({
        searchParams: {
          callbackUrl: '/kangur/games',
        },
      })
    ).rejects.toThrow('redirect:/login?callbackUrl=%2Fgames');

    expect(redirectMock).toHaveBeenCalledWith('/login?callbackUrl=%2Fgames');
  });

  it('renders the legacy login shell when Kangur does not own home', async () => {
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'cms',
      publicOwner: 'cms',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });

    const { renderKangurLoginAliasRoute } = await import(
      '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers'
    );
    const result = await renderKangurLoginAliasRoute({});

    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
