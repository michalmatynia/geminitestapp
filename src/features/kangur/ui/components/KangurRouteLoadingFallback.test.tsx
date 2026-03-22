/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

const { kangurPageTransitionSkeletonMock, kangurTopNavigationSkeletonMock } = vi.hoisted(() => ({
  kangurPageTransitionSkeletonMock: vi.fn(),
  kangurTopNavigationSkeletonMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/components/KangurTopNavigationSkeleton', () => ({
  KangurTopNavigationSkeleton: () => {
    kangurTopNavigationSkeletonMock();
    return <div data-testid='kangur-top-navigation-skeleton-probe' />;
  },
}));

import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';

describe('KangurRouteLoadingFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/en/lessons');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('renders the lessons skeleton for localized lesson routes', () => {
    render(<KangurRouteLoadingFallback />);

    expect(screen.getByTestId('kangur-top-navigation-skeleton-probe')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurTopNavigationSkeletonMock).toHaveBeenCalledTimes(1);
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: false,
      variant: 'lessons-library',
    });
  });

  it('keeps the focus skeleton when lesson filters are present in the URL', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('focus=fractions'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: false,
      variant: 'lessons-focus',
    });
  });

  it('keeps the game session skeleton when internal game state is present in the URL', () => {
    usePathnameMock.mockReturnValue('/en');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('kangur=round-2'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: false,
      variant: 'game-session',
    });
  });

  it('can skip the navbar skeleton for in-app lazy page fallbacks', () => {
    render(<KangurRouteLoadingFallback includeTopNavigationSkeleton={false} />);

    expect(screen.queryByTestId('kangur-top-navigation-skeleton-probe')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurTopNavigationSkeletonMock).not.toHaveBeenCalled();
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      renderInlineTopNavigationSkeleton: true,
      variant: 'lessons-library',
    });
  });
});
