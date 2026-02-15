'use client';

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ProductListPreferences } from '@/features/products/types/products-ui';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api, ApiError } from '@/shared/lib/api-client';
import { createSingleQuery } from '@/shared/lib/query-factories';
import { invalidateUserPreferences } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { UserPreferences as SharedUserPreferences } from '@/shared/types/domain/user-preferences';
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

const userPreferencesQueryKey = QUERY_KEYS.userPreferences.all;

const mapProductListPreferences = (
  data: SharedUserPreferences | null | undefined
): ProductListPreferences => ({
  nameLocale: (data?.productListNameLocale as 'name_en' | 'name_pl' | 'name_de' | null | undefined) || 'name_en',
  catalogFilter: data?.productListCatalogFilter || 'all',
  currencyCode: data?.productListCurrencyCode ?? 'PLN',
  pageSize: data?.productListPageSize || 12,
  thumbnailSource: data?.productListThumbnailSource || 'file',
});

async function fetchUserPreferences(signal?: AbortSignal): Promise<SharedUserPreferences> {
  const data = normalizeUserPreferencesResponse(
    await api.get<unknown>('/api/user/preferences', { signal })
  ) as SharedUserPreferences;
  return data;
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
  return useOfflineMutation<void, Error, Partial<ProductListPreferences>>(
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
  );
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
  const query = createSingleQuery<SharedUserPreferences, ProductListPreferences>({
    id: 'current',
    queryKey: userPreferencesQueryKey,
    queryFn: () => fetchUserPreferences(),
    options: {
      select: mapProductListPreferences,
      staleTime: 1000 * 60 * 5,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  });

  const { data, isLoading } = query;
  const preferences = data || DEFAULT_PREFERENCES;

  const { mutateAsync: updateBulk } = useUpdateUserPreferences();

  const setPreference = useCallback(
    async (updates: Partial<ProductListPreferences>) => {
      await updateBulk(updates);
      Object.entries(updates).forEach(([key, value]) => {
        updateLocalStorage(key as keyof ProductListPreferences, value);
      });
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
      await setPreference({ pageSize: size });
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
  };
}
