'use client';
'use no memo';

import { useCallback } from 'react';

import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import { refetchProductsAndCounts } from './productCache';
import { normalizeProductIdList } from './useProductData.helpers';
import type { ProductDataActions, ProductDataActionsInput } from './useProductData.types';

export const useProductDataActions = (input: ProductDataActionsInput): ProductDataActions => {
  const setPageSize = useCallback(
    (size: number): void => input.setPageSize(normalizeProductPageSize(size, 20)),
    [input]
  );
  const setAdvancedFilterState = useCallback((value: string, presetId: string | null): void => {
    const normalizedValue = value.trim();
    input.setAdvancedFilter(normalizedValue);
    input.setActiveAdvancedFilterPresetId(normalizedValue.length > 0 ? presetId : null);
  }, [input]);
  const setAdvancedFilter = useCallback(
    (value: string): void => setAdvancedFilterState(value, null),
    [setAdvancedFilterState]
  );
  const setParsedMatchProductIds = useCallback((ids: string[]): void => {
    const normalizedIds = normalizeProductIdList(ids);
    input.setPage(1);
    input.setParsedMatchProductIdsState(normalizedIds);
    if (normalizedIds.length > 0) {
      void refetchProductsAndCounts(input.queryClient);
    }
  }, [input]);
  const clearParsedMatchProductIds = useCallback((): void => {
    input.setParsedMatchProductIdsState([]);
  }, [input]);

  return { setPage: input.setPage, setPageSize, setSearch: input.setSearch,
    setProductId: input.setProductId, setIdMatchMode: input.setIdMatchMode, setSku: input.setSku,
    setDescription: input.setDescription, setCategoryId: input.setCategoryId,
    setMinPrice: input.setMinPrice, setMaxPrice: input.setMaxPrice,
    setStockValue: input.setStockValue, setStockOperator: input.setStockOperator,
    setStartDate: input.setStartDate, setEndDate: input.setEndDate, setAdvancedFilter,
    setAdvancedFilterState, setCatalogFilter: input.setCatalogFilter,
    setBaseExported: input.setBaseExported, setIncludeArchived: input.setIncludeArchived,
    setParsedMatchProductIds, clearParsedMatchProductIds };
};
