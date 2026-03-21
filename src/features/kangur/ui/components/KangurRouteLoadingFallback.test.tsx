/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

const kangurPageTransitionSkeletonMock = vi.fn();

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
    usePathnameMock.mockReturnValue('/en/lessons');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('renders the lessons skeleton for localized lesson routes', () => {
    render(<KangurRouteLoadingFallback />);

    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      variant: 'lessons-library',
    });
  });

  it('keeps the focus skeleton when lesson filters are present in the URL', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('focus=fractions'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      variant: 'lessons-focus',
    });
  });

  it('keeps the game session skeleton when internal game state is present in the URL', () => {
    usePathnameMock.mockReturnValue('/en');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('kangur=round-2'));

    render(<KangurRouteLoadingFallback />);

    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      variant: 'game-session',
    });
  });
});
