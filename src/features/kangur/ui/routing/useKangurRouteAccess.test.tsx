/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';

function RouteAccessProbe(): React.JSX.Element {
  const {
    resolveRouteState,
    resolveRoutePageKey,
    sanitizeManagedHref,
    resolveManagedTargetPageKey,
    resolveTransitionSkeletonVariant,
    resolveTransitionTarget,
  } = useKangurRouteAccess();

  const blockedTarget = resolveManagedTargetPageKey({
    basePath: '/kangur',
    fallbackPageKey: 'Game',
    href: '/kangur/games',
  });
  const blockedTransition = resolveTransitionTarget({
    basePath: '/kangur',
    fallbackPageKey: 'Game',
    href: '/kangur/games',
  });
  const blockedSkeleton = resolveTransitionSkeletonVariant({
    basePath: '/kangur',
    fallbackPageKey: 'Game',
    href: '/kangur/games',
  });
  const blockedHref =
    sanitizeManagedHref({
      href: '/kangur/games',
      pathname: '/kangur/login',
      basePath: '/kangur',
      fallbackHref: '/kangur',
    }) ?? 'missing';
  const blockedRouteState = resolveRouteState({
    normalizedBasePath: '/kangur',
    pageKey: 'GamesLibrary',
    requestedPath: '/kangur/games',
  });
  const localizedLessonsPageKey = resolveRoutePageKey('/en/kangur/lessons', '/kangur');

  return (
    <div
      data-blocked-href={blockedHref}
      data-blocked-route-page={blockedRouteState.pageKey}
      data-blocked-route-path={blockedRouteState.requestedPath}
      data-blocked-skeleton={blockedSkeleton}
      data-blocked-target={blockedTarget}
      data-localized-lessons-page={localizedLessonsPageKey}
      data-blocked-transition-page={blockedTransition.pageKey}
      data-testid='kangur-route-access-probe'
    />
  );
}

describe('useKangurRouteAccess', () => {
  beforeEach(() => {
    sessionMock.mockReset();
  });

  it('downgrades blocked GamesLibrary targets for non-super-admin sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          name: 'Admin',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<RouteAccessProbe />);

    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-target',
      'Game'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-transition-page',
      'Game'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-skeleton',
      'game-home'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-href',
      '/kangur'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-route-page',
      'Game'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-route-path',
      '/kangur'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-localized-lessons-page',
      'Lessons'
    );
  });

  it('preserves GamesLibrary targets for exact super admins', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'owner@example.com',
          id: 'owner-1',
          name: 'Owner',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(<RouteAccessProbe />);

    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-target',
      'GamesLibrary'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-transition-page',
      'GamesLibrary'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-skeleton',
      'lessons-library'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-href',
      '/kangur/games'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-route-page',
      'GamesLibrary'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-blocked-route-path',
      '/kangur/games'
    );
    expect(screen.getByTestId('kangur-route-access-probe')).toHaveAttribute(
      'data-localized-lessons-page',
      'Lessons'
    );
  });
});
