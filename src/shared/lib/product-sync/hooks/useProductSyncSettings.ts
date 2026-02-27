'use client';

import { useQueryClient } from '@tanstack/react-query';

import type {
  ProductSyncProfile,
  ProductSyncRunDetail,
  ProductSyncRunRecord,
} from '@/shared/contracts/product-sync';
import type {
  CreateMutation,
  DeleteMutation,
  ListQuery,
  MutationResult,
  SingleQuery,
  UpdateMutation,
} from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

export function useProductSyncProfiles(): ListQuery<ProductSyncProfile> {
  const queryKey = productSettingsKeys.syncProfiles();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSyncProfile[]> => {
      const data = await api.get<{ profiles: ProductSyncProfile[] }>(
        '/api/products/sync/profiles',
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
      const endpoint = `/api/products/sync/runs${query ? `?${query}` : ''}`;
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

export function useProductSyncRunDetail(
  runId: string,
  options?: {
    page?: number;
    pageSize?: number;
    includeItems?: boolean;
    enabled?: boolean;
  }
): SingleQuery<ProductSyncRunDetail> {
  const queryKey = productSettingsKeys.syncRunDetail(runId || '__none__');
  return createSingleQueryV2({
    id: runId || null,
    queryKey,
    enabled: (options?.enabled ?? true) && Boolean(runId),
    queryFn: async (): Promise<ProductSyncRunDetail> => {
      const params = new URLSearchParams();
      if (typeof options?.page === 'number') params.set('page', String(options.page));
      if (typeof options?.pageSize === 'number') params.set('pageSize', String(options.pageSize));
      if (typeof options?.includeItems === 'boolean') {
        params.set('includeItems', String(options.includeItems));
      }
      const query = params.toString();
      const endpoint = `/api/products/sync/runs/${encodeURIComponent(runId)}${query ? `?${query}` : ''}`;
      return api.get<ProductSyncRunDetail>(endpoint, { cache: 'no-store' });
    },
    meta: {
      source: 'products.hooks.useProductSyncRunDetail',
      operation: 'detail',
      resource: 'products.settings.sync.run-detail',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'sync', 'runs', 'detail'],
    },
  });
}

export function useCreateProductSyncProfileMutation(): CreateMutation<
  ProductSyncProfile,
  Partial<ProductSyncProfile>
  > {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.syncProfiles();
  return createCreateMutationV2({
    mutationFn: (input: Partial<ProductSyncProfile>) =>
      api.post<ProductSyncProfile>('/api/products/sync/profiles', input),
    mutationKey,
    meta: {
      source: 'products.hooks.useCreateProductSyncProfileMutation',
      operation: 'create',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'create'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncProfiles() });
    },
  });
}

export function useUpdateProductSyncProfileMutation(): UpdateMutation<
  ProductSyncProfile,
  { id: string; data: Partial<ProductSyncProfile> }
  > {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.syncProfiles();
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductSyncProfile> }) =>
      api.put<ProductSyncProfile>(`/api/products/sync/profiles/${encodeURIComponent(id)}`, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateProductSyncProfileMutation',
      operation: 'update',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'update'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncProfiles() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncRuns(null) });
    },
  });
}

export function useDeleteProductSyncProfileMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.syncProfiles();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete(`/api/products/sync/profiles/${encodeURIComponent(id)}`),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteProductSyncProfileMutation',
      operation: 'delete',
      resource: 'products.settings.sync.profiles',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'sync', 'profiles', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncProfiles() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncRuns(null) });
    },
  });
}

export function useRunProductSyncProfileMutation(): MutationResult<
  ProductSyncRunRecord,
  { profileId: string }
  > {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.syncRuns(null);
  return createMutationV2({
    mutationFn: ({ profileId }: { profileId: string }) =>
      api.post<ProductSyncRunRecord>(
        `/api/products/sync/profiles/${encodeURIComponent(profileId)}/run`,
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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncRuns(null) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncRuns(variables.profileId) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.syncProfiles() });
    },
  });
}

export function useRelinkBaseProductsMutation(): MutationResult<
  { status: string; jobId: string },
  { connectionId?: string; inventoryId?: string; catalogId?: string | null; limit?: number }
  > {
  const mutationKey = productSettingsKeys.syncProfiles();
  return createMutationV2({
    mutationFn: (payload) =>
      api.post<{ status: string; jobId: string }>('/api/products/sync/relink', payload),
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
