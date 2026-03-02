'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';

import { getProducts, countProducts, getProductsWithCount } from '@/features/products/api/products';
import { type ProductWithImages, productSchema } from '@/shared/contracts/products/product';
import { type ProductFilterDto as UseProductsFilters } from '@/shared/contracts/products/filters';

export type { UseProductsFilters };

import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import {
  createListQueryV2,
  createPaginatedListQueryV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { refetchProductsAndCounts } from './productCache';

export interface UseProductsOptions {
  enabled?: boolean;
}

// Trade-off between API load and freshness for product list queries.
// 60s keeps the UI feeling responsive while significantly reducing repeated fetches
// when users navigate in and out of the products pages.
const PRODUCTS_STALE_MS = 60_000;

const getProductsPagedQueryKey = (filters: UseProductsFilters) =>
  [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;

export function useProducts(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): ListQuery<ProductWithImages> {
  const queryKey = QUERY_KEYS.products.list(filters);
  const queryFn = async (): Promise<ProductWithImages[]> => {
    const data = await getProducts(filters);
    return z.array(productSchema).parse(data) as ProductWithImages[];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
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
    },
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): SingleQuery<number> {
  const id = JSON.stringify(filters);
  const queryKey = QUERY_KEYS.products.count(filters);
  const queryFn = async (): Promise<number> => countProducts(filters);

  return createSingleQueryV2({
    id,
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
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
  const enabled = options?.enabled ?? true;
  const prefetchKeyRef = useRef<string>('');

  // Single request replaces the previous two parallel queries (getProducts + countProducts).
  // The query key starts with QUERY_KEYS.products.lists() so refetchProductsAndCounts()
  // invalidates it automatically on mutations.
  const queryKey = useMemo(() => getProductsPagedQueryKey(filters), [filters]);
  const query = createPaginatedListQueryV2<ProductWithImages>({
    id: JSON.stringify(filters) + ':paged',
    queryKey,
    queryFn: async () => {
      const { products, total } = await getProductsWithCount(filters);
      return { items: products, total };
    },
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    enabled,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'products.hooks.useProductsWithCount',
      operation: 'detail',
      resource: 'products.paged',
      domain: 'products',
      queryKey,
      tags: ['products', 'list', 'count'],
    },
  });

  useEffect(() => {
    if (!enabled) return;
    if (!query.data) return;

    const currentPage = typeof filters.page === 'number' && filters.page > 0 ? filters.page : 1;
    const currentPageSize =
      typeof filters.pageSize === 'number' && filters.pageSize > 0 ? filters.pageSize : 20;
    const totalPages = Math.max(1, Math.ceil(query.data.total / currentPageSize));
    if (currentPage >= totalPages) return;

    const nextFilters: UseProductsFilters = {
      ...filters,
      page: currentPage + 1,
      pageSize: currentPageSize,
    };
    const nextQueryKey = getProductsPagedQueryKey(nextFilters);
    const prefetchKey = JSON.stringify(nextQueryKey);
    if (prefetchKeyRef.current === prefetchKey) return;
    prefetchKeyRef.current = prefetchKey;

    if (queryClient.getQueryData(nextQueryKey) !== undefined) return;

    void queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: async () => {
        const { products, total } = await getProductsWithCount(nextFilters);
        return { items: products, total };
      },
      staleTime: PRODUCTS_STALE_MS,
    });
  }, [enabled, filters, query.data, queryClient]);

  const refetch = useCallback(async (): Promise<void> => {
    await refetchProductsAndCounts(queryClient);
  }, [queryClient]);

  return {
    products: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
