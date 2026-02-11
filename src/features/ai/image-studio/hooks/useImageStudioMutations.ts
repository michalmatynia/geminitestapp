'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/domain/files';

import { studioKeys } from './useImageStudioQueries';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

export interface RunStudioPayload {
  projectId: string;
  asset: { filepath: string; id?: string | undefined };
  referenceAssets?: Array<{ filepath: string; id?: string | undefined }> | undefined;
  prompt: string;
  mask?: {
    type: 'polygons';
    polygons: Array<Array<{ x: number; y: number }>>;
    invert?: boolean | undefined;
    feather?: number | undefined;
  } | null | undefined;
  studioSettings?: Record<string, unknown> | undefined;
}

export interface RunStudioResult {
  outputs: ImageFileRecord[];
}

export interface StudioAssetImportResult {
  uploaded: ImageFileRecord[];
  failures: Array<{ filename?: string; filepath?: string; error: string }>;
}

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
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(`/api/image-studio/slots/${encodeURIComponent(id)}`, data);
      if (!response.slot) {
        throw new Error('Failed to update image studio slot');
      }
      return response.slot;
    },
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
    mutationFn: ({ files, folder }: { files: File[]; folder: string }) => {
      const formData = new FormData();
      files.forEach((file: File) => formData.append('files', file));
      if (folder.trim()) {
        formData.append('folder', folder.trim());
      }
      return api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, formData);
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
      api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, { files, folder }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    },
  });
}

export function useRunStudio(): UseMutationResult<RunStudioResult, Error, RunStudioPayload> {
  return useMutation({
    mutationFn: async (payload: RunStudioPayload): Promise<RunStudioResult> => {
      return api.post<RunStudioResult>('/api/image-studio/run', payload);
    },
  });
}
