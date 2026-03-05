'use client';

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
