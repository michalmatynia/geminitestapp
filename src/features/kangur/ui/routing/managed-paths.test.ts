import { describe, expect, it } from 'vitest';

import {
  canonicalizeKangurPublicAliasHref,
  canonicalizeKangurPublicAliasPathname,
  preferKangurPublicAliasHref,
  preferKangurPublicAliasPathname,
  resolveManagedKangurBasePath,
  resolveAccessibleManagedKangurTargetPageKey,
  resolveRouteAwareManagedKangurHref,
  sanitizeAccessibleManagedKangurHref,
} from '@/features/kangur/ui/routing/managed-paths';

describe('managed-paths canonical Kangur alias helpers', () => {
  it('canonicalizes the root-owned Kangur lessons alias pathname', () => {
    expect(canonicalizeKangurPublicAliasPathname('/kangur/lessons')).toBe('/lessons');
  });

  it('canonicalizes localized Kangur alias pathnames', () => {
    expect(canonicalizeKangurPublicAliasPathname('/en/kangur/duels')).toBe('/en/duels');
    expect(canonicalizeKangurPublicAliasPathname('/de/kangur')).toBe('/de');
  });

  it('drops the default locale prefix when canonicalizing alias pathnames', () => {
    expect(canonicalizeKangurPublicAliasPathname('/pl/kangur/lessons')).toBe('/lessons');
  });

  it('preserves search params and hashes while canonicalizing hrefs', () => {
    expect(canonicalizeKangurPublicAliasHref('/uk/kangur/lessons?focus=clock#mission')).toBe(
      '/uk/lessons?focus=clock#mission'
    );
  });

  it('leaves non-alias managed hrefs unchanged', () => {
    expect(canonicalizeKangurPublicAliasHref('/en/lessons?focus=clock')).toBe(
      '/en/lessons?focus=clock'
    );
    expect(canonicalizeKangurPublicAliasPathname('/games')).toBe('/games');
  });

  it('prefers the explicit /kangur alias pathname for root-owned Kangur routes', () => {
    expect(preferKangurPublicAliasPathname('/en/lessons')).toBe('/en/kangur/lessons');
    expect(preferKangurPublicAliasPathname('/de')).toBe('/de/kangur');
    expect(preferKangurPublicAliasPathname('/kangur/lessons')).toBe('/kangur/lessons');
  });

  it('preserves search params and hashes while preferring alias hrefs', () => {
    expect(preferKangurPublicAliasHref('/en/lessons?focus=clock#mission')).toBe(
      '/en/kangur/lessons?focus=clock#mission'
    );
  });

  it('resolves the managed Kangur base path from public and alias hrefs', () => {
    expect(resolveManagedKangurBasePath('/kangur/games')).toBe('/kangur');
    expect(resolveManagedKangurBasePath('/en/kangur/profile')).toBe('/kangur');
    expect(resolveManagedKangurBasePath('/en/profile')).toBe('/');
    expect(resolveManagedKangurBasePath(null)).toBe('/');
  });

  it('resolves same-origin absolute alias hrefs against the active public route locale', () => {
    expect(
      resolveRouteAwareManagedKangurHref({
        href: 'https://kangur.local/en/kangur/profile?tab=stats#summary',
        pathname: '/en/login',
        currentOrigin: 'https://kangur.local',
        canonicalizePublicAlias: true,
      })
    ).toBe('/en/profile?tab=stats#summary');
  });

  it('leaves external absolute hrefs unchanged while still localizing managed hrefs', () => {
    expect(
      resolveRouteAwareManagedKangurHref({
        href: 'https://external.example/kangur/profile',
        pathname: '/en/login',
        currentOrigin: 'https://kangur.local',
        canonicalizePublicAlias: true,
      })
    ).toBe('https://external.example/kangur/profile');
    expect(
      resolveRouteAwareManagedKangurHref({
        href: '/profile?tab=stats',
        pathname: '/en/login',
        currentOrigin: 'https://kangur.local',
        canonicalizePublicAlias: false,
      })
    ).toBe('/en/profile?tab=stats');
  });

  it('sanitizes blocked GamesLibrary hrefs to the provided fallback for non-super-admin sessions', () => {
    expect(
      sanitizeAccessibleManagedKangurHref({
        href: '/kangur/games',
        pathname: '/kangur/login',
        basePath: '/kangur',
        fallbackHref: '/kangur',
        session: {
          expires: '2099-01-01T00:00:00.000Z',
          user: {
            email: 'admin@example.com',
            role: 'admin',
          },
        },
      })
    ).toBe('/kangur');
  });

  it('resolves accessible target page keys from explicit page keys with the shared GamesLibrary fallback rule', () => {
    expect(
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        pageKey: 'GamesLibrary',
        session: {
          expires: '2099-01-01T00:00:00.000Z',
          user: {
            email: 'admin@example.com',
            role: 'admin',
          },
        },
      })
    ).toBe('Game');

    expect(
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        pageKey: 'GamesLibrary',
        session: {
          expires: '2099-01-01T00:00:00.000Z',
          user: {
            email: 'owner@example.com',
            role: 'super_admin',
          },
        },
      })
    ).toBe('GamesLibrary');
  });

  it('resolves accessible target page keys from hrefs and falls back when neither source exists', () => {
    expect(
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        href: '/kangur/games',
        session: {
          expires: '2099-01-01T00:00:00.000Z',
          user: {
            email: 'admin@example.com',
            role: 'admin',
          },
        },
      })
    ).toBe('Game');

    expect(
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        href: '/kangur/games',
        session: {
          expires: '2099-01-01T00:00:00.000Z',
          user: {
            email: 'owner@example.com',
            role: 'super_admin',
          },
        },
      })
    ).toBe('GamesLibrary');

    expect(
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
      })
    ).toBe('Game');
  });
});
