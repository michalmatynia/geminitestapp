'use client';
'use no memo';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  type UseProductsFilters,
  type UseProductsOptions,
  useProducts as useProductsQuery,
  useProductsCount as useProductsCountQuery,
  useProductsWithCount,
} from '@/features/products/hooks/useProductsQuery';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { refetchProductsAndCounts } from './productCache';
import { useProductDataActions } from './useProductData.actions';
import { useProductDataEffects } from './useProductData.effects';
import { useProductDataFilters } from './useProductData.filters';
import { useProductDataQueryMeta } from './useProductData.query';
import { useProductDataState } from './useProductData.state';
import type { ProductDataHookResult, UseProductDataProps } from './useProductData.types';
import { createProductDataResult } from './useProductData.value';

// --- Queries ---

export type { UseProductsFilters };
export type { ProductDataHookResult, UseProductDataProps };

export function useProducts(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
): ListQuery<ProductWithImages> {
  return useProductsQuery(filters, options);
}

export function useProductsCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
): SingleQuery<number> {
  return useProductsCountQuery(filters, options);
}

// --- Composite Hook ---

export function useProductData(props: UseProductDataProps): ProductDataHookResult {
  const queryClient = useQueryClient();
  const state = useProductDataState(props);
  const { filters, effectivePageSize, parsedMatchProductIdsKey } = useProductDataFilters(
    state,
    props.searchLanguage
  );

  const productsWithCountQuery = useProductsWithCount(filters, {
    enabled: state.filtersInitialized,
    prefetchNextPage: state.page > 1,
  });
  const { loadError, totalPages } = useProductDataQueryMeta({
    effectivePageSize,
    error: productsWithCountQuery.error,
    total: productsWithCountQuery.total,
  });
  const refresh = useCallback(() => {
    void refetchProductsAndCounts(queryClient);
  }, [queryClient]);
  const actions = useProductDataActions({ ...state, queryClient });

  useProductDataEffects({ ...props, ...state, parsedMatchProductIdsKey, refresh, totalPages });
  return createProductDataResult({
    actions,
    data: productsWithCountQuery.products,
    isFetching: productsWithCountQuery.isFetching,
    isLoading: productsWithCountQuery.isLoading,
    loadError,
    refresh,
    state,
    totalPages,
  });
}
