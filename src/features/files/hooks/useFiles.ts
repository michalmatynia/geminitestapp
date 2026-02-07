'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ExpandedImageFile } from '@/features/products';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const fileKeys = QUERY_KEYS.files;

export function useFiles(params: string = ''): UseQueryResult<ExpandedImageFile[]> {
  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => api.get<ExpandedImageFile[]>(`/api/files?${params}`),
  });
}

export function useDeleteFile(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string): Promise<string> => {
      await api.delete(`/api/files/${fileId}`);
      return fileId;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export function useUpdateFileTags(): UseMutationResult<ExpandedImageFile, Error, { id: string; tags: string[] }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => api.patch<ExpandedImageFile>(`/api/files/${id}`, { tags }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}