'use client';

// useProductListFilters: centralizes filter state (search, sku, catalog,
// category, tags, archived) with debouncing, normalization, and helpers to
// generate query keys. Designed to be used by the ProductListProvider and
// to drive query factories without leaking presentation concerns.

// useProductListFilters: thin adapter that normalizes and persists filter
// related preferences (page size, advanced filter state). Keeps normalization
// rules (like page size bounds) centralized and returns stable callbacks for
// the UI layer.

import { useCallback } from 'react';

import { normalizeProductPageSize } from '@/shared/lib/products/constants';

export function useProductListFilters({
  updatePageSize,
  persistAppliedAdvancedFilterState,
}: {
  updatePageSize: (size: number) => Promise<void>;
  persistAppliedAdvancedFilterState: (state: {
    advancedFilter: string;
    presetId: string | null;
  }) => Promise<void>;
}) {
  const handleSetPageSize = useCallback(
    (size: number) => {
      const normalizedPageSize = normalizeProductPageSize(size, 12);
      void updatePageSize(normalizedPageSize);
    },
    [updatePageSize]
  );

  const handleSetAdvancedFilterState = useCallback(
    (value: string, presetId: string | null) => {
      const normalizedValue = value.trim();
      const normalizedPresetId = normalizedValue.length > 0 ? presetId : null;
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
    handleSetPageSize,
    handleSetAdvancedFilter,
    handleSetAdvancedFilterState,
  };
}
