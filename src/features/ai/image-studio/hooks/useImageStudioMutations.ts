'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  invalidateImageStudioProjects,
  invalidateImageStudioSlots,
} from '@/shared/lib/query-invalidation';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/domain/files';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const normalizeStudioSlotId = (rawId: string): string => rawId.trim();

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

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ImageStudioRunHistoryEvent {
  id: string;
  type: string;
  source: 'api' | 'queue' | 'worker' | 'stream' | 'client';
  message: string;
  at: string;
  payload?: Record<string, unknown>;
}

export interface ImageStudioRunRequestRecord {
  projectId?: string;
  prompt?: string;
  asset?: { filepath?: string; id?: string };
  referenceAssets?: Array<{ filepath?: string; id?: string }>;
  mask?:
    | {
      type: 'polygon';
      points: Array<{ x: number; y: number }>;
      closed?: boolean;
      invert?: boolean;
      feather?: number;
    }
    | {
      type: 'polygons';
      polygons: Array<Array<{ x: number; y: number }>>;
      invert?: boolean;
      feather?: number;
    }
    | null;
  studioSettings?: Record<string, unknown>;
}

export interface RunStudioEnqueueResult {
  runId: string;
  status: ImageStudioRunStatus;
  expectedOutputs: number;
  dispatchMode: 'queued' | 'inline';
}

export interface ImageStudioRunRecord {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline' | null;
  request: ImageStudioRunRequestRecord;
  expectedOutputs: number;
  outputs: ImageFileRecord[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioRunHistoryEvent[];
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
      void invalidateImageStudioProjects(queryClient);
    },
  });
}

export function useDeleteStudioProject(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      await api.delete(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
        // Recursive folder deletion can take longer for large projects.
        timeout: 120_000,
      });
      return id;
    },
    onSuccess: (id: string) => {
      void invalidateImageStudioProjects(queryClient);
      void invalidateImageStudioSlots(queryClient, id);
    },
  });
}

export function useCreateStudioSlots(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: Array<Partial<ImageStudioSlotRecord>>) => 
      api.post<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, { slots }),
    onSuccess: () => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useUpdateStudioSlot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      // Keep the raw slot id (including legacy prefixes like `card:`) and let
      // the API resolve compatibility candidates.
      const slotId = normalizeStudioSlotId(id);
      const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`, data);
      if (!response.slot) {
        throw new Error('Failed to update image studio slot');
      }
      return response.slot;
    },
    onSuccess: () => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useDeleteStudioSlot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      // Keep the raw slot id (including legacy prefixes like `card:`) and let
      // the API resolve compatibility candidates.
      const slotId = normalizeStudioSlotId(id);
      return api.delete<void>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`);
    },
    onSuccess: () => {
      void invalidateImageStudioSlots(queryClient, projectId);
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
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useImportStudioAssetsFromDrive(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, folder }: { files: ImageFileSelection[]; folder: string }) =>
      api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, { files, folder }),
    onSuccess: () => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useRunStudio(): UseMutationResult<RunStudioEnqueueResult, Error, RunStudioPayload> {
  return useMutation({
    mutationFn: async (payload: RunStudioPayload): Promise<RunStudioEnqueueResult> => {
      return api.post<RunStudioEnqueueResult>('/api/image-studio/run', payload);
    },
  });
}
