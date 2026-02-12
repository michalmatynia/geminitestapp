'use client';

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { logClientError } from '@/features/observability';
import type { ProductListPreferences } from '@/features/products/types/products-ui';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api, ApiError } from '@/shared/lib/api-client';
import { invalidateUserPreferences } from '@/shared/lib/query-invalidation';
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
  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    await updateUserPreference(key as keyof ProductListPreferences, value);
  }
}

export function useUpdateUserPreferencesMutation(): UseMutationResult<void, Error, Partial<ProductListPreferences>> {
  const queryClient = useQueryClient();
  const offlineMutation = useOfflineMutation(
    {
      mutationFn: updateUserPreferences,
      onSuccess: () => {
        void invalidateUserPreferences(queryClient);
      },
      onError: (error) => {
        logClientError(error, {
          context: { source: 'useUpdateUserPreferencesMutation', action: 'updatePreferences' },
        });
      },
    },
    {
      cacheKey: 'productListPreferences',
      retryDelay: 5000,
    },
  );

  return useMutation({
    mutationFn: offlineMutation.mutationFn as (data: Partial<ProductListPreferences>) => Promise<void>,
    onSuccess: offlineMutation.options?.onSuccess,
    onError: offlineMutation.options?.onError,
  });
}

export interface UserPreferencesHookResult extends UseQueryResult<ProductListPreferences> {
  updatePreference: (key: keyof ProductListPreferences, value: unknown) => Promise<void>;
}

export function useUserPreferences(): UserPreferencesHookResult {
  const query = useQuery({
    queryKey: [userPreferencesQueryKey],
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 60,
    placeholderData: DEFAULT_PREFERENCES,
  });

  const updatePreference = useCallback(
    async (key: keyof ProductListPreferences, value: unknown) => {
      await updateUserPreference(key, value);
      updateLocalStorage(key, value);
      await invalidateUserPreferences(useQueryClient());
    },
    [],
  );

  return {
    ...query,
    updatePreference,
  };
}
