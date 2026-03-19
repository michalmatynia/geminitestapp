/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

const kangurPageTransitionSkeletonMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
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
  });

  it('renders the lessons skeleton for localized lesson routes', () => {
    render(<KangurRouteLoadingFallback />);

    expect(screen.getByTestId('kangur-page-transition-skeleton-probe')).toBeInTheDocument();
    expect(kangurPageTransitionSkeletonMock).toHaveBeenCalledWith({
      reason: 'navigation',
      variant: 'lessons-library',
    });
  });
});
