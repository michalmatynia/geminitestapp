/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { frontendRouteLoadingFallbackMock } = vi.hoisted(() => ({
  frontendRouteLoadingFallbackMock: vi.fn(() => (
    <div data-testid='frontend-route-loading-fallback-probe' />
  )),
}));

const { frontendCmsRouteLoadingFallbackMock } = vi.hoisted(() => ({
  frontendCmsRouteLoadingFallbackMock: vi.fn(
    ({ pathname }: { pathname?: string }) => (
      <div data-testid='frontend-cms-route-loading-fallback-probe'>{pathname ?? 'unknown'}</div>
    )
  ),
}));

vi.mock('@/features/kangur/ui/FrontendRouteLoadingFallback', () => ({
  FrontendRouteLoadingFallback: frontendRouteLoadingFallbackMock,
}));

vi.mock('@/features/kangur/ui/components/FrontendCmsRouteLoadingFallback', () => ({
  FrontendCmsRouteLoadingFallback: frontendCmsRouteLoadingFallbackMock,
}));

describe('frontend loading route wrappers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the shared loading fallback for the root frontend wrappers', async () => {
    const { default: FrontendLoading } = await import('@/app/(frontend)/loading');
    const { default: KangurLoading } = await import('@/app/(frontend)/kangur/loading');

    render(
      <>
        <FrontendLoading />
        <KangurLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendRouteLoadingFallbackMock).toHaveBeenCalledTimes(2);
    expect(frontendRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { cmsVariant: 'home' },
      {},
    ]);
  });

  it('renders route-specific CMS fallbacks for remaining standalone public loaders', async () => {
    const { default: LoginLoading } = await import('@/app/(frontend)/login/loading');
    const { default: LocalizedLoginLoading } = await import(
      '@/app/[locale]/(frontend)/login/loading'
    );

    render(
      <>
        <LoginLoading />
        <LocalizedLoginLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-cms-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendCmsRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { pathname: null, variant: 'page' },
      { pathname: null, variant: 'page' },
    ]);
  });

  it('renders the shared loading fallback for the localized frontend wrappers', async () => {
    const { default: LocalizedFrontendLoading } = await import('@/app/[locale]/(frontend)/loading');
    const { default: LocalizedKangurLoading } = await import(
      '@/app/[locale]/(frontend)/kangur/loading'
    );

    render(
      <>
        <LocalizedFrontendLoading />
        <LocalizedKangurLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendRouteLoadingFallbackMock).toHaveBeenCalledTimes(2);
    expect(frontendRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { cmsVariant: 'home' },
      {},
    ]);
  });

  it('passes the page variant through the catch-all frontend wrappers', async () => {
    const { default: FrontendSlugLoading } = await import('@/app/(frontend)/[...slug]/loading');
    const { default: LocalizedFrontendSlugLoading } = await import(
      '@/app/[locale]/(frontend)/[...slug]/loading'
    );

    render(
      <>
        <FrontendSlugLoading />
        <LocalizedFrontendSlugLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { cmsVariant: 'page', includeTopNavigationSkeleton: true },
      { cmsVariant: 'page', includeTopNavigationSkeleton: true },
    ]);
  });
});
