/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearKangurPendingRouteLoadingSnapshot,
  setKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

const { kangurPageTransitionSkeletonMock } = vi.hoisted(() => ({
  kangurPageTransitionSkeletonMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('@/features/kangur/ui/components/KangurPageTransitionSkeleton', () => ({
  KangurPageTransitionSkeleton: (props: Record<string, unknown>) => {
    kangurPageTransitionSkeletonMock(props);
    return <div data-testid='kangur-page-transition-skeleton-probe' />;
  },
}));

import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';

describe('KangurRouteLoadingFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurPendingRouteLoadingSnapshot();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    usePathnameMock.mockReturnValue('/en/lessons');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('renders the lessons skeleton for localized lesson routes', () => {
    render(<KangurRouteLoadingFallback />);

    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: undefined,
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: null,
      variant: 'lessons-library',
    });
  });

  it('keeps the focus skeleton when lesson filters are present in the URL', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('focus=fractions'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: undefined,
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: null,
      variant: 'lessons-focus',
    });
  });

  it('keeps the game session skeleton when internal game state is present in the URL', () => {
    usePathnameMock.mockReturnValue('/en');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('kangur=round-2'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: undefined,
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: null,
      variant: 'game-session',
    });
  });

  it('can skip the navbar skeleton for in-app lazy page fallbacks', () => {
    render(<KangurRouteLoadingFallback includeTopNavigationSkeleton={false} />);

    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: undefined,
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: false,
      topBarHeightCssValue: null,
      variant: 'lessons-library',
    });
  });

  it('passes the current top-bar height through to the first route fallback frame', () => {
    document.documentElement.style.setProperty('--kangur-top-bar-height', '136px');

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: undefined,
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: '136px',
      variant: 'lessons-library',
    });
  });

  it('prefers the pending transition snapshot over the current pathname', () => {
    usePathnameMock.mockReturnValue('/en/kangur');
    setKangurPendingRouteLoadingSnapshot({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: '136px',
      variant: 'lessons-library',
    });
  });
});
