'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { fetchAssets3D, fetchCategories, fetchTags, reindexAssets3DFromDisk } from '@/features/viewer3d/api';
import type { Asset3DListFilters, Asset3DRecord } from '@/features/viewer3d/types';
import { api } from '@/shared/lib/api-client';
import {
  invalidateAsset3d,
  invalidateAsset3dDetail,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const asset3dKeys = QUERY_KEYS.viewer3d;

export function useAssets3D(filters: Asset3DListFilters): UseQueryResult<Asset3DRecord[], Error> {
  return useQuery({
    queryKey: asset3dKeys.list(filters),
    queryFn: () => fetchAssets3D(filters),
  });
}

export function useAsset3DCategories(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: asset3dKeys.categories,
    queryFn: fetchCategories,
  });
}

export function useAsset3DTags(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: asset3dKeys.tags,
    queryFn: fetchTags,
  });
}

export function useAsset3DById(id: string | null): UseQueryResult<Asset3DRecord, Error> {
  return useQuery<Asset3DRecord>({
    queryKey: asset3dKeys.detail(id),
    queryFn: () => api.get<Asset3DRecord>(`/api/assets3d/${id}`),
    enabled: Boolean(id),
  });
}

export function useDeleteAsset3DMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/assets3d/${id}`),
    onSuccess: () => {
      void invalidateAsset3d(queryClient);
    },
  });
}

export function useUpdateAsset3DMutation(): UseMutationResult<Asset3DRecord, Error, { id: string; data: Partial<Asset3DRecord> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset3DRecord> }) => api.patch<Asset3DRecord>(`/api/assets3d/${id}`, data),
    onSuccess: (data: Asset3DRecord) => {
      void invalidateAsset3d(queryClient);
      void invalidateAsset3dDetail(queryClient, data.id);
    },
  });
}

export function useReindexAssets3DMutation(): UseMutationResult<
  {
    diskFiles: number;
    supportedFiles: number;
    existingRecords: number;
    created: number;
    skipped: number;
    createdIds: string[];
  },
  Error,
  void
  > {
  const queryClient = useQueryClient();
    return useMutation({
      mutationFn: () => reindexAssets3DFromDisk(),
      onSuccess: () => {
        void invalidateAsset3d(queryClient);
      },
    });
  }
  