import { type UseMutationResult } from '@tanstack/react-query';

import {
  type UserPreferencesResponse,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';
import type { ProductListPreferences } from '@/shared/contracts/products/filters';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api, ApiError } from '@/shared/lib/api-client';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';
import { invalidateUserPreferences } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
} from '@/shared/validations/user-preferences';

export const userPreferencesQueryKey = QUERY_KEYS.userPreferences.all;

const resolveStringPreference = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value === 'string' && value !== '') return value;
  return fallback;
};

const resolveNameLocalePreference = (
  value: UserPreferencesResponse | null | undefined
): ProductListPreferences['nameLocale'] => {
  const candidate = value?.productListNameLocale;
  if (candidate === 'name_en' || candidate === 'name_pl' || candidate === 'name_de') {
    return candidate;
  }
  return 'name_en';
};

const resolveThumbnailSourcePreference = (
  value: UserPreferencesResponse | null | undefined
): ProductListPreferences['thumbnailSource'] => {
  const candidate = value?.productListThumbnailSource;
  if (candidate === 'file' || candidate === 'link' || candidate === 'base64') {
    return candidate;
  }
  return 'file';
};

const resolveCurrencyCodePreference = (
  data: UserPreferencesResponse | null | undefined
): ProductListPreferences['currencyCode'] => data?.productListCurrencyCode ?? 'PLN';

const resolveBooleanPreference = (
  value: boolean | null | undefined,
  fallback: boolean
): boolean => value ?? fallback;

const resolveAdvancedFilterPresetsPreference = (
  data: UserPreferencesResponse | null | undefined
): ProductListPreferences['advancedFilterPresets'] => data?.productListAdvancedFilterPresets ?? [];

const resolveAppliedAdvancedFilterPresetIdPreference = (
  data: UserPreferencesResponse | null | undefined
): ProductListPreferences['appliedAdvancedFilterPresetId'] =>
  data?.productListAppliedAdvancedFilterPresetId ?? null;

export const mapProductListPreferences = (
  data: UserPreferencesResponse | null | undefined
): ProductListPreferences => ({
  nameLocale: resolveNameLocalePreference(data),
  catalogFilter: resolveStringPreference(data?.productListCatalogFilter, 'all'),
  currencyCode: resolveCurrencyCodePreference(data),
  pageSize: normalizeProductPageSize(data?.productListPageSize, 12),
  thumbnailSource: resolveThumbnailSourcePreference(data),
  filtersCollapsedByDefault: resolveBooleanPreference(
    data?.productListFiltersCollapsedByDefault,
    true
  ),
  showTriggerRunFeedback: resolveBooleanPreference(data?.productListShowTriggerRunFeedback, true),
  advancedFilterPresets: resolveAdvancedFilterPresetsPreference(data),
  appliedAdvancedFilter: resolveStringPreference(data?.productListAppliedAdvancedFilter, ''),
  appliedAdvancedFilterPresetId: resolveAppliedAdvancedFilterPresetIdPreference(data),
});

export async function fetchUserPreferences(
  signal?: AbortSignal
): Promise<UserPreferencesResponse> {
  return normalizeUserPreferencesResponse(
    await api.get<UserPreferencesResponse>('/api/user/preferences', { signal })
  );
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

async function updateUserPreferences(data: Partial<ProductListPreferences>): Promise<void> {
  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      updateUserPreference(key as keyof ProductListPreferences, value)
    )
  );
}

export function useUpdateUserPreferences(): UseMutationResult<
  void,
  Error,
  Partial<ProductListPreferences>
> {
  return useOfflineMutation<void, Error, Partial<ProductListPreferences>>(updateUserPreferences, {
    queryKey: userPreferencesQueryKey,
    onQueued: () => {},
    onProcessed: (_vars, { queryClient }) => {
      void invalidateUserPreferences(queryClient);
    },
    errorMessage: 'Failed to update preferences',
  });
}
