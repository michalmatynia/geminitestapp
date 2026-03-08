'use client';

import type { ExpandedImageFile } from '@/shared/contracts/products';
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
      domain: 'files',
      queryKey,
      tags: ['files', 'list'],
      description: 'Loads files.'},
  });
}

export function useDeleteFile(): DeleteMutation {
  return createDeleteMutationV2({
    mutationFn: async (fileId: string): Promise<void> => {
      await api.delete(`/api/files/${fileId}`);
    },
    mutationKey: fileKeys.all,
    meta: {
      source: 'files.hooks.useDeleteFile',
      operation: 'delete',
      resource: 'files',
      domain: 'files',
      mutationKey: fileKeys.all,
      tags: ['files', 'delete'],
      description: 'Deletes files.'},
    invalidate: (queryClient) => invalidateFiles(queryClient),
  });
}

export function useUpdateFileTags(): UpdateMutation<
  ExpandedImageFile,
  { id: string; tags: string[] }
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      api.patch<ExpandedImageFile>(`/api/files/${id}`, { tags }),
    mutationKey: fileKeys.all,
    meta: {
      source: 'files.hooks.useUpdateFileTags',
      operation: 'update',
      resource: 'files.tags',
      domain: 'files',
      mutationKey: fileKeys.all,
      tags: ['files', 'tags', 'update'],
      description: 'Updates files tags.'},
    invalidate: (queryClient) => invalidateFiles(queryClient),
  });
}
