'use client';

import { useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ProductListPreferences } from '@/features/products/types/products-ui';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api, ApiError } from '@/shared/lib/api-client';
import { invalidateUserPreferences } from '@/shared/lib/query-invalidation';
import { authKeys } from '@/shared/lib/query-key-exports';
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

const userPreferencesQueryKey = authKeys.preferences.detail('product-list');

async function fetchUserPreferences(): Promise<ProductListPreferences> {
  const data = normalizeUserPreferencesResponse(
    await api.get<unknown>('/api/user/preferences')
  );
  return {
    nameLocale: (data.productListNameLocale as 'name_en' | 'name_pl' | 'name_de' | null | undefined) || 'name_en',
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
    throw new ApiError('Invalid user preference update payload.', 400);
  }
  const payload = normalizeUserPreferencesUpdatePayload(validation.data);
  await api.patch('/api/user/preferences', payload);
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
  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    await updateUserPreference(key as keyof ProductListPreferences, value);
  }
}

export function useUpdateUserPreferences(): UseMutationResult<void, Error, Partial<ProductListPreferences>> {
  const queryClient = useQueryClient();
  return useOfflineMutation(
    updateUserPreferences,
    {
      queryKey: userPreferencesQueryKey,
      onQueued: () => {
        // Handle queued state
      },
      onProcessed: () => {
        void invalidateUserPreferences(queryClient);
      },
      errorMessage: 'Failed to update preferences',
    }
  ) as UseMutationResult<void, Error, Partial<ProductListPreferences>>;
}

export interface UserPreferencesHookResult {
  preferences: ProductListPreferences;
  loading: boolean;
  setNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => Promise<void>;
  setCatalogFilter: (filter: string) => Promise<void>;
  setCurrencyCode: (code: string) => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
}

export function useUserPreferences(): UserPreferencesHookResult {
  const queryClient = useQueryClient();
  const { data = DEFAULT_PREFERENCES, isLoading } = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 60,
    placeholderData: DEFAULT_PREFERENCES,
  });

  const setNameLocale = useCallback(
    async (locale: 'name_en' | 'name_pl' | 'name_de') => {
      await updateUserPreference('nameLocale', locale);
      updateLocalStorage('nameLocale', locale);
      void invalidateUserPreferences(queryClient);
    },
    [queryClient],
  );

  const setCatalogFilter = useCallback(
    async (filter: string) => {
      await updateUserPreference('catalogFilter', filter);
      updateLocalStorage('catalogFilter', filter);
      void invalidateUserPreferences(queryClient);
    },
    [queryClient],
  );

  const setCurrencyCode = useCallback(
    async (code: string) => {
      await updateUserPreference('currencyCode', code);
      updateLocalStorage('currencyCode', code);
      void invalidateUserPreferences(queryClient);
    },
    [queryClient],
  );

  const setPageSize = useCallback(
    async (size: number) => {
      await updateUserPreference('pageSize', size);
      updateLocalStorage('pageSize', size);
      void invalidateUserPreferences(queryClient);
    },
    [queryClient],
  );

  return {
    preferences: data,
    loading: isLoading,
    setNameLocale,
    setCatalogFilter,
    setCurrencyCode,
    setPageSize,
  };
}
