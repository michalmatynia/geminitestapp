'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';
import {
  invalidateImageStudioProjects,
  invalidateImageStudioSlots,
} from '@/shared/lib/query-invalidation';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/domain/files';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/types/query-result-types';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const normalizeStudioSlotId = (rawId: string): string => rawId.trim();

export interface RunStudioPayload {
  projectId: string;
  operation?: 'generate' | 'center_object' | undefined;
  asset: { filepath: string; id?: string | undefined };
  referenceAssets?: Array<{ filepath: string; id?: string | undefined }> | undefined;
  prompt: string;
  mask?: {
    type: 'polygons';
    polygons: Array<Array<{ x: number; y: number }>>;
    invert?: boolean | undefined;
    feather?: number | undefined;
  } | null | undefined;
  center?: {
    mode: 'client_alpha_bbox' | 'server_alpha_bbox';
    dataUrl?: string | undefined;
  } | undefined;
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
  operation?: 'generate' | 'center_object';
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
  center?: {
    mode?: 'client_alpha_bbox' | 'server_alpha_bbox';
    dataUrl?: string;
  };
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

export interface RenameStudioProjectPayload {
  projectId: string;
  nextProjectId: string;
}

export interface RenameStudioProjectResult {
  projectId: string;
  fromProjectId: string;
  renamed: boolean;
}

export function useCreateStudioProject(): CreateMutation<string, string> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: async (id: string): Promise<string> => {
      const data = await api.post<{ projectId?: string }>('/api/image-studio/projects', { projectId: id });
      if (!data.projectId) throw new Error('Failed to create project');
      return data.projectId;
    },
    options: {
      onSuccess: () => {
        void invalidateImageStudioProjects(queryClient);
      },
    },
  });
}

export function useRenameStudioProject(): UpdateMutation<RenameStudioProjectResult, RenameStudioProjectPayload> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: async ({ projectId, nextProjectId }: RenameStudioProjectPayload): Promise<RenameStudioProjectResult> => {
      const fromProjectId = projectId.trim();
      const response = await api.patch<RenameStudioProjectResult>(
        `/api/image-studio/projects/${encodeURIComponent(fromProjectId)}`,
        { projectId: nextProjectId },
        {
          timeout: 120_000,
        }
      );
      return {
        projectId: response.projectId,
        fromProjectId: response.fromProjectId || fromProjectId,
        renamed: response.renamed !== false,
      };
    },
    options: {
      onSuccess: (result: RenameStudioProjectResult, variables: RenameStudioProjectPayload) => {
        const fromProjectId = variables.projectId.trim();
        const toProjectId = result.projectId.trim() || variables.nextProjectId.trim();
        void invalidateImageStudioProjects(queryClient);
        if (fromProjectId) {
          void invalidateImageStudioSlots(queryClient, fromProjectId);
        }
        if (toProjectId && toProjectId !== fromProjectId) {
          void invalidateImageStudioSlots(queryClient, toProjectId);
        }
      },
    },
  });
}

export function useDeleteStudioProject(): DeleteMutation<string, string> {
  const queryClient = useQueryClient();
  return createDeleteMutation<string, string>({
    mutationFn: async (id: string): Promise<string> => {
      await api.delete(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
        // Recursive folder deletion can take longer for large projects.
        timeout: 120_000,
      });
      return id;
    },
    options: {
      onSuccess: (id: string) => {
        void invalidateImageStudioProjects(queryClient);
        void invalidateImageStudioSlots(queryClient, id);
      },
    },
  });
}

export function useCreateStudioSlots(projectId: string): CreateMutation<StudioSlotsResponse, Array<Partial<ImageStudioSlotRecord>>> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (slots: Array<Partial<ImageStudioSlotRecord>>) => 
      api.post<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, { slots }),
    options: {
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    },
  });
}

export function useUpdateStudioSlot(projectId: string): UpdateMutation<ImageStudioSlotRecord, { id: string; data: Partial<ImageStudioSlotRecord> }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      const slotId = normalizeStudioSlotId(id);
      const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`, data);
      if (!response.slot) {
        throw new Error('Failed to update image studio slot');
      }
      return response.slot;
    },
    options: {
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    },
  });
}

export function useDeleteStudioSlot(projectId: string): DeleteMutation<void, string> {
  const queryClient = useQueryClient();
  return createDeleteMutation<void, string>({
    mutationFn: (id: string) => {
      const slotId = normalizeStudioSlotId(id);
      return api.delete<void>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`);
    },
    options: {
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    },
  });
}

export function useUploadStudioAssets(projectId: string): CreateMutation<StudioAssetImportResult, { files: File[]; folder: string }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: ({ files, folder }: { files: File[]; folder: string }) => {
      const formData = new FormData();
      files.forEach((file: File) => formData.append('files', file));
      if (folder.trim()) {
        formData.append('folder', folder.trim());
      }
      return api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, formData);
    },
    options: {
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    },
  });
}

export function useImportStudioAssetsFromDrive(projectId: string): CreateMutation<StudioAssetImportResult, { files: ImageFileSelection[]; folder: string }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: ({ files, folder }: { files: ImageFileSelection[]; folder: string }) =>
      api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, { files, folder }),
    options: {
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    },
  });
}

export function useRunStudio(): CreateMutation<RunStudioEnqueueResult, RunStudioPayload> {
  return createCreateMutation({
    mutationFn: async (payload: RunStudioPayload): Promise<RunStudioEnqueueResult> => {
      return api.post<RunStudioEnqueueResult>('/api/image-studio/run', payload);
    },
  });
}
