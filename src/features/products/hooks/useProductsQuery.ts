'use client';

// Client-side product query hooks: encapsulates TanStack Query factories
// and parsing/normalization for product list/detail payloads. Prefer
// useProductsWithCount for a single request that returns items + total.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { z } from 'zod';

import { getProducts, countProducts } from '@/features/products/api/products';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import { type ProductFilter as UseProductsFilters } from '@/shared/contracts/products/filters';
import {
  type ProductWithImages,
  productSchema,
} from '@/shared/contracts/products/product';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import {
  createListQueryV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { refetchProductsAndCounts } from './productCache';
import {
  getProductsPagedQueryKey,
  useProductsNextPagePrefetch,
  useProductsPagedQuery,
} from './useProductsQuery.paged';
import { useProductsPagedDebugLogging } from './useProductsPagedDebugLogging';

export type { UseProductsFilters };

export interface UseProductsOptions {
  enabled?: boolean;
  prefetchNextPage?: boolean;
}

// Trade-off between API load and freshness for product list queries.
// 60s keeps the UI feeling responsive while significantly reducing repeated fetches
// when users navigate in and out of the products pages.
const PRODUCTS_STALE_MS = 60_000;

export function useProducts(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): ListQuery<ProductWithImages> {
  const queryKey = QUERY_KEYS.products.list(filters);
  const queryFn = async (context: { signal: AbortSignal }): Promise<ProductWithImages[]> => {
    const data = await getProducts(filters, context.signal);
    return z.array(productSchema).parse(data) as ProductWithImages[];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: options?.enabled ?? true,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
      domain: 'products',
      queryKey,
      tags: ['products', 'list'],
      description: 'Loads products for the current filters.',
    },
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): SingleQuery<number> {
  const id = JSON.stringify(filters);
  const queryKey = QUERY_KEYS.products.count(filters);
  const queryFn = async (context: { signal: AbortSignal }): Promise<number> =>
    countProducts(filters, context.signal);

  return createSingleQueryV2({
    id,
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: options?.enabled ?? true,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products count.'),
    meta: {
      source: 'products.hooks.useProductsCount',
      operation: 'detail',
      resource: 'products.count',
      domain: 'products',
      queryKey,
      tags: ['products', 'count'],
      description: 'Loads the product count for the current filters.',
    },
  });
}

export function useProductsWithCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
): {
  products: ProductWithImages[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const shouldPrefetchNextPage = options.prefetchNextPage ?? true;
  const prefetchKeyRef = useRef<string>('');

  // Single request replaces the previous two parallel queries (getProducts + countProducts).
  // The query key starts with QUERY_KEYS.products.lists() so refetchProductsAndCounts()
  // invalidates it automatically on mutations.
  const queryKey = useMemo(() => getProductsPagedQueryKey(filters), [filters]);
  const query = useProductsPagedQuery({ enabled, filters, queryKey });

  useProductsNextPagePrefetch({
    enabled,
    filters,
    prefetchKeyRef,
    queryClient,
    queryData: query.data,
    shouldPrefetchNextPage,
  });

  const debugQueryKey = useProductsPagedDebugLogging({
    enabled,
    queryKey,
    query,
  });

  const refetch = useCallback(async (): Promise<void> => {
    logProductListDebug(
      'paged-query-refetch-requested',
      {
        queryKey: debugQueryKey,
      },
      { dedupeKey: 'paged-query-refetch-requested', throttleMs: 250 }
    );
    await refetchProductsAndCounts(queryClient);
  }, [debugQueryKey, queryClient]);

  return {
    products: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
