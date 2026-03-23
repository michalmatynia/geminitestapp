/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FrontendPublicOwnerProvider } from '@/features/kangur/ui/FrontendPublicOwnerContext';

const kangurRouteLoadingFallbackMock = vi.fn();

vi.mock('@/features/kangur/ui/components/KangurRouteLoadingFallback', () => ({
  KangurRouteLoadingFallback: (props: Record<string, unknown>) => {
    kangurRouteLoadingFallbackMock(props);
    return <div data-testid='kangur-route-loading-fallback-probe' />;
  },
}));

import { FrontendRouteLoadingFallback } from '@/features/kangur/ui/FrontendRouteLoadingFallback';

describe('FrontendRouteLoadingFallback', () => {
  it('renders the Kangur loading fallback when Kangur owns the public frontend', () => {
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
