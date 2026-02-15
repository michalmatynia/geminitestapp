'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ExpandedImageFile } from '@/features/products';
import { api } from '@/shared/lib/api-client';
import {
  createListQuery,
  createDeleteMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
import { invalidateFiles } from '@/shared/lib/query-invalidation';
import { fileKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  DeleteMutation, 
  UpdateMutation 
} from '@/shared/types/query-result-types';

export { fileKeys };

export function useFileQueries(params: string = ''): ListQuery<ExpandedImageFile> {
  return createListQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => api.get<ExpandedImageFile[]>(`/api/files?${params}`),
  });
}

export function useDeleteFile(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      await api.delete(`/api/files/${fileId}`);
    },
    options: {
      onSuccess: (): void => {
        void invalidateFiles(queryClient);
      },
    }
  });
}

export function useUpdateFileTags(): UpdateMutation<ExpandedImageFile, { id: string; tags: string[] }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => api.patch<ExpandedImageFile>(`/api/files/${id}`, { tags }),
    options: {
      onSuccess: (): void => {
        void invalidateFiles(queryClient);
      },
    }
  });
}
