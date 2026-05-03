/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useUpdateProductMutation } from '@/features/products/hooks/useProductDataMutations';

const mocks = vi.hoisted(() => ({
  useOfflineMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/shared/hooks/offline/useOfflineMutation', () => ({
  useOfflineMutation: mocks.useOfflineMutation,
}));

describe('useUpdateProductMutation', () => {
  it('uses list/detail/count invalidation scope instead of products.all', () => {
    renderHook(() => useUpdateProductMutation());

    expect(mocks.useOfflineMutation).toHaveBeenCalledTimes(1);
    const options = mocks.useOfflineMutation.mock.calls[0]?.[1] as {
      queryKey: readonly unknown[];
      extraInvalidateKeys: (variables: { id: string; data: unknown }) => readonly unknown[][];
    };

    expect(options.queryKey).toEqual(QUERY_KEYS.products.lists());
    const extraKeys = options.extraInvalidateKeys({ id: 'product-1', data: {} });
    expect(extraKeys).toEqual([QUERY_KEYS.products.counts(), QUERY_KEYS.products.detail('product-1')]);
  });

  it('patches paginated product list caches that store items arrays', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useUpdateProductMutation());

      const options = mocks.useOfflineMutation.mock.calls[0]?.[1] as {
        invalidate: (
          queryClient: {
            setQueryData: (key: readonly unknown[], updater: (old: unknown) => unknown) => void;
            setQueriesData: (
              filters: { queryKey: readonly unknown[] },
              updater: (old: unknown) => unknown
            ) => void;
            invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<void>;
          },
          savedProduct: ProductWithImages
        ) => Promise<void>;
      };

      const initialListCache = {
        items: [
          {
            id: 'product-1',
            categoryId: null,
            catalogId: 'catalog-1',
            sku: 'SKU-1',
          },
        ],
        total: 1,
      };

      const savedProduct = {
        id: 'product-1',
        categoryId: 'category-1',
        catalogId: 'catalog-1',
        sku: 'SKU-1',
      } as ProductWithImages;

      const setQueryData = vi.fn();
      const setQueriesData = vi.fn((_filters, updater: (old: unknown) => unknown) =>
        updater(initialListCache)
      );
      const invalidateQueries = vi.fn().mockResolvedValue(undefined);

      await options.invalidate(
        {
          setQueryData,
          setQueriesData,
          invalidateQueries,
        },
        savedProduct
      );
      await vi.runAllTimersAsync();

      expect(setQueriesData).toHaveBeenCalledTimes(2);
      const patchedListCache = setQueriesData.mock.results[0]?.value as {
        items: Array<{ id: string; categoryId: string | null }>;
        total: number;
      };
      expect(patchedListCache.items[0]).toMatchObject({
        id: 'product-1',
        categoryId: 'category-1',
        catalogId: 'catalog-1',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
