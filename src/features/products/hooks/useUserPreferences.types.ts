import type { ProductAdvancedFilterPreset, ProductListPreferences } from '@/shared/contracts/products/filters';

export const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: 'name_en',
  catalogFilter: 'all',
  currencyCode: 'PLN',
  pageSize: 12,
  thumbnailSource: 'file',
  filtersCollapsedByDefault: true,
  showTriggerRunFeedback: true,
  advancedFilterPresets: [],
  appliedAdvancedFilter: '',
  appliedAdvancedFilterPresetId: null,
};

export interface UserPreferencesHookResult {
  preferences: ProductListPreferences;
  loading: boolean;
  setNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => Promise<void>;
  setCatalogFilter: (filter: string) => Promise<void>;
  setCurrencyCode: (code: string) => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
  setShowTriggerRunFeedback: (show: boolean) => Promise<void>;
  setAdvancedFilterPresets: (presets: ProductAdvancedFilterPreset[]) => Promise<void>;
  setAppliedAdvancedFilterState: (state: {
    advancedFilter: string;
    presetId: string | null;
  }) => Promise<void>;
}

export type UserPreferenceActions = Omit<UserPreferencesHookResult, 'preferences' | 'loading'>;
