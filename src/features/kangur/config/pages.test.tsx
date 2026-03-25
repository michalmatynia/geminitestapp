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

  it('uses the inline main-page loader only for Game and the navbar skeleton for the rest', () => {
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

    expect(competitionLoadingFallback).toBeTypeOf('function');
    expect(gameLoadingFallback).toBeTypeOf('function');
    expect(gameLoadingFallback).not.toBe(competitionLoadingFallback);

    const nonMainPageLoadingFallbacks = dynamicCalls
      .filter((_call, index) => index !== 1)
      .map((call) => call.loading);
    expect(nonMainPageLoadingFallbacks.every((loading) => loading === competitionLoadingFallback)).toBe(
      true
    );

    const MainPageLoadingFallback = gameLoadingFallback;
    if (!MainPageLoadingFallback) {
      throw new Error('Expected the Game loading fallback component.');
    }

    render(<MainPageLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(routeLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });

    cleanup();
    routeLoadingFallbackMock.mockReset();

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
  });
});
