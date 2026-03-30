import { describe, expect, it } from 'vitest';

import { resolveAccessibleKangurPendingRouteLoadingSnapshot } from '../pending-route-loading-snapshot';

describe('resolveAccessibleKangurPendingRouteLoadingSnapshot', () => {
  it('downgrades blocked GamesLibrary snapshots to the game-home fallback for non-super-admin users', () => {
    const snapshot = resolveAccessibleKangurPendingRouteLoadingSnapshot({
      currentHref: '/kangur',
      fallbackPageKey: 'Game',
      session: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      } as any,
      snapshot: {
        fromHref: '/kangur',
        href: '/kangur/games',
        pageKey: 'GamesLibrary',
        skeletonVariant: 'lessons-library',
        startedAt: Date.now(),
        topBarHeightCssValue: '136px',
      },
    });

    expect(snapshot).toMatchObject({
      href: '/kangur/games',
      pageKey: 'Game',
      skeletonVariant: 'game-home',
    });
  });

  it('keeps GamesLibrary snapshots intact for exact super-admin users', () => {
    const snapshot = resolveAccessibleKangurPendingRouteLoadingSnapshot({
      currentHref: '/kangur',
      fallbackPageKey: 'Game',
      session: {
        user: {
          email: 'super-admin@example.com',
          role: 'super_admin',
        },
      } as any,
      snapshot: {
        fromHref: '/kangur',
        href: '/kangur/games',
        pageKey: 'GamesLibrary',
        skeletonVariant: 'lessons-library',
        startedAt: Date.now(),
        topBarHeightCssValue: '136px',
      },
    });

    expect(snapshot).toMatchObject({
      href: '/kangur/games',
      pageKey: 'GamesLibrary',
      skeletonVariant: 'lessons-library',
    });
  });
});
