'use client';

import {
  useQueries,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { z } from 'zod';

import { getProducts, countProducts } from '@/features/products/api/products';
import type { ProductWithImages } from '@/features/products/types';
import { productSchema } from '@/shared/contracts/products';
import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { isTanstackFactoryV2Enabled } from '@/shared/lib/tanstack-factory-flags';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';

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
  baseExported?: boolean | undefined;
}

export interface UseProductsOptions {
  enabled?: boolean;
}

const PRODUCTS_STALE_MS = 10_000;
const USE_V2_PRODUCT_FACTORIES = isTanstackFactoryV2Enabled('products');

export function useProducts(filters: UseProductsFilters, options?: UseProductsOptions): ListQuery<ProductWithImages> {
  const queryKey = QUERY_KEYS.products.list(filters);
  const queryFn = async (): Promise<ProductWithImages[]> => {
    const data = await getProducts(filters);
    return z.array(productSchema).parse(data) as ProductWithImages[];
  };

  if (USE_V2_PRODUCT_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      staleTime: PRODUCTS_STALE_MS,
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

  return createListQuery({
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    enabled: options?.enabled ?? true,
  });
}

export function useProductsCount(filters: UseProductsFilters, options?: UseProductsOptions): SingleQuery<number> {
  const id = JSON.stringify(filters);
  const queryKey = QUERY_KEYS.products.count(filters);
  const queryFn = async (): Promise<number> => countProducts(filters);

  if (USE_V2_PRODUCT_FACTORIES) {
    return createSingleQueryV2({
      id,
      queryKey,
      queryFn,
      staleTime: PRODUCTS_STALE_MS,
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

  return createSingleQuery({
    id,
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    enabled: options?.enabled ?? true,
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
