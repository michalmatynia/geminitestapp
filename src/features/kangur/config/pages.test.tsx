/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DynamicCall = {
  loading?: React.ComponentType;
};

const {
  dynamicCalls,
  competitionPageImportMock,
  gamePageImportMock,
  lessonsPageImportMock,
  routeLoadingFallbackMock,
} = vi.hoisted(() => ({
  dynamicCalls: [] as DynamicCall[],
  competitionPageImportMock: vi.fn(),
  gamePageImportMock: vi.fn(),
  lessonsPageImportMock: vi.fn(),
  routeLoadingFallbackMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, options?: { loading?: React.ComponentType }) => {
    dynamicCalls.push({ loading: options?.loading });
    return () => <div data-testid='kangur-lazy-page-probe' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurRouteLoadingFallback', () => ({
  KangurRouteLoadingFallback: (props: Record<string, unknown>) => {
    routeLoadingFallbackMock(props);
    return <div data-testid='kangur-route-loading-fallback-probe' />;
  },
}));

vi.mock('@/features/kangur/ui/pages/Competition', () => {
  competitionPageImportMock();
  return {
    default: () => <div data-testid='kangur-competition-page-probe' />,
  };
});

vi.mock('@/features/kangur/ui/pages/Game', () => {
  gamePageImportMock();
  return {
    default: () => <div data-testid='kangur-game-page-probe' />,
  };
});

vi.mock('@/features/kangur/ui/pages/Lessons', () => {
  lessonsPageImportMock();
  return {
    default: () => <div data-testid='kangur-lessons-page-probe' />,
  };
});

describe('kangur page config', () => {
  let kangurPages: typeof import('@/features/kangur/config/pages').kangurPages;
  let KANGUR_MAIN_PAGE: typeof import('@/features/kangur/config/pages').KANGUR_MAIN_PAGE;
  let preloadKangurPage: typeof import('@/features/kangur/config/pages').preloadKangurPage;

  beforeEach(async () => {
    vi.resetModules();
    cleanup();
    dynamicCalls.length = 0;
    competitionPageImportMock.mockReset();
    gamePageImportMock.mockReset();
    lessonsPageImportMock.mockReset();
    routeLoadingFallbackMock.mockReset();

    ({ kangurPages, KANGUR_MAIN_PAGE, preloadKangurPage } = await import(
      '@/features/kangur/config/pages'
    ));
  });

  it('keeps Game as the main Kangur page', () => {
    expect(KANGUR_MAIN_PAGE).toBe('Game');
  });

  it('preloads Kangur page modules on demand', async () => {
    preloadKangurPage('Competition');
    await vi.dynamicImportSettled();

    expect(competitionPageImportMock).toHaveBeenCalledTimes(1);
  });

  it('preloads Lessons page module on demand via dynamic import', async () => {
    preloadKangurPage('Lessons');
    await vi.dynamicImportSettled();

    expect(lessonsPageImportMock).toHaveBeenCalledTimes(1);
  });

  it('includes Game and Lessons as preloadable page keys', () => {
    // Game is eagerly preloaded at module scope for fast boot, but both
    // Game and Lessons remain preloadable via the preloadKangurPage API.
    expect(() => preloadKangurPage('Game')).not.toThrow();
    expect(() => preloadKangurPage('Lessons')).not.toThrow();
  });

  it('lazy-loads all Kangur pages including Game and Lessons via dynamic()', () => {
    expect(Object.keys(kangurPages)).toEqual([
      'Competition',
      'Game',
      'GamesLibrary',
      'Duels',
      'LearnerProfile',
      'Lessons',
      'ParentDashboard',
      'SocialUpdates',
      'Tests',
    ]);
    expect(dynamicCalls).toHaveLength(9);

    const competitionLoadingFallback = dynamicCalls[0]?.loading;
    const socialUpdatesLoadingFallback = dynamicCalls[7]?.loading;

    expect(competitionLoadingFallback).toBeTypeOf('function');
    expect(socialUpdatesLoadingFallback).toBeTypeOf('function');

    const NonMainPageLoadingFallback = competitionLoadingFallback;
    if (!NonMainPageLoadingFallback) {
      throw new Error('Expected the shared non-main loading fallback component.');
    }

    render(<NonMainPageLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(routeLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });

    expect(socialUpdatesLoadingFallback).toBe(competitionLoadingFallback);
    expect(kangurPages['Game']).toBeTypeOf('function');
    expect(kangurPages['Lessons']).toBeTypeOf('function');
  });

  it('uses a loading fallback without top navigation skeleton for the Game page', () => {
    // Game is at index 1 in dynamicCalls (after Competition)
    const gameLoadingFallback = dynamicCalls[1]?.loading;

    expect(gameLoadingFallback).toBeTypeOf('function');

    const GameLoadingFallback = gameLoadingFallback;
    if (!GameLoadingFallback) {
      throw new Error('Expected the Game loading fallback component.');
    }

    cleanup();
    render(<GameLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });
  });
});
