'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ExpandedImageFile } from '@/features/products';
import type { ListQuery, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateFiles } from '@/shared/lib/query-invalidation';
import { fileKeys } from '@/shared/lib/query-key-exports';

export { fileKeys };

export function useFileQueries(params: string = ''): ListQuery<ExpandedImageFile> {
  const queryKey = fileKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<ExpandedImageFile[]>(`/api/files?${params}`),
    meta: {
      source: 'files.hooks.useFileQueries',
      operation: 'list',
      resource: 'files',
      queryKey,
      tags: ['files', 'list'],
    },
  });
}

export function useDeleteFile(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: async (fileId: string): Promise<void> => {
      await api.delete(`/api/files/${fileId}`);
    },
    mutationKey: fileKeys.all,
    meta: {
      source: 'files.hooks.useDeleteFile',
      operation: 'delete',
      resource: 'files',
      mutationKey: fileKeys.all,
      tags: ['files', 'delete'],
    },
    onSuccess: (): void => {
      void invalidateFiles(queryClient);
    },
  });
}

export function useUpdateFileTags(): UpdateMutation<
  ExpandedImageFile,
  { id: string; tags: string[] }
> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      api.patch<ExpandedImageFile>(`/api/files/${id}`, { tags }),
    mutationKey: fileKeys.all,
    meta: {
      source: 'files.hooks.useUpdateFileTags',
      operation: 'update',
      resource: 'files.tags',
      mutationKey: fileKeys.all,
      tags: ['files', 'tags', 'update'],
    },
    onSuccess: (): void => {
      void invalidateFiles(queryClient);
    },
  });
}
