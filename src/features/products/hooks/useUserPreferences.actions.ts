import { useCallback, useMemo } from 'react';

import type { ProductAdvancedFilterPreset, ProductListPreferences } from '@/shared/contracts/products/filters';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';

import { updateLocalStorage } from './useUserPreferences.storage';
import type { UserPreferenceActions } from './useUserPreferences.types';

type SetPreference = (updates: Partial<ProductListPreferences>) => Promise<void>;

const createUserPreferenceActions = (setPreference: SetPreference): UserPreferenceActions => ({
  setNameLocale: async (locale: 'name_en' | 'name_pl' | 'name_de'): Promise<void> => {
    await setPreference({ nameLocale: locale });
  },
  setCatalogFilter: async (filter: string): Promise<void> => {
    await setPreference({ catalogFilter: filter });
  },
  setCurrencyCode: async (code: string): Promise<void> => {
    await setPreference({ currencyCode: code });
  },
  setPageSize: async (size: number): Promise<void> => {
    await setPreference({ pageSize: normalizeProductPageSize(size, 12) });
  },
  setShowTriggerRunFeedback: async (show: boolean): Promise<void> => {
    await setPreference({ showTriggerRunFeedback: show });
  },
  setAdvancedFilterPresets: async (
    presets: ProductAdvancedFilterPreset[]
  ): Promise<void> => {
    await setPreference({ advancedFilterPresets: presets });
  },
  setAppliedAdvancedFilterState: async (state: {
    advancedFilter: string;
    presetId: string | null;
  }): Promise<void> => {
    await setPreference({
      appliedAdvancedFilter: state.advancedFilter,
      appliedAdvancedFilterPresetId: state.presetId,
    });
  },
});

export const useUserPreferenceActions = (input: {
  updateBulk: (updates: Partial<ProductListPreferences>) => Promise<void>;
  setLocalPreferenceOverrides: React.Dispatch<React.SetStateAction<Partial<ProductListPreferences>>>;
}): UserPreferenceActions => {
  const { setLocalPreferenceOverrides, updateBulk } = input;
  const setPreference = useCallback(
    async (updates: Partial<ProductListPreferences>): Promise<void> => {
      await updateBulk(updates);
      Object.entries(updates).forEach(([key, value]) => {
        updateLocalStorage(key as keyof ProductListPreferences, value);
      });
      setLocalPreferenceOverrides((current) => ({
        ...current,
        ...updates,
      }));
    },
    [setLocalPreferenceOverrides, updateBulk]
  );

  return useMemo(() => createUserPreferenceActions(setPreference), [setPreference]);
};
