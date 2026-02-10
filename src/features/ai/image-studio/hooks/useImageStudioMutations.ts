'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { ImageFileSelection } from '@/shared/types/domain/files';

import { studioKeys } from './useImageStudioQueries';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

export function useCreateStudioProject(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const data = await api.post<{ projectId?: string }>('/api/image-studio/projects', { projectId: id });
      if (!data.projectId) throw new Error('Failed to create project');
      return data.projectId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.projects() });
    },
  });
}

export function useDeleteStudioProject(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      await api.delete(`/api/image-studio/projects/${encodeURIComponent(id)}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.projects() });
    },
  });
}

export function useCreateStudioSlots(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: Array<Partial<ImageStudioSlotRecord>>) => 
      api.post<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, { slots }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}

export function useUpdateStudioSlot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }) => 
      api.patch<ImageStudioSlotRecord>(`/api/image-studio/slots/${encodeURIComponent(id)}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}

export function useDeleteStudioSlot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/image-studio/slots/${encodeURIComponent(id)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}

export function useUploadStudioAssets(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files }: { files: File[]; folder: string }) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      return api.post<{ assets: string[] }>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}

export function useImportStudioAssetsFromDrive(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, folder }: { files: ImageFileSelection[]; folder: string }) => 
      api.post<{ assets: string[] }>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, { files, folder }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}
