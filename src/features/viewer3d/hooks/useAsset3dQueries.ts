'use client';

import { useQueryClient } from '@tanstack/react-query';

import { fetchAssets3D, fetchCategories, fetchTags, reindexAssets3DFromDisk } from '@/features/viewer3d/api';
import type { Asset3DListFilters, Asset3DRecord } from '@/features/viewer3d/types';
import { api } from '@/shared/lib/api-client';
import {
  invalidateAsset3d,
  invalidateAsset3dDetail,
} from '@/shared/lib/query-invalidation';
import { viewer3dKeys as asset3dKeys } from '@/shared/lib/query-key-exports';
import {
  createListQuery,
  createSingleQuery,
  createDeleteMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
import type { 
  ListQuery, 
  SingleQuery, 
  DeleteMutation, 
  UpdateMutation 
} from '@/shared/types/query-result-types';

export { asset3dKeys };


export function useAssets3D(filters: Asset3DListFilters): ListQuery<Asset3DRecord> {
  return createListQuery({
    queryKey: asset3dKeys.list(filters),
    queryFn: () => fetchAssets3D(filters),
  });
}

export function useAsset3DCategories(): ListQuery<string> {
  return createListQuery({
    queryKey: asset3dKeys.categories(),
    queryFn: fetchCategories,
  });
}

export function useAsset3DTags(): ListQuery<string> {
  return createListQuery({
    queryKey: asset3dKeys.tags(),
    queryFn: fetchTags,
  });
}

export function useAsset3DById(id: string | null): SingleQuery<Asset3DRecord> {
  return createSingleQuery({
    queryKey: asset3dKeys.detail(id),
    queryFn: () => api.get<Asset3DRecord>(`/api/assets3d/${id}`),
    options: {
      enabled: Boolean(id),
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
  