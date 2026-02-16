'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchAssets3D, fetchCategories, fetchTags, reindexAssets3DFromDisk } from '@/features/viewer3d/api';
import type { Asset3DListFilters, Asset3DRecord } from '@/features/viewer3d/types';
import { api } from '@/shared/lib/api-client';
import {
  createListQuery,
  createSingleQuery,
  createDeleteMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
import {
  invalidateAsset3d,
  invalidateAsset3dDetail,
} from '@/shared/lib/query-invalidation';
import { viewer3dKeys as asset3dKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery, 
  DeleteMutation, 
  UpdateMutation 
} from '@/shared/types/query-result-types';

export { asset3dKeys };

const ASSET_LIST_STALE_TIME_MS = 60_000;
const ASSET_METADATA_STALE_TIME_MS = 5 * 60 * 1000;
const ASSET_DETAIL_STALE_TIME_MS = 2 * 60 * 1000;

type LegacyAsset3DListFilters = Asset3DListFilters & {
  category?: string | null | undefined;
};

function normalizeAsset3DListFilters(filters: Asset3DListFilters): Asset3DListFilters {
  const candidate = filters as LegacyAsset3DListFilters;
  const normalizedFilename = typeof candidate.filename === 'string' ? candidate.filename.trim() : '';
  const normalizedCategory = typeof candidate.categoryId === 'string' && candidate.categoryId.trim().length > 0
    ? candidate.categoryId.trim()
    : typeof candidate.category === 'string'
      ? candidate.category.trim()
      : '';
  const normalizedSearch = typeof candidate.search === 'string' ? candidate.search.trim() : '';
  const normalizedTags = Array.isArray(candidate.tags)
    ? Array.from(
      new Set(
        candidate.tags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right))
    : [];

  return {
    ...(normalizedFilename ? { filename: normalizedFilename } : {}),
    ...(normalizedCategory ? { categoryId: normalizedCategory } : {}),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
    ...(typeof candidate.isPublic === 'boolean' ? { isPublic: candidate.isPublic } : {}),
  };
}


export function useAssets3D(filters: Asset3DListFilters): ListQuery<Asset3DRecord> {
  const legacyFilters = filters as LegacyAsset3DListFilters;
  const normalizedFilters = useMemo(
    () => normalizeAsset3DListFilters(filters),
    [
      filters.filename,
      filters.categoryId,
      legacyFilters.category,
      filters.search,
      filters.isPublic,
      Array.isArray(filters.tags) ? filters.tags.join('|') : '',
    ]
  );

  return createListQuery({
    queryKey: asset3dKeys.list(normalizedFilters),
    queryFn: () => fetchAssets3D(normalizedFilters),
    options: {
      staleTime: ASSET_LIST_STALE_TIME_MS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
}

export function useAsset3DCategories(): ListQuery<string> {
  return createListQuery({
    queryKey: asset3dKeys.categories(),
    queryFn: fetchCategories,
    options: {
      staleTime: ASSET_METADATA_STALE_TIME_MS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
}

export function useAsset3DTags(): ListQuery<string> {
  return createListQuery({
    queryKey: asset3dKeys.tags(),
    queryFn: fetchTags,
    options: {
      staleTime: ASSET_METADATA_STALE_TIME_MS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
}

export function useAsset3DById(id: string | null): SingleQuery<Asset3DRecord> {
  return createSingleQuery({
    id,
    queryKey: asset3dKeys.detail(id),
    queryFn: () => api.get<Asset3DRecord>(`/api/assets3d/${id}`),
    options: {
      enabled: Boolean(id),
      staleTime: ASSET_DETAIL_STALE_TIME_MS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
}

export function useDeleteAsset3DMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/assets3d/${id}`),
    options: {
      onSuccess: () => {
        void invalidateAsset3d(queryClient);
      },
    },
  });
}

export function useUpdateAsset3DMutation(): UpdateMutation<Asset3DRecord, { id: string; data: Partial<Asset3DRecord> }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset3DRecord> }) => api.patch<Asset3DRecord>(`/api/assets3d/${id}`, data),
    options: {
      onSuccess: (data: Asset3DRecord) => {
        void invalidateAsset3d(queryClient);
        void invalidateAsset3dDetail(queryClient, data.id);
      },
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
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: () => reindexAssets3DFromDisk(),
    options: {
      onSuccess: () => {
        void invalidateAsset3d(queryClient);
      },
    },
  });
}
