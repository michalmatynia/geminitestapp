'use client';
'use no memo';

import { useEffect, useRef } from 'react';

import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import {
  hasNonEmptyText,
  isValidAdvancedFilterPayload,
} from './useProductData.helpers';
import type { ProductDataEffectsInput } from './useProductData.types';

type AdvancedFilterPreference = {
  presetId: string | null;
  value: string;
};

type CatalogPreferenceInput = Pick<
  ProductDataEffectsInput,
  'initialCatalogFilter' | 'setCatalogFilter'
>;

type PageSizePreferenceInput = Pick<
  ProductDataEffectsInput,
  'initialPageSize' | 'setPageSize'
>;

type AdvancedFilterPreferenceInput = Pick<
  ProductDataEffectsInput,
  | 'initialAppliedAdvancedFilter'
  | 'initialAppliedAdvancedFilterPresetId'
  | 'setActiveAdvancedFilterPresetId'
  | 'setAdvancedFilter'
>;

const applyCatalogPreference = ({
  initialCatalogFilter,
  setCatalogFilter,
}: CatalogPreferenceInput): void => {
  if (hasNonEmptyText(initialCatalogFilter)) setCatalogFilter(initialCatalogFilter);
};

const applyPageSizePreference = ({
  initialPageSize,
  setPageSize,
}: PageSizePreferenceInput): void => {
  if (initialPageSize === null || initialPageSize === undefined) return;
  setPageSize(normalizeProductPageSize(initialPageSize, 20));
};

const resolveAdvancedFilterPreference = ({
  initialAppliedAdvancedFilter,
  initialAppliedAdvancedFilterPresetId,
}: AdvancedFilterPreferenceInput): AdvancedFilterPreference => {
  const value = initialAppliedAdvancedFilter?.trim() ?? '';
  if (value.length === 0) return { value: '', presetId: null };
  if (!isValidAdvancedFilterPayload(value)) return { value: '', presetId: null };
  return { value, presetId: initialAppliedAdvancedFilterPresetId ?? null };
};

const applyAdvancedFilterPreference = (input: AdvancedFilterPreferenceInput): void => {
  const preference = resolveAdvancedFilterPreference(input);
  input.setAdvancedFilter(preference.value);
  input.setActiveAdvancedFilterPresetId(preference.presetId);
};

const usePreferenceInitialization = ({
  initialAppliedAdvancedFilter,
  initialAppliedAdvancedFilterPresetId,
  initialCatalogFilter,
  initialPageSize,
  preferencesLoaded,
  setActiveAdvancedFilterPresetId,
  setAdvancedFilter,
  setCatalogFilter,
  setFiltersInitialized,
  setPageSize,
}: ProductDataEffectsInput): void => {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (!preferencesLoaded) return;

    applyCatalogPreference({ initialCatalogFilter, setCatalogFilter });
    applyPageSizePreference({ initialPageSize, setPageSize });
    applyAdvancedFilterPreference({
      initialAppliedAdvancedFilter,
      initialAppliedAdvancedFilterPresetId,
      setActiveAdvancedFilterPresetId,
      setAdvancedFilter,
    });
    hasInitialized.current = true;
    setFiltersInitialized(true);
  }, [initialAppliedAdvancedFilter, initialAppliedAdvancedFilterPresetId, initialCatalogFilter,
    initialPageSize, preferencesLoaded, setActiveAdvancedFilterPresetId, setAdvancedFilter,
    setCatalogFilter, setFiltersInitialized, setPageSize]);
};

const useDebouncedSearch = (
  search: string,
  setDebouncedSearch: (value: string) => void
): void => {
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [search, setDebouncedSearch]);
};

const useResetPageOnFilterChange = ({
  advancedFilter,
  baseExported,
  catalogFilter,
  categoryId,
  debouncedSearch,
  description,
  endDate,
  idMatchMode,
  includeArchived,
  maxPrice,
  minPrice,
  pageSize,
  parsedMatchProductIdsKey,
  productId,
  setPage,
  sku,
  startDate,
  stockOperator,
  stockValue,
}: ProductDataEffectsInput): void => {
  useEffect(() => {
    setPage(1);
  }, [advancedFilter, baseExported, catalogFilter, categoryId, debouncedSearch, description,
    endDate, idMatchMode, includeArchived, maxPrice, minPrice, pageSize,
    parsedMatchProductIdsKey, productId, setPage, sku, startDate, stockOperator, stockValue]);
};

const useClampPage = ({ page, setPage, totalPages }: ProductDataEffectsInput): void => {
  useEffect(() => {
    if (page > 1 && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);
};

const useRefreshOnTrigger = ({
  refresh,
  refreshTrigger,
}: ProductDataEffectsInput): void => {
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== 0) {
      refresh();
    }
  }, [refreshTrigger, refresh]);
};

export const useProductDataEffects = (input: ProductDataEffectsInput): void => {
  usePreferenceInitialization(input);
  useDebouncedSearch(input.search, input.setDebouncedSearch);
  useResetPageOnFilterChange(input);
  useClampPage(input);
  useRefreshOnTrigger(input);
};
