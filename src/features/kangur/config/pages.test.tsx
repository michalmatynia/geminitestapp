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
  KangurRouteLoadingFallback: () => {
    routeLoadingFallbackMock();
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

  it('uses the Kangur route loading fallback for every lazy page', () => {
    expect(Object.keys(kangurPages)).toEqual([
      'Competition',
      'Game',
      'Duels',
      'LearnerProfile',
      'Lessons',
      'ParentDashboard',
      'SocialUpdates',
      'Tests',
    ]);
    expect(dynamicCalls).toHaveLength(8);

    const sharedLoadingFallback = dynamicCalls[0]?.loading;
    expect(sharedLoadingFallback).toBeTypeOf('function');
    expect(dynamicCalls.every((call) => call.loading === sharedLoadingFallback)).toBe(true);

    const SharedLoadingFallback = sharedLoadingFallback;
    if (!SharedLoadingFallback) {
      throw new Error('Expected a shared loading fallback component.');
    }

    render(<SharedLoadingFallback />);

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(routeLoadingFallbackMock).toHaveBeenCalledTimes(1);
  });
});
