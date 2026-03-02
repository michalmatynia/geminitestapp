'use client';

import { useMemo } from 'react';

import {
  fetchAssets3D,
  fetchCategories,
  fetchTags,
  reindexAssets3DFromDisk,
} from '@/features/viewer3d/api';
import type { ListQuery, SingleQuery, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui';
import type { Asset3DListFilters, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateAsset3d, invalidateAsset3dDetail } from '@/shared/lib/query-invalidation';
import { viewer3dKeys as asset3dKeys } from '@/shared/lib/query-key-exports';

export { asset3dKeys };

const ASSET_LIST_STALE_TIME_MS = 60_000;
const ASSET_METADATA_STALE_TIME_MS = 5 * 60 * 1000;
const ASSET_DETAIL_STALE_TIME_MS = 2 * 60 * 1000;

function normalizeAsset3DListFilters(filters: Asset3DListFilters): Asset3DListFilters {
  const normalizedFilename = typeof filters.filename === 'string' ? filters.filename.trim() : '';
  const normalizedCategory =
    typeof filters.categoryId === 'string' && filters.categoryId.trim().length > 0
      ? filters.categoryId.trim()
      : '';
  const normalizedSearch = typeof filters.search === 'string' ? filters.search.trim() : '';
  const normalizedTags = Array.isArray(filters.tags)
    ? Array.from(
      new Set(filters.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
    ).sort((left, right) => left.localeCompare(right))
    : [];

  return {
    ...(normalizedFilename ? { filename: normalizedFilename } : {}),
    ...(normalizedCategory ? { categoryId: normalizedCategory } : {}),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
    ...(typeof filters.isPublic === 'boolean' ? { isPublic: filters.isPublic } : {}),
  };
}

export function useAssets3D(filters: Asset3DListFilters): ListQuery<Asset3DRecord> {
  const normalizedFilters = useMemo(
    () => normalizeAsset3DListFilters(filters),
    [
      filters.filename,
      filters.categoryId,
      filters.search,
      filters.isPublic,
      Array.isArray(filters.tags) ? filters.tags.join('|') : '',
    ]
  );

  const queryKey = asset3dKeys.list(normalizedFilters);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchAssets3D(normalizedFilters),
    staleTime: ASSET_LIST_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'viewer3d.hooks.useAssets3D',
      operation: 'list',
      resource: 'viewer3d.assets',
      domain: 'viewer3d',

      tags: ['viewer3d', 'assets'],
    },
  });
}

export function useAsset3DCategories(): ListQuery<string> {
  const queryKey = asset3dKeys.categories();
  return createListQueryV2({
    queryKey,
    queryFn: fetchCategories,
    staleTime: ASSET_METADATA_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'viewer3d.hooks.useAsset3DCategories',
      operation: 'list',
      resource: 'viewer3d.categories',
      domain: 'viewer3d',

      tags: ['viewer3d', 'categories'],
    },
  });
}

export function useAsset3DTags(): ListQuery<string> {
  const queryKey = asset3dKeys.tags();
  return createListQueryV2({
    queryKey,
    queryFn: fetchTags,
    staleTime: ASSET_METADATA_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'viewer3d.hooks.useAsset3DTags',
      operation: 'list',
      resource: 'viewer3d.tags',
      domain: 'viewer3d',

      tags: ['viewer3d', 'tags'],
    },
  });
}

export function useAsset3DById(id: string | null): SingleQuery<Asset3DRecord> {
  const queryKey = asset3dKeys.detail(id);
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => api.get<Asset3DRecord>(`/api/assets3d/${id}`),
    enabled: Boolean(id),
    staleTime: ASSET_DETAIL_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'viewer3d.hooks.useAsset3DById',
      operation: 'detail',
      resource: 'viewer3d.asset',
      domain: 'viewer3d',

      tags: ['viewer3d', 'asset', 'detail'],
    },
  });
}

export function useDeleteAsset3DMutation(): DeleteMutation {
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<void>(`/api/assets3d/${id}`),
    mutationKey: asset3dKeys.all,
    meta: {
      source: 'viewer3d.hooks.useDeleteAsset3DMutation',
      operation: 'delete',
      resource: 'viewer3d.asset',
      domain: 'viewer3d',

      tags: ['viewer3d', 'asset', 'delete'],
    },
    invalidate: (queryClient) => invalidateAsset3d(queryClient),
  });
}

export function useUpdateAsset3DMutation(): UpdateMutation<
  Asset3DRecord,
  { id: string; data: Partial<Asset3DRecord> }
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset3DRecord> }) =>
      api.patch<Asset3DRecord>(`/api/assets3d/${id}`, data),
    mutationKey: asset3dKeys.all,
    meta: {
      source: 'viewer3d.hooks.useUpdateAsset3DMutation',
      operation: 'update',
      resource: 'viewer3d.asset',
      domain: 'viewer3d',

      tags: ['viewer3d', 'asset', 'update'],
    },
    invalidate: (queryClient, data: Asset3DRecord) => {
      void invalidateAsset3d(queryClient);
      return invalidateAsset3dDetail(queryClient, data.id);
    },
  });
}

export function useReindexAssets3DMutation(): UpdateMutation<
  {
    diskFiles: number;
    supportedFiles: number;
    existingRecords: number;
    created: number;
    skipped: number;
    createdIds: string[];
  },
  void
  > {
  return createUpdateMutationV2({
    mutationFn: () => reindexAssets3DFromDisk(),
    mutationKey: asset3dKeys.all,
    meta: {
      source: 'viewer3d.hooks.useReindexAssets3DMutation',
      operation: 'update',
      resource: 'viewer3d.assets.reindex',
      domain: 'viewer3d',

      tags: ['viewer3d', 'assets', 'reindex'],
    },
    invalidate: (queryClient) => invalidateAsset3d(queryClient),
  });
}
