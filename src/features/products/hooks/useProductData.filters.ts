'use client';
'use no memo';

import { useMemo } from 'react';

import {
  createProductDataFilters,
  resolveEffectivePageSize,
} from './useProductData.helpers';
import type {
  ProductDataFiltersResult,
  ProductDataState,
  UseProductDataProps,
} from './useProductData.types';

export const useProductDataFilters = (
  state: ProductDataState,
  searchLanguage: UseProductDataProps['searchLanguage']
): ProductDataFiltersResult => {
  const { advancedFilter, baseExported, catalogFilter, categoryId, debouncedSearch, description,
    endDate, idMatchMode, includeArchived, maxPrice, minPrice, page, pageSize,
    parsedMatchProductIds, productId, sku, startDate, stockOperator, stockValue } = state;
  const parsedMatchProductIdsKey = parsedMatchProductIds.join('\0');
  const effectivePageSize = useMemo(
    (): number => resolveEffectivePageSize(pageSize, parsedMatchProductIds.length),
    [pageSize, parsedMatchProductIds.length]
  );
  const filters = useMemo(
    () => createProductDataFilters({ advancedFilter, baseExported, catalogFilter, categoryId,
      debouncedSearch, description, effectivePageSize, endDate, idMatchMode, includeArchived,
      maxPrice, minPrice, page, pageSize, parsedMatchProductIds, productId, searchLanguage, sku,
      startDate, stockOperator, stockValue }),
    [advancedFilter, baseExported, catalogFilter, categoryId, debouncedSearch, description,
      effectivePageSize, endDate, idMatchMode, includeArchived, maxPrice, minPrice, page, pageSize,
      parsedMatchProductIds, productId, searchLanguage, sku, startDate, stockOperator, stockValue]
  );

  return { filters, effectivePageSize, parsedMatchProductIdsKey };
};
