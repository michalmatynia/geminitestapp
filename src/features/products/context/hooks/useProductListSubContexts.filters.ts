import { useMemo } from 'react';

import type { ProductListFiltersContextType } from '../ProductListContext.types';
import type { ProductListSubContextsInput } from './useProductListSubContexts.types';

const buildProductListFiltersValue = (
  value: ProductListSubContextsInput
): ProductListFiltersContextType => ({
  page: value.page,
  totalPages: value.totalPages,
  setPage: value.setPage,
  pageSize: value.pageSize,
  setPageSize: value.setPageSize,
  nameLocale: value.nameLocale,
  setNameLocale: value.setNameLocale,
  languageOptions: value.languageOptions,
  currencyCode: value.currencyCode,
  setCurrencyCode: value.setCurrencyCode,
  currencyOptions: value.currencyOptions,
  filtersCollapsedByDefault: value.filtersCollapsedByDefault,
  catalogFilter: value.catalogFilter,
  setCatalogFilter: value.setCatalogFilter,
  catalogs: value.catalogs,
  search: value.search,
  setSearch: value.setSearch,
  productId: value.productId,
  setProductId: value.setProductId,
  idMatchMode: value.idMatchMode,
  setIdMatchMode: value.setIdMatchMode,
  sku: value.sku,
  setSku: value.setSku,
  description: value.description,
  setDescription: value.setDescription,
  categoryId: value.categoryId,
  setCategoryId: value.setCategoryId,
  minPrice: value.minPrice,
  setMinPrice: value.setMinPrice,
  maxPrice: value.maxPrice,
  setMaxPrice: value.setMaxPrice,
  stockValue: value.stockValue,
  setStockValue: value.setStockValue,
  stockOperator: value.stockOperator,
  setStockOperator: value.setStockOperator,
  startDate: value.startDate,
  setStartDate: value.setStartDate,
  endDate: value.endDate,
  setEndDate: value.setEndDate,
  advancedFilter: value.advancedFilter,
  activeAdvancedFilterPresetId: value.activeAdvancedFilterPresetId,
  advancedFilterPresets: value.advancedFilterPresets,
  setAdvancedFilterPresets: value.setAdvancedFilterPresets,
  setAdvancedFilter: value.setAdvancedFilter,
  setAdvancedFilterState: value.setAdvancedFilterState,
  baseExported: value.baseExported,
  setBaseExported: value.setBaseExported,
  includeArchived: value.includeArchived,
  setIncludeArchived: value.setIncludeArchived,
  parsedMatchProductIds: value.parsedMatchProductIds,
  setParsedMatchProductIds: value.setParsedMatchProductIds,
  clearParsedMatchProductIds: value.clearParsedMatchProductIds,
});

const getProductListFiltersDependencies = (
  value: ProductListSubContextsInput
): React.DependencyList => [
  value.page, value.totalPages, value.setPage, value.pageSize, value.setPageSize,
  value.nameLocale, value.setNameLocale, value.languageOptions, value.currencyCode,
  value.setCurrencyCode, value.currencyOptions, value.filtersCollapsedByDefault,
  value.catalogFilter, value.setCatalogFilter, value.catalogs, value.search, value.setSearch,
  value.productId, value.setProductId, value.idMatchMode, value.setIdMatchMode, value.sku,
  value.setSku, value.description, value.setDescription, value.categoryId, value.setCategoryId,
  value.minPrice, value.setMinPrice, value.maxPrice, value.setMaxPrice, value.stockValue,
  value.setStockValue, value.stockOperator, value.setStockOperator, value.startDate,
  value.setStartDate, value.endDate, value.setEndDate, value.advancedFilter,
  value.activeAdvancedFilterPresetId, value.advancedFilterPresets, value.setAdvancedFilterPresets,
  value.setAdvancedFilter, value.setAdvancedFilterState, value.baseExported, value.setBaseExported,
  value.includeArchived, value.setIncludeArchived, value.parsedMatchProductIds,
  value.setParsedMatchProductIds, value.clearParsedMatchProductIds,
];

export function useProductListFiltersValue(
  value: ProductListSubContextsInput
): ProductListFiltersContextType {
  return useMemo(
    () => buildProductListFiltersValue(value),
    getProductListFiltersDependencies(value)
  );
}
