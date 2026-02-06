'use client';

import {
  useQuery,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProducts, countProducts } from '@/features/products/api';
import type { ProductWithImages } from '@/features/products/types';

interface UseProductsFilters {
  search?: string | undefined;
  sku?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
}

interface UseProductsOptions {
  enabled?: boolean;
}

const PRODUCTS_STALE_MS = 10_000;

export function useProducts(
  filters: UseProductsFilters,
  options: UseProductsOptions = {},
): UseQueryResult<ProductWithImages[], Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    enabled,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    networkMode: 'always',
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {},
): UseQueryResult<number, Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['products-count', filters],
    queryFn: () => countProducts(filters),
    enabled,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    networkMode: 'always',
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
        queryKey: ['products', filters],
        queryFn: (): Promise<ProductWithImages[]> => getProducts(filters),
        enabled,
        staleTime: PRODUCTS_STALE_MS,
      },
      {
        queryKey: ['products-count', filters],
        queryFn: (): Promise<number> => countProducts(filters),
        enabled,
        staleTime: PRODUCTS_STALE_MS,
      },
    ],
  });

  const [productsQuery, countQuery] = results;

  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['products'] }),
      queryClient.refetchQueries({ queryKey: ['products-count'] }),
    ]);
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
