'use client';

import {
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { z } from 'zod';

import { getProducts, countProducts, getProductsWithCount } from '@/features/products/api/products';
import type { ProductWithImages } from '@/shared/contracts/products';
import { productSchema } from '@/shared/contracts/products';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
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
  baseExported?: boolean | undefined;
}

export interface UseProductsOptions {
  enabled?: boolean;
}

const PRODUCTS_STALE_MS = 10_000;

export function useProducts(filters: UseProductsFilters, options?: UseProductsOptions): ListQuery<ProductWithImages> {
  const queryKey = QUERY_KEYS.products.list(filters);
  const queryFn = async (): Promise<ProductWithImages[]> => {
    const data = await getProducts(filters);
    return z.array(productSchema).parse(data) as ProductWithImages[];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: 'always',
    enabled: options?.enabled ?? true,
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

export function useProductsCount(filters: UseProductsFilters, options?: UseProductsOptions): SingleQuery<number> {
  const id = JSON.stringify(filters);
  const queryKey = QUERY_KEYS.products.count(filters);
  const queryFn = async (): Promise<number> => countProducts(filters);

  return createSingleQueryV2({
    id,
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: 'always',
    enabled: options?.enabled ?? true,
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
  options: UseProductsOptions = {},
): {
    products: ProductWithImages[];
    total: number;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => Promise<void>;
  } {
  const queryClient = useQueryClient();

  // Single request replaces the previous two parallel queries (getProducts + countProducts).
  // The query key starts with QUERY_KEYS.products.lists() so refetchProductsAndCounts()
  // invalidates it automatically on mutations.
  const queryKey = [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;
  const query = createSingleQueryV2({
    id: JSON.stringify(filters) + ':paged',
    queryKey,
    queryFn: async (): Promise<{ products: ProductWithImages[]; total: number }> =>
      getProductsWithCount(filters),
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: 'always',
    enabled: options?.enabled ?? true,
    meta: {
      source: 'products.hooks.useProductsWithCount',
      operation: 'detail',
      resource: 'products.paged',
      domain: 'products',
      queryKey,
      tags: ['products', 'list', 'count'],
    },
  });

  const refetch = useCallback(async (): Promise<void> => {
    await refetchProductsAndCounts(queryClient);
  }, [queryClient]);

  return {
    products: query.data?.products ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
