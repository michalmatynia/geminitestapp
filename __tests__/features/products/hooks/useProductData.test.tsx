/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useProductsQueryMocks = vi.hoisted(() => ({
  useProducts: vi.fn(),
  useProductsCount: vi.fn(),
  useProductsWithCount: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductsQuery', () => useProductsQueryMocks);

import { useProductData } from '@/features/products/hooks/useProductData';

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useProductData', () => {
  let queryClient: QueryClient;
  let mockResult: {
    products: unknown[];
    total: number;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
  };

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockResult = {
      products: [],
      total: 30,
      isLoading: false,
      isFetching: false,
      error: null,
    };

    useProductsQueryMocks.useProducts.mockReset();
    useProductsQueryMocks.useProductsCount.mockReset();
    useProductsQueryMocks.useProductsWithCount.mockReset();
    useProductsQueryMocks.useProductsWithCount.mockImplementation(() => ({
      ...mockResult,
      refetch: vi.fn().mockResolvedValue(undefined),
    }));
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('uses the combined paged query and derives total pages from the total', async () => {
    const { result } = renderHook(
      () =>
        useProductData({
          preferencesLoaded: true,
          initialPageSize: 10,
        }),
      { wrapper }
    );

    await waitFor(() =>
      expect(useProductsQueryMocks.useProductsWithCount).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
        expect.objectContaining({ enabled: true })
      )
    );

    expect(useProductsQueryMocks.useProducts).not.toHaveBeenCalled();
    expect(useProductsQueryMocks.useProductsCount).not.toHaveBeenCalled();
    expect(result.current.totalPages).toBe(3);
  });

  it('resets the page back to 1 when filters change', async () => {
    const { result } = renderHook(
      () =>
        useProductData({
          preferencesLoaded: true,
          initialPageSize: 10,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.page).toBe(1));

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => {
      result.current.setSearch('shoe');
    });

    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() =>
      expect(useProductsQueryMocks.useProductsWithCount).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'shoe',
          page: 1,
          pageSize: 10,
        }),
        expect.objectContaining({ enabled: true })
      )
    );
  });

  it('clamps the current page when the total shrinks below it', async () => {
    const { result, rerender } = renderHook(
      () =>
        useProductData({
          preferencesLoaded: true,
          initialPageSize: 10,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.page).toBe(1));

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.page).toBe(3));

    mockResult.total = 15;
    rerender();

    await waitFor(() => expect(result.current.totalPages).toBe(2));
    await waitFor(() => expect(result.current.page).toBe(2));
  });
});
