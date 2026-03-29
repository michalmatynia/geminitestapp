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

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
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
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
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
      fromHref: '/en/kangur',
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
      fromHref: '/en/lessons',
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

  it('treats blocked GamesLibrary routes like the main game route for non-super-admin users', () => {
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

    render(
      <FrontendPublicOwnerProvider publicOwner='kangur'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

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
    expect(screen.getByTestId('frontend-route-loading-fallback-home')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-route-loading-fallback-probe')).not.toBeInTheDocument();
  });

  it('renders the product-page skeleton when CMS owns a product route', () => {
    usePathnameMock.mockReturnValue('/en/products/sku-123');

    render(
      <FrontendPublicOwnerProvider publicOwner='cms'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('frontend-route-loading-fallback')).toHaveAttribute(
      'data-frontend-route-loading-variant',
      'product'
    );
    expect(screen.getByTestId('frontend-route-loading-fallback-product')).toBeInTheDocument();
  });

  it('renders the preview-page skeleton when CMS owns a preview route', () => {
    usePathnameMock.mockReturnValue('/en/preview/page-42');

    render(
      <FrontendPublicOwnerProvider publicOwner='cms'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('frontend-route-loading-fallback')).toHaveAttribute(
      'data-frontend-route-loading-variant',
      'preview'
    );
    expect(screen.getByTestId('frontend-route-loading-fallback-preview')).toBeInTheDocument();
  });

  it('renders the generic CMS page skeleton for non-home CMS routes', () => {
    usePathnameMock.mockReturnValue('/en/about');

    render(
      <FrontendPublicOwnerProvider publicOwner='cms'>
        <FrontendRouteLoadingFallback />
      </FrontendPublicOwnerProvider>
    );

    expect(screen.getByTestId('frontend-route-loading-fallback')).toHaveAttribute(
      'data-frontend-route-loading-variant',
      'page'
    );
    expect(screen.getByTestId('frontend-route-loading-fallback-page')).toBeInTheDocument();
  });
});
