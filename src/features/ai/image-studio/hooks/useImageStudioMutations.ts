'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateImageStudioProjects,
  invalidateImageStudioSlots,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { isTanstackFactoryV2Enabled } from '@/shared/lib/tanstack-factory-flags';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/domain/files';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/types/query-result-types';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const normalizeStudioSlotId = (rawId: string): string => rawId.trim();
const USE_V2_IMAGE_STUDIO_FACTORIES = isTanstackFactoryV2Enabled('image_studio');

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createCreateMutationV2({
      mutationFn: async (id: string): Promise<string> => {
        const data = await api.post<{ projectId?: string }>('/api/image-studio/projects', { projectId: id });
        if (!data.projectId) throw new Error('Failed to create project');
        return data.projectId;
      },
      mutationKey: QUERY_KEYS.imageStudio.all,
      meta: {
        source: 'imageStudio.hooks.useCreateStudioProject',
        operation: 'create',
        resource: 'image-studio.projects',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.all,
        tags: ['image-studio', 'project', 'create'],
      },
      onSuccess: () => {
        void invalidateImageStudioProjects(queryClient);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createUpdateMutationV2({
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
      mutationKey: QUERY_KEYS.imageStudio.all,
      meta: {
        source: 'imageStudio.hooks.useRenameStudioProject',
        operation: 'update',
        resource: 'image-studio.projects',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.all,
        tags: ['image-studio', 'project', 'rename'],
      },
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
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createDeleteMutationV2<string, string>({
      mutationFn: async (id: string): Promise<string> => {
        await api.delete(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
          // Recursive folder deletion can take longer for large projects.
          timeout: 120_000,
        });
        return id;
      },
      mutationKey: QUERY_KEYS.imageStudio.all,
      meta: {
        source: 'imageStudio.hooks.useDeleteStudioProject',
        operation: 'delete',
        resource: 'image-studio.projects',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.all,
        tags: ['image-studio', 'project', 'delete'],
      },
      onSuccess: (id: string) => {
        void invalidateImageStudioProjects(queryClient);
        void invalidateImageStudioSlots(queryClient, id);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createCreateMutationV2({
      mutationFn: (slots: Array<Partial<ImageStudioSlotRecord>>) =>
        api.post<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, { slots }),
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      meta: {
        source: 'imageStudio.hooks.useCreateStudioSlots',
        operation: 'create',
        resource: 'image-studio.slots',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
        tags: ['image-studio', 'slots', 'create'],
      },
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createUpdateMutationV2({
      mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
        const slotId = normalizeStudioSlotId(id);
        const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`, data);
        if (!response.slot) {
          throw new Error('Failed to update image studio slot');
        }
        return response.slot;
      },
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      meta: {
        source: 'imageStudio.hooks.useUpdateStudioSlot',
        operation: 'update',
        resource: 'image-studio.slots',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
        tags: ['image-studio', 'slots', 'update'],
      },
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createDeleteMutationV2<void, string>({
      mutationFn: (id: string) => {
        const slotId = normalizeStudioSlotId(id);
        return api.delete<void>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`);
      },
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      meta: {
        source: 'imageStudio.hooks.useDeleteStudioSlot',
        operation: 'delete',
        resource: 'image-studio.slots',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
        tags: ['image-studio', 'slots', 'delete'],
      },
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createCreateMutationV2({
      mutationFn: ({ files, folder }: { files: File[]; folder: string }) => {
        const formData = new FormData();
        files.forEach((file: File) => formData.append('files', file));
        if (folder.trim()) {
          formData.append('folder', folder.trim());
        }
        return api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, formData);
      },
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      meta: {
        source: 'imageStudio.hooks.useUploadStudioAssets',
        operation: 'upload',
        resource: 'image-studio.assets',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
        tags: ['image-studio', 'assets', 'upload'],
      },
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    });
  }

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

  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createCreateMutationV2({
      mutationFn: ({ files, folder }: { files: ImageFileSelection[]; folder: string }) =>
        api.post<StudioAssetImportResult>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, { files, folder }),
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      meta: {
        source: 'imageStudio.hooks.useImportStudioAssetsFromDrive',
        operation: 'upload',
        resource: 'image-studio.assets.import',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
        tags: ['image-studio', 'assets', 'import'],
      },
      onSuccess: () => {
        void invalidateImageStudioSlots(queryClient, projectId);
      },
    });
  }

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
  if (USE_V2_IMAGE_STUDIO_FACTORIES) {
    return createCreateMutationV2({
      mutationFn: async (payload: RunStudioPayload): Promise<RunStudioEnqueueResult> => {
        return api.post<RunStudioEnqueueResult>('/api/image-studio/run', payload);
      },
      mutationKey: QUERY_KEYS.imageStudio.all,
      meta: {
        source: 'imageStudio.hooks.useRunStudio',
        operation: 'create',
        resource: 'image-studio.run',
        domain: 'image_studio',
        mutationKey: QUERY_KEYS.imageStudio.all,
        tags: ['image-studio', 'run'],
      },
    });
  }

  return createCreateMutation({
    mutationFn: async (payload: RunStudioPayload): Promise<RunStudioEnqueueResult> => {
      return api.post<RunStudioEnqueueResult>('/api/image-studio/run', payload);
    },
  });
}
