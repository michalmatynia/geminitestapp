'use client';

import type { ProductSyncProfile, ProductSyncRunRecord } from '@/shared/contracts/product-sync';
import type {
  CreateMutation,
  DeleteMutation,
  ListQuery,
  MutationResult,
  UpdateMutation,
} from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

export function useProductSyncProfiles(): ListQuery<ProductSyncProfile> {
  const queryKey = productSettingsKeys.syncProfiles();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSyncProfile[]> => {
      const data = await api.get<{ profiles: ProductSyncProfile[] }>(
        '/api/v2/products/sync/profiles',
        { cache: 'no-store' }
      );
      return data.profiles ?? [];
    },
    meta: {
      source: 'products.hooks.useProductSyncProfiles',
      operation: 'list',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'sync', 'profiles'],
    },
  });
}

export function useProductSyncRuns(
  profileId?: string | null,
  limit = 50
): ListQuery<ProductSyncRunRecord> {
  const queryKey = productSettingsKeys.syncRuns(profileId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSyncRunRecord[]> => {
      const params = new URLSearchParams();
      if (profileId) {
        params.set('profileId', profileId);
      }
      params.set('limit', String(limit));
      const query = params.toString();
      const endpoint = `/api/v2/products/sync/runs${query ? `?${query}` : ''}`;
      const data = await api.get<{ runs: ProductSyncRunRecord[] }>(endpoint, {
        cache: 'no-store',
      });
      return data.runs ?? [];
    },
    staleTime: 5_000,
    refetchInterval: profileId ? 15_000 : false,
    refetchIntervalInBackground: false,
    meta: {
      source: 'products.hooks.useProductSyncRuns',
      operation: 'list',
      resource: 'products.settings.sync.runs',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'sync', 'runs'],
    },
  });
}

export function useCreateProductSyncProfileMutation(): CreateMutation<
  ProductSyncProfile,
  Partial<ProductSyncProfile>
> {
  const mutationKey = productSettingsKeys.syncProfiles();
  return createCreateMutationV2({
    mutationFn: (input: Partial<ProductSyncProfile>) =>
      api.post<ProductSyncProfile>('/api/v2/products/sync/profiles', input),
    mutationKey,
    meta: {
      source: 'products.hooks.useCreateProductSyncProfileMutation',
      operation: 'create',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'create'],
    },
    invalidateKeys: [productSettingsKeys.syncProfiles()],
  });
}

export function useUpdateProductSyncProfileMutation(): UpdateMutation<
  ProductSyncProfile,
  { id: string; data: Partial<ProductSyncProfile> }
> {
  const mutationKey = productSettingsKeys.syncProfiles();
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductSyncProfile> }) =>
      api.put<ProductSyncProfile>(`/api/v2/products/sync/profiles/${encodeURIComponent(id)}`, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateProductSyncProfileMutation',
      operation: 'update',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'update'],
    },
    invalidateKeys: [productSettingsKeys.syncProfiles(), productSettingsKeys.syncRuns(null)],
  });
}

export function useDeleteProductSyncProfileMutation(): DeleteMutation {
  const mutationKey = productSettingsKeys.syncProfiles();
  return createDeleteMutationV2({
    mutationFn: (id: string) =>
      api.delete(`/api/v2/products/sync/profiles/${encodeURIComponent(id)}`),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteProductSyncProfileMutation',
      operation: 'delete',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'delete'],
    },
    invalidateKeys: [productSettingsKeys.syncProfiles(), productSettingsKeys.syncRuns(null)],
  });
}

export function useRunProductSyncProfileMutation(): MutationResult<
  ProductSyncRunRecord,
  { profileId: string }
> {
  const mutationKey = productSettingsKeys.syncRuns(null);
  return createMutationV2({
    mutationFn: ({ profileId }: { profileId: string }) =>
      api.post<ProductSyncRunRecord>(
        `/api/v2/products/sync/profiles/${encodeURIComponent(profileId)}/run`,
        {}
      ),
    mutationKey,
    meta: {
      source: 'products.hooks.useRunProductSyncProfileMutation',
      operation: 'action',
      resource: 'products.settings.sync.runs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'runs', 'run-now'],
    },
    invalidateKeys: (_data, variables) => [
      productSettingsKeys.syncRuns(null),
      productSettingsKeys.syncRuns(variables.profileId),
      productSettingsKeys.syncProfiles(),
    ],
  });
}

export function useRelinkBaseProductsMutation(): MutationResult<
  { status: string; jobId: string },
  { connectionId?: string; inventoryId?: string; catalogId?: string | null; limit?: number }
> {
  const mutationKey = productSettingsKeys.syncProfiles();
  return createMutationV2({
    mutationFn: (payload) =>
      api.post<{ status: string; jobId: string }>('/api/v2/products/sync/relink', payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useRelinkBaseProductsMutation',
      operation: 'action',
      resource: 'products.settings.sync.relink',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'relink'],
    },
  });
}
