// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api-client';

const {
  fetchProductListingsMock,
  logClientCatchMock,
} = vi.hoisted(() => ({
  fetchProductListingsMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/features/products/lib/product-integrations-adapter-loader', () => ({
  loadProductIntegrationsAdapter: () =>
    Promise.resolve({
      fetchProductListings: (...args: unknown[]) =>
        fetchProductListingsMock(...args) as Promise<unknown>,
      productListingsQueryKey: (productId: string) =>
        ['integrations', 'listings', productId] as const,
    }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/utils/observability/client-error-logger')>();
  return {
    ...actual,
    logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  };
});

import { useProductListIntegrations } from './useProductListIntegrations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useProductListIntegrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores missing-product errors while prefetching listings', async () => {
    fetchProductListingsMock.mockRejectedValue(new ApiError('Product not found', 404));

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProductListIntegrations(), { wrapper });

    await act(async () => {
      result.current.prefetchProductListingsData('missing-product');
    });

    await waitFor(() => {
      expect(fetchProductListingsMock).toHaveBeenCalledWith('missing-product');
    });
    expect(logClientCatchMock).not.toHaveBeenCalled();
  });

  it('ignores missing-product errors while refreshing listings', async () => {
    fetchProductListingsMock.mockRejectedValue(new ApiError('Product not found', 404));

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProductListIntegrations(), { wrapper });

    await act(async () => {
      result.current.refreshProductListingsData('missing-product');
    });

    await waitFor(() => {
      expect(fetchProductListingsMock).toHaveBeenCalledWith('missing-product');
    });
    expect(logClientCatchMock).not.toHaveBeenCalled();
  });
});
