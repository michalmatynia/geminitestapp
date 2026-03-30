import { describe, expect, it } from 'vitest';

import {
  resolveAccessibleKangurRouteTransitionTarget,
  resolveKangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';

describe('resolveAccessibleKangurRouteTransitionTarget', () => {
  it('returns the downgraded page key and fallback skeleton together for blocked GamesLibrary hrefs', () => {
    expect(
      resolveAccessibleKangurRouteTransitionTarget({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        href: '/en/kangur/games',
        session: {
          user: {
            email: 'admin@example.com',
            role: 'admin',
          },
          expires: '2099-01-01T00:00:00.000Z',
        },
      })
    ).toEqual({
      pageKey: 'Game',
      skeletonVariant: 'game-home',
    });
  });
});

describe('resolveKangurRouteTransitionSkeletonVariant', () => {
  it('resolves localized lessons routes against the public Kangur base path', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/',
        href: '/en/lessons',
      })
    ).toBe('lessons-library');
  });

  it('keeps lessons focus skeletons for localized routes with focus params', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/',
        href: '/de/lessons?focus=fractions',
      })
    ).toBe('lessons-focus');
  });

  it('resolves localized Kangur alias routes against the /kangur base path', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/kangur',
        href: '/en/kangur/tests',
      })
    ).toBe('lessons-library');
  });

  it('downgrades blocked GamesLibrary hrefs to the fallback game skeleton for non-super-admin sessions', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        href: '/en/kangur/games',
        session: {
          user: {
            email: 'admin@example.com',
            role: 'admin',
          },
          expires: '2099-01-01T00:00:00.000Z',
        },
      })
    ).toBe('game-home');
  });

  it('keeps GamesLibrary skeletons for exact super-admin sessions', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/kangur',
        fallbackPageKey: 'Game',
        pageKey: 'GamesLibrary',
        session: {
          user: {
            email: 'super-admin@example.com',
            role: 'super_admin',
          },
          expires: '2099-01-01T00:00:00.000Z',
        },
      })
    ).toBe('lessons-library');
  });
});
