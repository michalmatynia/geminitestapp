/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productRouteLoadingFallbackMock } = vi.hoisted(() => ({
  productRouteLoadingFallbackMock: vi.fn(() => (
    <div data-testid='product-route-loading-fallback-probe' />
  )),
}));

vi.mock('@/features/products/public/ProductRouteLoadingFallback', () => ({
  ProductRouteLoadingFallback: productRouteLoadingFallbackMock,
}));

describe('product loading route wrappers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the dedicated product loading fallback for localized and non-localized routes', async () => {
    const { default: ProductLoading } = await import('@/app/(frontend)/products/[id]/loading');
    const { default: LocalizedProductLoading } = await import(
      '@/app/[locale]/(frontend)/products/[id]/loading'
    );

    render(
      <>
        <ProductLoading />
        <LocalizedProductLoading />
      </>
    );

    expect(screen.getAllByTestId('product-route-loading-fallback-probe')).toHaveLength(2);
    expect(productRouteLoadingFallbackMock).toHaveBeenCalledTimes(2);
  });
});
