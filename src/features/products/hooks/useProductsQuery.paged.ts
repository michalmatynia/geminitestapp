'use client';

import { type QueryClient } from '@tanstack/react-query';
import { useEffect, type MutableRefObject } from 'react';

import { getProductsWithCount } from '@/features/products/api/products';
import { type ProductFilter as UseProductsFilters } from '@/shared/contracts/products/filters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import {
  createPaginatedListQueryV2,
  prefetchQueryV2,
  type PaginatedResult,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { parseProductsPagedResult } from './useProductsQuery.normalize';

const PRODUCTS_STALE_MS = 60_000;

export const getProductsPagedQueryKey = (filters: UseProductsFilters) =>
  [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;

type ProductsPagedQueryKey = ReturnType<typeof getProductsPagedQueryKey>;
type ProductsPagedQuery = SingleQuery<PaginatedResult<ProductWithImages>>;
type ProductsPagedQueryResult = { items: ProductWithImages[]; total: number };
type ProductsPagedQueryContext = { signal: AbortSignal };

const fetchProductsPagedResult = async (
  filters: UseProductsFilters,
  signal: AbortSignal,
  action: string
): Promise<ProductsPagedQueryResult> => {
  try {
    const { products, total } = parseProductsPagedResult(
      await getProductsWithCount(filters, signal)
    );
    return { items: products, total };
  } catch (error) {
    logClientCatch(error, {
      source: 'products.hooks.useProductsWithCount',
      action,
      filters,
    });
    throw error;
  }
};

const createProductsPagedQueryFn =
  (
    filters: UseProductsFilters,
    action: string
  ): ((context: ProductsPagedQueryContext) => Promise<ProductsPagedQueryResult>) =>
  async (context: ProductsPagedQueryContext): Promise<ProductsPagedQueryResult> =>
    await fetchProductsPagedResult(filters, context.signal, action);

const resolvePositivePageValue = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && value > 0 ? value : fallback;

const resolveNextPageFilters = (
  filters: UseProductsFilters,
  total: number
): UseProductsFilters | null => {
  const currentPage = resolvePositivePageValue(filters.page, 1);
  const currentPageSize = resolvePositivePageValue(filters.pageSize, 20);
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentPage >= totalPages) return null;
  return { ...filters, page: currentPage + 1, pageSize: currentPageSize };
};

const shouldSkipProductsPagePrefetch = (input: {
  enabled: boolean;
  queryData: ProductsPagedQueryResult | undefined;
  shouldPrefetchNextPage: boolean;
}): boolean =>
  input.enabled === false ||
  input.shouldPrefetchNextPage === false ||
  input.queryData === undefined;

const prefetchProductsPage = (input: {
  currentPrefetchKey: string;
  nextFilters: UseProductsFilters;
  queryClient: QueryClient;
  setPrefetchKey: (prefetchKey: string) => void;
}): void => {
  const nextQueryKey = getProductsPagedQueryKey(input.nextFilters);
  const prefetchKey = JSON.stringify(nextQueryKey);
  if (input.currentPrefetchKey === prefetchKey) return;
  input.setPrefetchKey(prefetchKey);
  if (input.queryClient.getQueryData(nextQueryKey) !== undefined) return;

  void prefetchQueryV2(input.queryClient, {
    queryKey: nextQueryKey,
    queryFn: createProductsPagedQueryFn(input.nextFilters, 'prefetchQueryFn'),
    staleTime: PRODUCTS_STALE_MS,
    meta: {
      source: 'products.hooks.useProductsWithCount.prefetch',
      operation: 'list',
      resource: 'products.paged',
      domain: 'products',
      queryKey: nextQueryKey,
      tags: ['products', 'list', 'prefetch'],
      description: 'Prefetches the next product page and count.',
    },
  })();
};

export const useProductsNextPagePrefetch = (input: {
  enabled: boolean;
  filters: UseProductsFilters;
  prefetchKeyRef: MutableRefObject<string>;
  queryClient: QueryClient;
  queryData: ProductsPagedQueryResult | undefined;
  shouldPrefetchNextPage: boolean;
}): void => {
  const { enabled, filters, prefetchKeyRef, queryClient, queryData, shouldPrefetchNextPage } =
    input;

  useEffect(() => {
    if (shouldSkipProductsPagePrefetch({ enabled, queryData, shouldPrefetchNextPage })) return;
    const nextFilters = resolveNextPageFilters(filters, queryData.total);
    if (nextFilters === null) return;
    prefetchProductsPage({
      currentPrefetchKey: prefetchKeyRef.current,
      nextFilters,
      queryClient,
      setPrefetchKey: (prefetchKey: string): void => {
        prefetchKeyRef.current = prefetchKey;
      },
    });
  }, [enabled, filters, prefetchKeyRef, queryClient, queryData, shouldPrefetchNextPage]);
};

export const useProductsPagedQuery = (input: {
  enabled: boolean;
  filters: UseProductsFilters;
  queryKey: ProductsPagedQueryKey;
}): ProductsPagedQuery =>
  createPaginatedListQueryV2<ProductWithImages>({
    id: `${JSON.stringify(input.filters)}:paged`,
    queryKey: input.queryKey,
    queryFn: createProductsPagedQueryFn(input.filters, 'queryFn'),
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: input.enabled,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'products.hooks.useProductsWithCount',
      operation: 'list',
      resource: 'products.paged',
      domain: 'products',
      queryKey: input.queryKey,
      tags: ['products', 'list', 'count'],
      description: 'Loads paginated products and total count for the current filters.',
    },
  });
