"use client";

import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getProducts, countProducts } from "@/features/products/api";
import { useCallback } from "react";

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

export function useProducts(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    enabled,
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products-count", filters],
    queryFn: () => countProducts(filters),
    enabled,
  });
}

export function useProductsWithCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: ["products", filters],
        queryFn: () => getProducts(filters),
        enabled,
      },
      {
        queryKey: ["products-count", filters],
        queryFn: () => countProducts(filters),
        enabled,
      },
    ],
  });

  const [productsQuery, countQuery] = results;

  const refetch = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["products"] }),
      queryClient.refetchQueries({ queryKey: ["products-count"] }),
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
