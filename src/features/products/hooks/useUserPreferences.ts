'use client';
'use no memo';

import { useState } from 'react';

import type { ProductListPreferences } from '@/shared/contracts/products/filters';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

import {
  fetchUserPreferences,
  mapProductListPreferences,
  userPreferencesQueryKey,
  useUpdateUserPreferences,
} from './useUserPreferences.api';
import { useUserPreferenceActions } from './useUserPreferences.actions';
import { readStoredProductListPreferences } from './useUserPreferences.storage';
import {
  DEFAULT_PREFERENCES,
  type UserPreferencesHookResult,
} from './useUserPreferences.types';
import type { UserPreferencesResponse } from '@/shared/contracts/auth';

export type { UserPreferencesHookResult } from './useUserPreferences.types';
export { useUpdateUserPreferences } from './useUserPreferences.api';

export function useUserPreferences(): UserPreferencesHookResult {
  const [storedPreferences] = useState<ProductListPreferences | null>(() =>
    readStoredProductListPreferences()
  );
  const [localPreferenceOverrides, setLocalPreferenceOverrides] = useState<
    Partial<ProductListPreferences>
  >({});
  const query = useSingleQueryV2<UserPreferencesResponse, ProductListPreferences>({
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
      description: 'Loads user preferences product list.',
    },
  });
  const preferences = {
    ...(query.data ?? storedPreferences ?? DEFAULT_PREFERENCES),
    ...localPreferenceOverrides,
  };
  const { mutateAsync: updateBulk } = useUpdateUserPreferences();
  const actions = useUserPreferenceActions({
    updateBulk,
    setLocalPreferenceOverrides,
  });

  return {
    preferences,
    loading: query.isLoading,
    ...actions,
  };
}
