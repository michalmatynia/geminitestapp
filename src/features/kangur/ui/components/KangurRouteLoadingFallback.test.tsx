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

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

const { kangurPageTransitionSkeletonMock } = vi.hoisted(() => ({
  kangurPageTransitionSkeletonMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
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
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
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
      embeddedOverride: false,
      pageKey: 'Lessons',
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
      embeddedOverride: false,
      pageKey: 'Lessons',
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
      embeddedOverride: true,
      pageKey: 'Game',
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
      embeddedOverride: false,
      pageKey: 'Lessons',
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
      embeddedOverride: false,
      pageKey: 'Lessons',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: '136px',
      variant: 'lessons-library',
    });
  });

  it('prefers the pending transition snapshot over the current pathname', () => {
    usePathnameMock.mockReturnValue('/en/kangur');
    setKangurPendingRouteLoadingSnapshot({
      fromHref: '/en/kangur',
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      embeddedOverride: false,
      pageKey: 'Lessons',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: '136px',
      variant: 'lessons-library',
    });
  });

  it('forces the first home-route fallback to stay embedded while loading the home page', () => {
    usePathnameMock.mockReturnValue('/en');

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      embeddedOverride: true,
      pageKey: 'Game',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: null,
      variant: 'game-home',
    });
  });

  it('keeps standalone geometry when a lessons route is transitioning back to the home page', () => {
    usePathnameMock.mockReturnValue('/en/lessons');
    setKangurPendingRouteLoadingSnapshot({
      fromHref: '/en/lessons',
      href: '/en',
      pageKey: 'Game',
      skeletonVariant: 'game-home',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      embeddedOverride: false,
      pageKey: 'Game',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: '136px',
      variant: 'game-home',
    });
  });

  it('downgrades blocked GamesLibrary routes to the game-home skeleton for non-super-admin users', () => {
    usePathnameMock.mockReturnValue('/en/games');
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      embeddedOverride: false,
      pageKey: 'Game',
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      topBarHeightCssValue: null,
      variant: 'game-home',
    });
  });
});
