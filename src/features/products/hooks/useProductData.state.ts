'use client';
'use no memo';

import { useState } from 'react';

import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import { normalizeInitialCatalogFilter } from './useProductData.helpers';
import type { BaseExportedFilter, IdMatchMode, ProductDataState, StockOperator, UseProductDataProps } from './useProductData.types';

export const useProductDataState = ({
  initialCatalogFilter,
  initialPageSize,
}: Pick<UseProductDataProps, 'initialCatalogFilter' | 'initialPageSize'>): ProductDataState => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState((): number => normalizeProductPageSize(initialPageSize, 20));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [idMatchMode, setIdMatchMode] = useState<IdMatchMode>('exact');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [stockValue, setStockValue] = useState<number | undefined>(undefined);
  const [stockOperator, setStockOperator] = useState<StockOperator>('');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [advancedFilter, setAdvancedFilter] = useState('');
  const [activeAdvancedFilterPresetId, setActiveAdvancedFilterPresetId] =
    useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState(normalizeInitialCatalogFilter(initialCatalogFilter));
  const [baseExported, setBaseExported] = useState<BaseExportedFilter>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [parsedMatchProductIds, setParsedMatchProductIdsState] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(true);

  return { page, setPage, pageSize, setPageSize, search, setSearch, debouncedSearch,
    setDebouncedSearch, productId, setProductId, idMatchMode, setIdMatchMode, sku, setSku,
    description, setDescription, categoryId, setCategoryId, minPrice, setMinPrice, maxPrice,
    setMaxPrice, stockValue, setStockValue, stockOperator, setStockOperator, startDate,
    setStartDate, endDate, setEndDate, advancedFilter, setAdvancedFilter,
    activeAdvancedFilterPresetId, setActiveAdvancedFilterPresetId, catalogFilter,
    setCatalogFilter, baseExported, setBaseExported, includeArchived, setIncludeArchived,
    parsedMatchProductIds, setParsedMatchProductIdsState, filtersInitialized,
    setFiltersInitialized };
};
