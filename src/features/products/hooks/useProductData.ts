'use client';
'use no memo';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import {
  type UseProductsFilters,
  type UseProductsOptions,
  useProducts as useProductsQuery,
  useProductsCount as useProductsCountQuery,
  useProductsWithCount,
} from '@/features/products/hooks/useProductsQuery';
import { productAdvancedFilterGroupSchema } from '@/shared/contracts/products/filters';
import { type ProductWithImages } from '@/shared/contracts/products';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { refetchProductsAndCounts } from './productCache';

// This hook layers a large local-state surface over TanStack Query. Keep it on
// the plain hook runtime to avoid React Compiler dev mismatches on
// /admin/products while we stabilize the products page stack.

const isValidAdvancedFilterPayload = (payload: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(payload);
    return productAdvancedFilterGroupSchema.safeParse(parsed).success;
  } catch (error) {
    logClientError(error);
    return false;
  }
};

// --- Queries ---

export type { UseProductsFilters };

export function useProducts(filters: UseProductsFilters, options: UseProductsOptions = {}) {
  return useProductsQuery(filters, options);
}

export function useProductsCount(filters: UseProductsFilters, options: UseProductsOptions = {}) {
  return useProductsCountQuery(filters, options);
}

// --- Composite Hook ---

export interface UseProductDataProps {
  refreshTrigger?: number;
  initialCatalogFilter?: string | null;
  initialPageSize?: number | null;
  initialAppliedAdvancedFilter?: string | null;
  initialAppliedAdvancedFilterPresetId?: string | null;
  preferencesLoaded: boolean;
  currencyCode?: string | null;
  priceGroups?: unknown[];
  searchLanguage?: string | null;
}

export interface ProductDataHookResult {
  data: ProductWithImages[];
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (s: string) => void;
  productId: string;
  setProductId: (s: string) => void;
  idMatchMode: 'exact' | 'partial';
  setIdMatchMode: (mode: 'exact' | 'partial') => void;
  sku: string;
  setSku: (s: string) => void;
  description: string;
  setDescription: (s: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  minPrice: number | undefined;
  setMinPrice: (p: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (p: number | undefined) => void;
  stockValue: number | undefined;
  setStockValue: (value: number | undefined) => void;
  stockOperator: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  setStockOperator: (value: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq') => void;
  startDate: string | undefined;
  setStartDate: (s: string | undefined) => void;
  endDate: string | undefined;
  setEndDate: (s: string | undefined) => void;
  advancedFilter: string;
  setAdvancedFilter: (value: string) => void;
  activeAdvancedFilterPresetId: string | null;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  catalogFilter: string;
  setCatalogFilter: (f: string) => void;
  baseExported: '' | 'true' | 'false';
  setBaseExported: (value: '' | 'true' | 'false') => void;
  loadError: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refresh: () => void;
}

export function useProductData({
  refreshTrigger,
  initialCatalogFilter,
  initialPageSize,
  initialAppliedAdvancedFilter,
  initialAppliedAdvancedFilterPresetId,
  preferencesLoaded,
  searchLanguage,
}: UseProductDataProps): ProductDataHookResult {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => normalizeProductPageSize(initialPageSize, 20));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [idMatchMode, setIdMatchMode] = useState<'exact' | 'partial'>('exact');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [stockValue, setStockValue] = useState<number | undefined>(undefined);
  const [stockOperator, setStockOperator] = useState<'' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [advancedFilter, setAdvancedFilter] = useState('');
  const [activeAdvancedFilterPresetId, setActiveAdvancedFilterPresetId] = useState<string | null>(
    null
  );
  const [catalogFilter, setCatalogFilter] = useState(initialCatalogFilter || 'all');
  const [baseExported, setBaseExported] = useState<'' | 'true' | 'false'>('');
  const hasInitialized = useRef(false);
  const [filtersInitialized, setFiltersInitialized] = useState(true);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (!preferencesLoaded) return;

    if (initialCatalogFilter) setCatalogFilter(initialCatalogFilter);
    if (initialPageSize) setPageSize(normalizeProductPageSize(initialPageSize, 20));
    const normalizedAdvancedFilter = initialAppliedAdvancedFilter?.trim() ?? '';
    if (
      normalizedAdvancedFilter.length > 0 &&
      isValidAdvancedFilterPayload(normalizedAdvancedFilter)
    ) {
      setAdvancedFilter(normalizedAdvancedFilter);
      setActiveAdvancedFilterPresetId(initialAppliedAdvancedFilterPresetId ?? null);
    } else {
      setAdvancedFilter('');
      setActiveAdvancedFilterPresetId(null);
    }
    hasInitialized.current = true;
    setFiltersInitialized(true);
  }, [
    preferencesLoaded,
    initialCatalogFilter,
    initialPageSize,
    initialAppliedAdvancedFilter,
    initialAppliedAdvancedFilterPresetId,
  ]);

  // Debounce the free-text search input so that we don't fire a new
  // products query on every single keystroke while the user is typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queriesEnabled = filtersInitialized;

