'use client';

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { logClientError } from '@/features/observability';
import type { ProductListPreferences } from '@/features/products/types/products-ui';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';

const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: 'name_en',
  catalogFilter: 'all',
  currencyCode: 'PLN',
  pageSize: 12,
  thumbnailSource: 'file',
};

const userPreferencesQueryKey = QUERY_KEYS.auth.preferences.detail('product-list');

async function fetchUserPreferences(): Promise<ProductListPreferences> {
  const data = normalizeUserPreferencesResponse(
    await api.get<unknown>('/api/user/preferences')
  );
  return {
    nameLocale: data.productListNameLocale || 'name_en',
    catalogFilter: data.productListCatalogFilter || 'all',
    currencyCode: data.productListCurrencyCode ?? 'PLN',
    pageSize: data.productListPageSize || 12,
    thumbnailSource: data.productListThumbnailSource || 'file',
  };
}

async function updateUserPreference(
  key: keyof ProductListPreferences,
  value: unknown,
): Promise<void> {
  const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const validation = userPreferencesUpdateSchema.safeParse({ [apiKey]: value });
  if (!validation.success) {
    throw new Error('Invalid user preference update payload.');
  }
  const payload = normalizeUserPreferencesUpdatePayload(validation.data);
  await api.patch('/api/user/preferences', payload);
}

function getLocalStorageFallback(): Partial<ProductListPreferences> {
  if (typeof window === 'undefined') return {};

  const storedLocale = window.localStorage.getItem('productListNameLocale');
  const storedCatalogFilter = window.localStorage.getItem(
    'productListCatalogFilter',
  );
  const storedCurrencyCode = window.localStorage.getItem(
    'productListCurrencyCode',
  );
  const storedPageSize = window.localStorage.getItem('productListPageSize');
  const storedThumbnailSource = window.localStorage.getItem(
    'productListThumbnailSource',
  );

  return {
    ...(storedLocale === 'name_en' ||
    storedLocale === 'name_pl' ||
    storedLocale === 'name_de'
      ? { nameLocale: storedLocale }
      : {}),
    ...(storedCatalogFilter ? { catalogFilter: storedCatalogFilter } : {}),
    ...(storedCurrencyCode ? { currencyCode: storedCurrencyCode } : {}),
    ...(storedPageSize && !Number.isNaN(Number(storedPageSize))
      ? { pageSize: Number(storedPageSize) }
      : {}),
    ...(storedThumbnailSource === 'file' ||
    storedThumbnailSource === 'link' ||
    storedThumbnailSource === 'base64'
      ? { thumbnailSource: storedThumbnailSource }
      : {}),
  };
}

function updateLocalStorage(
  key: keyof ProductListPreferences,
  value: unknown,
): void {
  if (typeof window === 'undefined') return;

  const storageKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  window.localStorage.setItem(storageKey, String(value));
}

async function updateUserPreferences(
  data: Partial<ProductListPreferences>,
): Promise<void> {
  const rawPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    rawPayload[apiKey] = value;
  }
  const validation = userPreferencesUpdateSchema.safeParse(rawPayload);
  if (!validation.success) {
    throw new Error('Invalid user preferences update payload.');
  }
  const payload = normalizeUserPreferencesUpdatePayload(validation.data);
  await api.patch('/api/user/preferences', payload);
}

export function useUpdateUserPreferencesMutation(): UseMutationResult<void, Error, Partial<ProductListPreferences>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductListPreferences>) => updateUserPreferences(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey });
    },
  });
}

export interface UserPreferencesHookResult {
  preferences: ProductListPreferences;
  loading: boolean;
  error: string | null;
  setNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => void;
  setCatalogFilter: (filter: string) => void;
  setCurrencyCode: (code: string | null) => void;
  setPageSize: (size: number) => void;
  setThumbnailSource: (source: 'file' | 'link' | 'base64') => void;
}

export function useUserPreferences(): UserPreferencesHookResult {
  const preferencesQuery: UseQueryResult<ProductListPreferences, Error> = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: async (): Promise<ProductListPreferences> => {
      try {
        return await fetchUserPreferences();
      } catch (error) {
        logClientError(error, { context: { source: 'useUserPreferences', action: 'loadPreferences' } });
        // Fall back to localStorage if database fails
        const fallback = getLocalStorageFallback();
        return { ...DEFAULT_PREFERENCES, ...fallback };
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes for offline support
    networkMode: 'offlineFirst',
  });

  const updatePreferenceMutation = useOfflineMutation<void, Error, { key: keyof ProductListPreferences; value: unknown }, ProductListPreferences>(
    ({ key, value }: { key: keyof ProductListPreferences; value: unknown }) => 
      updateUserPreference(key, value),
    {
      queryKey: userPreferencesQueryKey,
      optimisticUpdate: (oldData: ProductListPreferences | undefined, { key, value }: { key: keyof ProductListPreferences; value: unknown }) => ({
        ...DEFAULT_PREFERENCES,
        ...(oldData || {}),
        [key]: value,
      } as ProductListPreferences),
      successMessage: 'Preferences updated',
      errorMessage: 'Failed to update preferences',
    }
  );

  const preferences = preferencesQuery.data ?? DEFAULT_PREFERENCES;

  const setPreference = useCallback(
    (key: keyof ProductListPreferences, value: unknown): void => {
      updatePreferenceMutation.mutate({ key, value });
      updateLocalStorage(key, value);
    },
    [updatePreferenceMutation],
  );

  const setNameLocale = useCallback(
    (locale: 'name_en' | 'name_pl' | 'name_de'): void => {
      setPreference('nameLocale', locale);
    },
    [setPreference],
  );

  const setCatalogFilter = useCallback(
    (filter: string): void => {
      setPreference('catalogFilter', filter);
    },
    [setPreference],
  );

  const setCurrencyCode = useCallback(
    (code: string | null): void => {
      setPreference('currencyCode', code);
    },
    [setPreference],
  );

  const setPageSize = useCallback(
    (size: number): void => {
      setPreference('pageSize', size);
    },
    [setPreference],
  );

  const setThumbnailSource = useCallback(
    (source: 'file' | 'link' | 'base64'): void => {
      setPreference('thumbnailSource', source);
    },
    [setPreference],
  );

  return {
    preferences,
    loading: preferencesQuery.isLoading,
    error: preferencesQuery.error ? preferencesQuery.error.message : null,
    setNameLocale,
    setCatalogFilter,
    setCurrencyCode,
    setPageSize,
    setThumbnailSource,
  };
}
