import { describe, expect, it } from 'vitest';

import {
  canAccessKangurPage,
  canAccessKangurSlugSegments,
  isSuperAdminOnlyKangurPage,
  resolveAccessibleKangurPageKey,
  resolveAccessibleKangurRouteState,
} from '@/features/kangur/config/page-access';

describe('kangur page access', () => {
  it('treats GamesLibrary as the only current super-admin-only Kangur page', () => {
    expect(isSuperAdminOnlyKangurPage('GamesLibrary')).toBe(true);
    expect(isSuperAdminOnlyKangurPage('Game')).toBe(false);
    expect(isSuperAdminOnlyKangurPage('Lessons')).toBe(false);
  });

  it('allows GamesLibrary only for exact super-admin sessions', () => {
    const superAdminSession = {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'super@example.com',
        id: 'user-1',
        name: 'Super Admin',
        role: 'super_admin',
      },
    };
    const adminSession = {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'user-2',
        name: 'Admin',
        role: 'admin',
      },
    };

    expect(canAccessKangurPage('GamesLibrary', superAdminSession)).toBe(true);
    expect(canAccessKangurPage('GamesLibrary', adminSession)).toBe(false);
    expect(canAccessKangurPage('Game', adminSession)).toBe(true);
  });

  it('blocks the games slug for non-super-admin sessions only', () => {
    const superAdminSession = {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'super@example.com',
        id: 'user-1',
        name: 'Super Admin',
        role: 'super_admin',
      },
    };
    const adminSession = {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'user-2',
        name: 'Admin',
        role: 'admin',
      },
    };

    expect(canAccessKangurSlugSegments(['games'], superAdminSession)).toBe(true);
    expect(canAccessKangurSlugSegments(['games'], adminSession)).toBe(false);
    expect(canAccessKangurSlugSegments(['lessons'], adminSession)).toBe(true);
    expect(canAccessKangurSlugSegments(['unknown'], adminSession)).toBe(true);
  });

  it('resolves inaccessible GamesLibrary routes to the provided fallback page', () => {
    expect(
      resolveAccessibleKangurPageKey(
        'GamesLibrary',
        {
          expires: '2026-12-31T23:59:59.000Z',
          user: {
            email: 'parent@example.com',
            id: 'user-3',
            name: 'Parent',
            role: 'user',
          },
        },
        'Game'
      )
    ).toBe('Game');
    expect(resolveAccessibleKangurPageKey('Lessons', null, 'Game')).toBe('Lessons');
  });

  it('resolves blocked GamesLibrary route state to the fallback page and path', () => {
    expect(
      resolveAccessibleKangurRouteState({
        normalizedBasePath: '/kangur',
        pageKey: 'GamesLibrary',
        requestedPath: '/kangur/games',
        slugSegments: ['games'],
        session: {
          expires: '2026-12-31T23:59:59.000Z',
          user: {
            email: 'admin@example.com',
            id: 'user-2',
            name: 'Admin',
            role: 'admin',
          },
        },
        fallbackPageKey: 'Game',
      })
    ).toEqual({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });
});
