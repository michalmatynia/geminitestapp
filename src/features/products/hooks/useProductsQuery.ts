'use client';

import {
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { z } from 'zod';

import { getProducts, countProducts } from '@/features/products/api/products';
import type { ProductWithImages } from '@/features/products/types';
import { productSchema } from '@/shared/contracts/products';
import { createQueryHook } from '@/shared/lib/api-hooks';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  getProductCountQueryKey,
  getProductListQueryKey,
  refetchProductsAndCounts,
} from './productCache';

export interface UseProductsFilters {
  search?: string | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
}

export interface UseProductsOptions {
  enabled?: boolean;
}

const PRODUCTS_STALE_MS = 10_000;


export const useProducts = (filters: UseProductsFilters, options?: UseProductsOptions): UseQueryResult<ProductWithImages[], Error> => {
  return _useProducts(filters, options) as UseQueryResult<ProductWithImages[], Error>;
};

const _useProducts = createQueryHook({
  queryKeyFactory: (filters: UseProductsFilters) => QUERY_KEYS.products.list(filters),
  endpoint: '/api/products',
  schema: z.array(productSchema), 
  staleTime: PRODUCTS_STALE_MS,
  apiOptions: { cache: 'no-store' },
});

export const useProductsCount = createQueryHook({
  queryKeyFactory: (filters: UseProductsFilters) => QUERY_KEYS.products.count(filters),
  endpoint: '/api/products/count',
  schema: z.object({ count: z.number() }).transform(d => d.count),
  staleTime: PRODUCTS_STALE_MS,
  apiOptions: { cache: 'no-store' },
});

export function useProductsWithCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {},
): {
    products: ProductWithImages[];
    total: number;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => Promise<void>;
  } {

  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: normalizeQueryKey(getProductListQueryKey(filters)),
        queryFn: ({ signal }): Promise<ProductWithImages[]> => getProducts(filters, signal),
        enabled,
        staleTime: PRODUCTS_STALE_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      {
        queryKey: normalizeQueryKey(getProductCountQueryKey(filters)),
        queryFn: ({ signal }): Promise<number> => countProducts(filters, signal),
        enabled,
        staleTime: PRODUCTS_STALE_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ],
  });

  const [productsQuery, countQuery] = results;

  const refetch = useCallback(async (): Promise<void> => {
    await refetchProductsAndCounts(queryClient);
  }, [queryClient]);

  return {
    products: productsQuery.data ?? [],
    total: countQuery.data ?? 0,
    isLoading: productsQuery.isPending || countQuery.isPending,
    isFetching: productsQuery.isFetching || countQuery.isFetching,
    error: productsQuery.error || countQuery.error,
    refetch,
  };
}
