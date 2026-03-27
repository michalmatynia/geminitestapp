/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DynamicCall = {
  loading?: React.ComponentType;
};

const { dynamicCalls, routeLoadingFallbackMock } = vi.hoisted(() => ({
  dynamicCalls: [] as DynamicCall[],
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

vi.mock('@/features/kangur/ui/pages/Game', () => ({
  default: () => <div data-testid='kangur-game-page-probe' />,
}));

vi.mock('@/features/kangur/ui/pages/Lessons', () => ({
  default: () => <div data-testid='kangur-lessons-page-probe' />,
}));

describe('kangur page config', () => {
  let kangurPages: typeof import('@/features/kangur/config/pages').kangurPages;
  let KANGUR_MAIN_PAGE: typeof import('@/features/kangur/config/pages').KANGUR_MAIN_PAGE;

  beforeEach(async () => {
    vi.resetModules();
    cleanup();
    dynamicCalls.length = 0;
    routeLoadingFallbackMock.mockReset();

    ({ kangurPages, KANGUR_MAIN_PAGE } = await import('@/features/kangur/config/pages'));
  });

  it('keeps Game as the main Kangur page', () => {
    expect(KANGUR_MAIN_PAGE).toBe('Game');
  });

  it('uses shared lazy route fallbacks for every Kangur page while keeping the main page skeleton lighter', () => {
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
    const gameLoadingFallback = dynamicCalls[1]?.loading;
    const lessonsLoadingFallback = dynamicCalls[5]?.loading;

    expect(competitionLoadingFallback).toBeTypeOf('function');
    expect(gameLoadingFallback).toBeTypeOf('function');
    expect(lessonsLoadingFallback).toBeTypeOf('function');

    const NonMainPageLoadingFallback = competitionLoadingFallback;
    const MainPageLoadingFallback = gameLoadingFallback;
    if (!NonMainPageLoadingFallback) {
      throw new Error('Expected the shared non-main loading fallback component.');
    }
    if (!MainPageLoadingFallback) {
      throw new Error('Expected the shared main-page loading fallback component.');
    }

    render(<NonMainPageLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(routeLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });

    cleanup();
    routeLoadingFallbackMock.mockReset();

    render(<MainPageLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(routeLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });

    expect(lessonsLoadingFallback).toBe(competitionLoadingFallback);
    expect(kangurPages['Game']).toBeTypeOf('function');
    expect(kangurPages['Lessons']).toBeTypeOf('function');
  });
});
