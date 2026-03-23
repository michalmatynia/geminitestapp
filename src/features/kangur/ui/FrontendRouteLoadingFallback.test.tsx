/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FrontendPublicOwnerProvider } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import {
  clearKangurPendingRouteLoadingSnapshot,
  setKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';

const { kangurRouteLoadingFallbackMock, usePathnameMock } = vi.hoisted(() => ({
  kangurRouteLoadingFallbackMock: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('@/features/kangur/ui/components/KangurRouteLoadingFallback', () => ({
  KangurRouteLoadingFallback: (props: Record<string, unknown>) => {
    kangurRouteLoadingFallbackMock(props);
    return <div data-testid='kangur-route-loading-fallback-probe' />;
  },
}));

import { FrontendRouteLoadingFallback } from '@/features/kangur/ui/FrontendRouteLoadingFallback';

describe('FrontendRouteLoadingFallback', () => {
  beforeEach(() => {
    kangurRouteLoadingFallbackMock.mockReset();
    clearKangurPendingRouteLoadingSnapshot();
    usePathnameMock.mockReturnValue('/en');
  });

  it('suppresses the navbar skeleton for the Kangur main page by default', () => {
    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });
  });

  it('enables the navbar skeleton for non-main Kangur routes by default', () => {
    usePathnameMock.mockReturnValue('/en/lessons');

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });
  });

  it('treats the explicit /kangur alias main page as a no-navbar loader by default', () => {
    usePathnameMock.mockReturnValue('/en/kangur');

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });
  });

  it('enables the navbar skeleton for localized /kangur secondary routes by default', () => {
    usePathnameMock.mockReturnValue('/en/kangur/lessons');

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });
  });

  it('uses the pending transition target instead of the current main-page pathname', () => {
    usePathnameMock.mockReturnValue('/en/kangur');
    setKangurPendingRouteLoadingSnapshot({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });
  });

  it('keeps the navbar skeleton when returning from lessons to the main page', () => {
    usePathnameMock.mockReturnValue('/en/lessons');
    setKangurPendingRouteLoadingSnapshot({
      href: '/en',
      pageKey: 'Game',
      skeletonVariant: 'game-home',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: true,
    });
  });

  it('can still override the auto-detected navbar skeleton mode', () => {
    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback includeTopNavigationSkeleton={false} />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('kangur-route-loading-fallback-probe')).toBeInTheDocument();
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledTimes(1);
    expect(kangurRouteLoadingFallbackMock).toHaveBeenCalledWith({
      includeTopNavigationSkeleton: false,
    });
  });

  it('renders the generic frontend loading fallback when CMS owns the public frontend', () => {
    render(
      <FrontendPublicOwnerProvider publicOwner='cms'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('frontend-route-loading-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-route-loading-fallback-probe')).not.toBeInTheDocument();
  });
});
