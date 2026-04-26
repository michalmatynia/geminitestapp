'use client';
'use no memo';
// User preferences for product list: reads persisted preferences (server +
// localStorage), exposes stable setters that persist via offline mutation
// helpers and update localStorage for responsive UI.

import { type UseMutationResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

// React Compiler currently miscompiles this hook stack in dev when it wraps
// TanStack Query + offline mutation helpers, producing useMemoCache size
// mismatches during Fast Refresh. Keep this hook on the plain runtime path.

import {
  type UserPreferencesResponse,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';
import type { ProductAdvancedFilterPreset, ProductListPreferences } from '@/shared/contracts/products/filters';
import { productListPreferencesSchema } from '@/shared/contracts/products/filters';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api, ApiError } from '@/shared/lib/api-client';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateUserPreferences } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
} from '@/shared/validations/user-preferences';

const DEFAULT_PREFERENCES: ProductListPreferences = {
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

const userPreferencesQueryKey = QUERY_KEYS.userPreferences.all;
const PRODUCT_LIST_NAME_LOCALES = new Set(['name_en', 'name_pl', 'name_de']);
const PRODUCT_LIST_THUMBNAIL_SOURCES = new Set(['file', 'link', 'base64']);

const mapProductListPreferences = (
  data: UserPreferencesResponse | null | undefined
): ProductListPreferences => ({
  nameLocale:
    (data?.productListNameLocale as 'name_en' | 'name_pl' | 'name_de' | null | undefined) ||
    'name_en',
  catalogFilter: data?.productListCatalogFilter || 'all',
  currencyCode: data?.productListCurrencyCode ?? 'PLN',
  pageSize: normalizeProductPageSize(data?.productListPageSize, 12),
  thumbnailSource: data?.productListThumbnailSource || 'file',
  filtersCollapsedByDefault: data?.productListFiltersCollapsedByDefault ?? true,
  showTriggerRunFeedback: data?.productListShowTriggerRunFeedback ?? true,
  advancedFilterPresets: data?.productListAdvancedFilterPresets ?? [],
  appliedAdvancedFilter: data?.productListAppliedAdvancedFilter ?? '',
  appliedAdvancedFilterPresetId: data?.productListAppliedAdvancedFilterPresetId ?? null,
});

async function fetchUserPreferences(signal?: AbortSignal): Promise<UserPreferencesResponse> {
  const data = normalizeUserPreferencesResponse(
    await api.get<UserPreferencesResponse>('/api/user/preferences', { signal })
  );
  return data;
}

async function updateUserPreference(
  key: keyof ProductListPreferences,
  value: unknown
): Promise<void> {
  const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const validation = userPreferencesUpdateSchema.safeParse({ [apiKey]: value });
  if (!validation.success) {
    throw new ApiError('Invalid user preference update payload.', 400);
  }
  const payload = normalizeUserPreferencesUpdatePayload(validation.data);
  await api.patch('/api/user/preferences', payload);
}

function getProductListPreferenceStorageKey(key: keyof ProductListPreferences): string {
  return `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function serializeProductListPreferenceValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function updateLocalStorage(key: keyof ProductListPreferences, value: unknown): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    getProductListPreferenceStorageKey(key),
    serializeProductListPreferenceValue(value)
  );
}

function parseStoredBooleanPreference(value: string | null): boolean | undefined {
  if (value == null) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function parseStoredJsonPreference(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function readStoredProductListPreferences(): ProductListPreferences | null {
  if (typeof window === 'undefined') return null;

  const partial: Partial<ProductListPreferences> = {};
  let hasStoredValue = false;

  const nameLocale = window.localStorage.getItem(getProductListPreferenceStorageKey('nameLocale'));
  if (nameLocale != null) {
    hasStoredValue = true;
    if (PRODUCT_LIST_NAME_LOCALES.has(nameLocale)) {
      partial.nameLocale = nameLocale as ProductListPreferences['nameLocale'];
    }
  }

  const catalogFilter = window.localStorage.getItem(
    getProductListPreferenceStorageKey('catalogFilter')
  );
  if (catalogFilter != null) {
    hasStoredValue = true;
    partial.catalogFilter = catalogFilter;
  }

  const currencyCode = window.localStorage.getItem(
    getProductListPreferenceStorageKey('currencyCode')
  );
  if (currencyCode != null) {
    hasStoredValue = true;
    partial.currencyCode = currencyCode === 'null' ? null : currencyCode;
  }

  const pageSize = window.localStorage.getItem(getProductListPreferenceStorageKey('pageSize'));
  if (pageSize != null) {
    hasStoredValue = true;
    partial.pageSize = normalizeProductPageSize(Number.parseInt(pageSize, 10), 12);
  }

  const thumbnailSource = window.localStorage.getItem(
    getProductListPreferenceStorageKey('thumbnailSource')
  );
  if (thumbnailSource != null) {
    hasStoredValue = true;
    if (PRODUCT_LIST_THUMBNAIL_SOURCES.has(thumbnailSource)) {
      partial.thumbnailSource = thumbnailSource as ProductListPreferences['thumbnailSource'];
    }
  }

  const filtersCollapsedByDefault = parseStoredBooleanPreference(
    window.localStorage.getItem(getProductListPreferenceStorageKey('filtersCollapsedByDefault'))
  );
  if (filtersCollapsedByDefault != null) {
    hasStoredValue = true;
    partial.filtersCollapsedByDefault = filtersCollapsedByDefault;
  }

  const showTriggerRunFeedback = parseStoredBooleanPreference(
    window.localStorage.getItem(getProductListPreferenceStorageKey('showTriggerRunFeedback'))
  );
  if (showTriggerRunFeedback != null) {
    hasStoredValue = true;
    partial.showTriggerRunFeedback = showTriggerRunFeedback;
  }

  const advancedFilterPresets = parseStoredJsonPreference(
    window.localStorage.getItem(getProductListPreferenceStorageKey('advancedFilterPresets'))
  );
  if (advancedFilterPresets !== undefined) {
    hasStoredValue = true;
    if (Array.isArray(advancedFilterPresets)) {
      partial.advancedFilterPresets = advancedFilterPresets as ProductAdvancedFilterPreset[];
    }
  }

  const appliedAdvancedFilter = window.localStorage.getItem(
    getProductListPreferenceStorageKey('appliedAdvancedFilter')
  );
  if (appliedAdvancedFilter != null) {
    hasStoredValue = true;
    partial.appliedAdvancedFilter = appliedAdvancedFilter;
  }

  const appliedAdvancedFilterPresetId = window.localStorage.getItem(
    getProductListPreferenceStorageKey('appliedAdvancedFilterPresetId')
  );
  if (appliedAdvancedFilterPresetId != null) {
    hasStoredValue = true;
    partial.appliedAdvancedFilterPresetId =
      appliedAdvancedFilterPresetId === 'null' ? null : appliedAdvancedFilterPresetId;
  }

  if (!hasStoredValue) return null;

  const parsed = productListPreferencesSchema.safeParse({
    ...DEFAULT_PREFERENCES,
    ...partial,
  });

  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

async function updateUserPreferences(data: Partial<ProductListPreferences>): Promise<void> {
  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    await updateUserPreference(key as keyof ProductListPreferences, value);
  }
}
export function useUpdateUserPreferences(): UseMutationResult<
  void,
  Error,
  Partial<ProductListPreferences>
  > {
  return useOfflineMutation<void, Error, Partial<ProductListPreferences>>(updateUserPreferences, {
    queryKey: userPreferencesQueryKey,
    onQueued: () => {
      // Handle queued state
    },
    onProcessed: (_vars, { queryClient }) => {
      void invalidateUserPreferences(queryClient);
    },
    errorMessage: 'Failed to update preferences',
  });
}

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

export function useUserPreferences(): UserPreferencesHookResult {
  const [storedPreferences] = useState<ProductListPreferences | null>(() =>
    readStoredProductListPreferences()
  );
  const [localPreferenceOverrides, setLocalPreferenceOverrides] = useState<
    Partial<ProductListPreferences>
  >({});
  const query = createSingleQueryV2<UserPreferencesResponse, ProductListPreferences>({
    id: 'current',
    queryKey: userPreferencesQueryKey,
    queryFn: (context) => fetchUserPreferences(context.signal),
    select: mapProductListPreferences,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'products.hooks.useUserPreferences',
      operation: 'detail',
      resource: 'user-preferences.product-list',
      domain: 'products',
      queryKey: userPreferencesQueryKey,
      tags: ['products', 'user-preferences'],
      description: 'Loads user preferences product list.'},
  });

  const { data, isLoading } = query;
  const preferences = {
    ...(data ?? storedPreferences ?? DEFAULT_PREFERENCES),
    ...localPreferenceOverrides,
  };

  const { mutateAsync: updateBulk } = useUpdateUserPreferences();

  const setPreference = useCallback(
    async (updates: Partial<ProductListPreferences>) => {
      await updateBulk(updates);
      Object.entries(updates).forEach(([key, value]) => {
        updateLocalStorage(key as keyof ProductListPreferences, value);
      });
      setLocalPreferenceOverrides((current) => ({
        ...current,
        ...updates,
      }));
    },
    [updateBulk]
  );

  const setNameLocale = useCallback(
    async (locale: 'name_en' | 'name_pl' | 'name_de') => {
      await setPreference({ nameLocale: locale });
    },
    [setPreference]
  );

  const setCatalogFilter = useCallback(
    async (filter: string) => {
      await setPreference({ catalogFilter: filter });
    },
    [setPreference]
  );

  const setCurrencyCode = useCallback(
    async (code: string) => {
      await setPreference({ currencyCode: code });
    },
    [setPreference]
  );

  const setPageSize = useCallback(
    async (size: number) => {
      await setPreference({ pageSize: normalizeProductPageSize(size, 12) });
    },
    [setPreference]
  );

  const setAdvancedFilterPresets = useCallback(
    async (presets: ProductAdvancedFilterPreset[]) => {
      await setPreference({ advancedFilterPresets: presets });
    },
    [setPreference]
  );

  const setShowTriggerRunFeedback = useCallback(
    async (show: boolean) => {
      await setPreference({ showTriggerRunFeedback: show });
    },
    [setPreference]
  );

  const setAppliedAdvancedFilterState = useCallback(
    async (state: { advancedFilter: string; presetId: string | null }) => {
      await setPreference({
        appliedAdvancedFilter: state.advancedFilter,
        appliedAdvancedFilterPresetId: state.presetId,
      });
    },
    [setPreference]
  );

  return {
    preferences,
    loading: isLoading,
    setNameLocale,
    setCatalogFilter,
    setCurrencyCode,
    setPageSize,
    setShowTriggerRunFeedback,
    setAdvancedFilterPresets,
    setAppliedAdvancedFilterState,
  };
}
