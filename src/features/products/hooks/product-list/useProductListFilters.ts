'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeProductPageSize } from '@/features/products/constants';
import { productAdvancedFilterGroupSchema } from '@/shared/contracts/products';

const isValidAdvancedFilterPayload = (payload: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(payload);
    return productAdvancedFilterGroupSchema.safeParse(parsed).success;
  } catch {
    return false;
  }
};

export function useProductListFilters({
  initialCatalogFilter,
  initialPageSize,
  initialAppliedAdvancedFilter,
  initialAppliedAdvancedFilterPresetId,
  preferencesLoaded,
  updatePageSize,
  persistAppliedAdvancedFilterState,
}: {
  initialCatalogFilter?: string | null;
  initialPageSize?: number | null;
  initialAppliedAdvancedFilter?: string | null;
  initialAppliedAdvancedFilterPresetId?: string | null;
  preferencesLoaded: boolean;
  updatePageSize: (size: number) => Promise<void>;
  persistAppliedAdvancedFilterState: (state: {
    advancedFilter: string;
    presetId: string | null;
  }) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => normalizeProductPageSize(initialPageSize, 20));
  const [search, setSearch] = useState('');
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
  const [filtersInitialized, setFiltersInitialized] = useState(!preferencesLoaded);

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

  useEffect(() => {
    if (!preferencesLoaded) {
      setFiltersInitialized(false);
    }
  }, [preferencesLoaded]);

  const handleSetPageSize = useCallback(
    (size: number) => {
      const normalizedPageSize = normalizeProductPageSize(size, 12);
      setPageSize(normalizedPageSize);
      void updatePageSize(normalizedPageSize);
    },
    [updatePageSize]
  );

  const handleSetAdvancedFilterState = useCallback(
    (value: string, presetId: string | null) => {
      const normalizedValue = value.trim();
      const normalizedPresetId = normalizedValue.length > 0 ? presetId : null;
      setAdvancedFilter(normalizedValue);
      setActiveAdvancedFilterPresetId(normalizedPresetId);
      void persistAppliedAdvancedFilterState({
        advancedFilter: normalizedValue,
        presetId: normalizedPresetId,
      });
    },
    [persistAppliedAdvancedFilterState]
  );

  const handleSetAdvancedFilter = useCallback(
    (value: string) => {
      handleSetAdvancedFilterState(value, null);
    },
    [handleSetAdvancedFilterState]
  );

  return {
    page,
    setPage,
    pageSize,
    handleSetPageSize,
    search,
    setSearch,
    productId,
    setProductId,
    idMatchMode,
    setIdMatchMode,
    sku,
    setSku,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stockValue,
    setStockValue,
    stockOperator,
    setStockOperator,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    advancedFilter,
    handleSetAdvancedFilter,
    activeAdvancedFilterPresetId,
    handleSetAdvancedFilterState,
    catalogFilter,
    setCatalogFilter,
    baseExported,
    setBaseExported,
    filtersInitialized,
  };
}
