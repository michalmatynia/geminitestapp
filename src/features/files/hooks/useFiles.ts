'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ExpandedImageFile } from '@/features/products';

const fileKeys = {
  all: ['files'] as const,
  list: (params: string) => ['files', 'list', params] as const,
};

export function useFiles(params: string = ''): UseQueryResult<ExpandedImageFile[]> {
  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: async (): Promise<ExpandedImageFile[]> => {
      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) throw new Error('Failed to load files');
      return (await res.json()) as ExpandedImageFile[];
    },
  });
}

export function useDeleteFile(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string): Promise<string> => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete file');
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
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }): Promise<ExpandedImageFile> => {
      const res = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error('Failed to update file tags');
      return (await res.json()) as ExpandedImageFile;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