  const filters: UseProductsFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      id: productId || undefined,
      idMatchMode: productId ? idMatchMode : undefined,
      sku: sku || undefined,
      description: description || undefined,
      categoryId: categoryId || undefined,
      minPrice,
      maxPrice,
      stockValue,
      stockOperator: stockValue !== undefined ? stockOperator || 'eq' : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      advancedFilter: advancedFilter || undefined,
      page,
      pageSize,
      catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
      searchLanguage: (searchLanguage || undefined) as
        | 'name_en'
        | 'name_pl'
        | 'name_de'
        | undefined,
      baseExported: baseExported === 'true' ? true : baseExported === 'false' ? false : undefined,
    }),
    [
      debouncedSearch,
      productId,
      idMatchMode,
      sku,
      description,
      categoryId,
      minPrice,
      maxPrice,
      stockValue,
      stockOperator,
      startDate,
      endDate,
      advancedFilter,
      page,
      pageSize,
      catalogFilter,
      searchLanguage,
      baseExported,
    ]
  );

  const productsWithCountQuery = useProductsWithCount(filters, {
    enabled: queriesEnabled,
    prefetchNextPage: page > 1,
  });
  const loadError = useMemo((): Error | null => {
    const error = productsWithCountQuery.error;
    if (!error) return null;
    if (error instanceof Error) return error;
    return new Error(String(error));
  }, [productsWithCountQuery.error]);

  const totalPages = useMemo(() => {
    return Math.ceil(productsWithCountQuery.total / pageSize);
  }, [pageSize, productsWithCountQuery.total]);

  // Keep pagination valid when filters change.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    productId,
    idMatchMode,
    sku,
    description,
    categoryId,
    minPrice,
    maxPrice,
    stockValue,
    stockOperator,
    startDate,
    endDate,
    advancedFilter,
    catalogFilter,
    baseExported,
    pageSize,
  ]);

  // Clamp page when current page no longer exists after count change.
  useEffect(() => {
    if (page > 1 && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const refresh = useCallback(() => {
    void refetchProductsAndCounts(queryClient);
  }, [queryClient]);

  // Invalidate when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  const handleSetPage = useCallback((p: number) => setPage(p), []);
  const handleSetPageSize = useCallback(
    (size: number) => setPageSize(normalizeProductPageSize(size, 20)),
    []
  );
  const handleSetSearch = useCallback((s: string) => setSearch(s), []);
  const handleSetProductId = useCallback((s: string) => setProductId(s), []);
  const handleSetIdMatchMode = useCallback((mode: 'exact' | 'partial') => setIdMatchMode(mode), []);
  const handleSetSku = useCallback((s: string) => setSku(s), []);
  const handleSetDescription = useCallback((s: string) => setDescription(s), []);
  const handleSetCategoryId = useCallback((id: string) => setCategoryId(id), []);
  const handleSetMinPrice = useCallback((p: number | undefined) => setMinPrice(p), []);
  const handleSetMaxPrice = useCallback((p: number | undefined) => setMaxPrice(p), []);
  const handleSetStockValue = useCallback((value: number | undefined) => setStockValue(value), []);
  const handleSetStockOperator = useCallback(
    (value: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq') => setStockOperator(value),
    []
  );
  const handleSetStartDate = useCallback((s: string | undefined) => setStartDate(s), []);
  const handleSetEndDate = useCallback((s: string | undefined) => setEndDate(s), []);
  const handleSetAdvancedFilterState = useCallback((value: string, presetId: string | null) => {
    const normalizedValue = value.trim();
    setAdvancedFilter(normalizedValue);
    setActiveAdvancedFilterPresetId(normalizedValue.length > 0 ? presetId : null);
  }, []);
  const handleSetAdvancedFilter = useCallback(
    (value: string) => {
      handleSetAdvancedFilterState(value, null);
    },
    [handleSetAdvancedFilterState]
  );
  const handleSetCatalogFilter = useCallback((f: string) => setCatalogFilter(f), []);
  const handleSetBaseExported = useCallback(
    (value: '' | 'true' | 'false') => setBaseExported(value),
    []
  );

  return {
    data: productsWithCountQuery.products,
    totalPages,
    page,
    setPage: handleSetPage,
    pageSize,
    setPageSize: handleSetPageSize,
    search,
    setSearch: handleSetSearch,
    productId,
    setProductId: handleSetProductId,
    idMatchMode,
    setIdMatchMode: handleSetIdMatchMode,
    sku,
    setSku: handleSetSku,
    description,
    setDescription: handleSetDescription,
    categoryId,
    setCategoryId: handleSetCategoryId,
    minPrice,
    setMinPrice: handleSetMinPrice,
    maxPrice,
    setMaxPrice: handleSetMaxPrice,
    stockValue,
    setStockValue: handleSetStockValue,
    stockOperator,
    setStockOperator: handleSetStockOperator,
    startDate,
    setStartDate: handleSetStartDate,
    endDate,
    setEndDate: handleSetEndDate,
    advancedFilter,
    setAdvancedFilter: handleSetAdvancedFilter,
    activeAdvancedFilterPresetId,
    setAdvancedFilterState: handleSetAdvancedFilterState,
    catalogFilter,
    setCatalogFilter: handleSetCatalogFilter,
    baseExported,
    setBaseExported: handleSetBaseExported,
    loadError,
    isLoading: productsWithCountQuery.isLoading,
    isFetching: productsWithCountQuery.isFetching,
    refresh,
  };
}
