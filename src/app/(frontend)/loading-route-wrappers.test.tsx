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
  });

  it('renders route-specific CMS fallbacks for product and preview loaders', async () => {
    const { default: ProductLoading } = await import('@/app/(frontend)/products/[id]/loading');
    const { default: PreviewLoading } = await import('@/app/(frontend)/preview/[id]/loading');
    const { default: LocalizedProductLoading } = await import(
      '@/app/[locale]/(frontend)/products/[id]/loading'
    );
    const { default: LocalizedPreviewLoading } = await import(
      '@/app/[locale]/(frontend)/preview/[id]/loading'
    );

    render(
      <>
        <ProductLoading />
        <PreviewLoading />
        <LocalizedProductLoading />
        <LocalizedPreviewLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-cms-route-loading-fallback-probe')).toHaveLength(4);
    expect(frontendCmsRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { pathname: '/products/loading' },
      { pathname: '/preview/loading' },
      { pathname: '/en/products/loading' },
      { pathname: '/en/preview/loading' },
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
  });
});
