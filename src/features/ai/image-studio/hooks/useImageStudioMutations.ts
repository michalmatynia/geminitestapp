'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
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
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/domain/files';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/types/query-result-types';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const normalizeStudioSlotId = (rawId: string): string => rawId.trim();

const asMetadataRecord = (
  value: unknown
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const resolveStudioSlotIdCandidates = (rawId: string): string[] => {
  const normalized = normalizeStudioSlotId(rawId);
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? normalizeStudioSlotId(normalized.slice('slot:'.length))
    : normalized.startsWith('card:')
      ? normalizeStudioSlotId(normalized.slice('card:'.length))
      : normalized;
  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }
  return Array.from(candidates);
};

const getSlotSourceIds = (slot: ImageStudioSlotRecord): string[] => {
  const metadata = asMetadataRecord(slot.metadata);
  if (!metadata) return [];
  const sourceIds = new Set<string>();

  const primary = metadata['sourceSlotId'];
  if (typeof primary === 'string' && primary.trim().length > 0) {
    resolveStudioSlotIdCandidates(primary).forEach((candidate: string) => {
      sourceIds.add(candidate);
    });
  }

  const nested = metadata['sourceSlotIds'];
  if (Array.isArray(nested)) {
    nested.forEach((value: unknown) => {
      if (typeof value !== 'string' || value.trim().length === 0) return;
      resolveStudioSlotIdCandidates(value).forEach((candidate: string) => {
        sourceIds.add(candidate);
      });
    });
  }

  return Array.from(sourceIds);
};

const collectSlotsToDeleteFromRoots = (
  slots: ImageStudioSlotRecord[],
  rootSlotCandidates: Set<string>
): Set<string> => {
  if (slots.length === 0 || rootSlotCandidates.size === 0) return new Set();

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])
  );
  const childIdsBySource = new Map<string, Set<string>>();
  slots.forEach((slot: ImageStudioSlotRecord) => {
    getSlotSourceIds(slot).forEach((sourceSlotId: string) => {
      const resolvedSourceSlotId = resolveStudioSlotIdCandidates(sourceSlotId).find((candidate: string) =>
        slotById.has(candidate)
      );
      if (!resolvedSourceSlotId) return;
      const childIds = childIdsBySource.get(resolvedSourceSlotId) ?? new Set<string>();
      childIds.add(slot.id);
      childIdsBySource.set(resolvedSourceSlotId, childIds);
    });
  });

  const deleteIds = new Set<string>();
  const queue: string[] = [];
  rootSlotCandidates.forEach((rootCandidate: string) => {
    const resolvedRootId = resolveStudioSlotIdCandidates(rootCandidate).find((candidate: string) =>
      slotById.has(candidate)
    );
    if (!resolvedRootId || deleteIds.has(resolvedRootId)) return;
    deleteIds.add(resolvedRootId);
    queue.push(resolvedRootId);
  });

  while (queue.length > 0) {
    const sourceSlotId = queue.shift();
    if (!sourceSlotId) continue;
    const childIds = childIdsBySource.get(sourceSlotId);
    if (!childIds || childIds.size === 0) continue;
    childIds.forEach((childId: string) => {
      if (deleteIds.has(childId)) return;
      deleteIds.add(childId);
      queue.push(childId);
    });
  }

  return deleteIds;
};

export interface RunStudioPayload {
  projectId: string;
  operation?: 'generate' | 'center_object' | undefined;
  asset?: { filepath: string; id?: string | undefined } | undefined;
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

export function useRenameStudioProject(): UpdateMutation<RenameStudioProjectResult, RenameStudioProjectPayload> {
  const queryClient = useQueryClient();

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

export function useDeleteStudioProject(): DeleteMutation<string, string> {
  const queryClient = useQueryClient();

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

export function useCreateStudioSlots(projectId: string): CreateMutation<StudioSlotsResponse, Array<Partial<ImageStudioSlotRecord>>> {
  const queryClient = useQueryClient();

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

export function useUpdateStudioSlot(projectId: string): UpdateMutation<ImageStudioSlotRecord, { id: string; data: Partial<ImageStudioSlotRecord> }> {
  const queryClient = useQueryClient();

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

export function useDeleteStudioSlot(projectId: string): DeleteMutation<void, string> {
  const queryClient = useQueryClient();

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
    onSuccess: (_result: void, deletedSlotRawId: string) => {
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      const deletedSlotCandidates = new Set<string>(
        resolveStudioSlotIdCandidates(normalizedDeletedSlotId)
      );

      queryClient.setQueryData<StudioSlotsResponse | undefined>(
        QUERY_KEYS.imageStudio.slots(projectId),
        (current: StudioSlotsResponse | undefined): StudioSlotsResponse | undefined => {
          if (!current?.slots?.length) return current;
          const deleteIds = collectSlotsToDeleteFromRoots(current.slots, deletedSlotCandidates);
          if (deleteIds.size === 0) return current;
          const nextSlots = current.slots.filter(
            (slot: ImageStudioSlotRecord) => !deleteIds.has(slot.id),
          );
          if (nextSlots.length === current.slots.length) return current;
          return {
            ...current,
            slots: nextSlots,
          };
        },
      );
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useUploadStudioAssets(projectId: string): CreateMutation<StudioAssetImportResult, { files: File[]; folder: string }> {
  const queryClient = useQueryClient();

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

export function useImportStudioAssetsFromDrive(projectId: string): CreateMutation<StudioAssetImportResult, { files: ImageFileSelection[]; folder: string }> {
  const queryClient = useQueryClient();

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

export function useRunStudio(): CreateMutation<RunStudioEnqueueResult, RunStudioPayload> {
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
