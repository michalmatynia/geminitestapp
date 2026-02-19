'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

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

import type {
  ImageStudioProjectRecord,
  ImageStudioSlotRecord,
  StudioSlotsResponse,
} from '../types';

const normalizeStudioSlotId = (rawId: string): string => rawId.trim();
const DELETE_SLOT_TIMEOUT_MS = 120_000;
const DELETE_VERIFY_ATTEMPTS = 40;
const DELETE_VERIFY_INTERVAL_MS = 1_500;

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

const wait = async (ms: number): Promise<void> =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isDeleteTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('request timeout') || message.includes('timeout');
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
    mode:
      | 'client_alpha_bbox'
      | 'server_alpha_bbox'
      | 'client_object_layout_v1'
      | 'server_object_layout_v1';
    dataUrl?: string | undefined;
    layout?: {
      paddingPercent?: number | undefined;
      paddingXPercent?: number | undefined;
      paddingYPercent?: number | undefined;
      fillMissingCanvasWhite?: boolean | undefined;
      targetCanvasWidth?: number | undefined;
      targetCanvasHeight?: number | undefined;
      whiteThreshold?: number | undefined;
      chromaThreshold?: number | undefined;
      detection?: 'auto' | 'alpha_bbox' | 'white_bg_first_colored_pixel' | undefined;
    } | undefined;
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
    mode?:
      | 'client_alpha_bbox'
      | 'server_alpha_bbox'
      | 'client_object_layout_v1'
      | 'server_object_layout_v1';
    dataUrl?: string;
    layout?: {
      paddingPercent?: number;
      paddingXPercent?: number;
      paddingYPercent?: number;
      fillMissingCanvasWhite?: boolean;
      targetCanvasWidth?: number;
      targetCanvasHeight?: number;
      whiteThreshold?: number;
      chromaThreshold?: number;
      detection?: 'auto' | 'alpha_bbox' | 'white_bg_first_colored_pixel';
    };
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

export interface CreateStudioProjectPayload {
  projectId: string;
  canvasWidthPx?: number | null;
  canvasHeightPx?: number | null;
}

export interface RenameStudioProjectResult {
  projectId: string;
  fromProjectId: string;
  renamed: boolean;
}

export interface ResizeStudioProjectCanvasPayload {
  projectId: string;
  canvasWidthPx?: number | null;
  canvasHeightPx?: number | null;
}

export interface ResizeStudioProjectCanvasResult {
  projectId: string;
  fromProjectId?: string;
  renamed?: boolean;
  project?: ImageStudioProjectRecord;
}

export function useCreateStudioProject(): CreateMutation<string, CreateStudioProjectPayload> {
  const queryClient = useQueryClient();

  return createCreateMutationV2({
    mutationFn: async (payload: CreateStudioProjectPayload): Promise<string> => {
      const projectId = payload.projectId.trim();
      const data = await api.post<{ projectId?: string }>('/api/image-studio/projects', {
        projectId,
        ...(typeof payload.canvasWidthPx === 'number'
          ? { canvasWidthPx: payload.canvasWidthPx }
          : {}),
        ...(typeof payload.canvasHeightPx === 'number'
          ? { canvasHeightPx: payload.canvasHeightPx }
          : {}),
      });
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

export function useResizeStudioProjectCanvas(): UpdateMutation<ResizeStudioProjectCanvasResult, ResizeStudioProjectCanvasPayload> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2({
    mutationFn: async (
      payload: ResizeStudioProjectCanvasPayload
    ): Promise<ResizeStudioProjectCanvasResult> => {
      const normalizedProjectId = payload.projectId.trim();
      if (!normalizedProjectId) {
        throw new Error('Project id is required.');
      }
      if (
        typeof payload.canvasWidthPx !== 'number' &&
        typeof payload.canvasHeightPx !== 'number'
      ) {
        throw new Error('At least one canvas dimension is required.');
      }
      const response = await api.patch<ResizeStudioProjectCanvasResult>(
        `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}`,
        {
          ...(typeof payload.canvasWidthPx === 'number'
            ? { canvasWidthPx: payload.canvasWidthPx }
            : {}),
          ...(typeof payload.canvasHeightPx === 'number'
            ? { canvasHeightPx: payload.canvasHeightPx }
            : {}),
        },
        {
          timeout: 120_000,
        }
      );
      if (!response.projectId?.trim()) {
        throw new Error('Failed to update project canvas size.');
      }
      return response;
    },
    mutationKey: QUERY_KEYS.imageStudio.all,
    meta: {
      source: 'imageStudio.hooks.useResizeStudioProjectCanvas',
      operation: 'update',
      resource: 'image-studio.projects',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.all,
      tags: ['image-studio', 'project', 'resize-canvas'],
    },
    onSuccess: (
      result: ResizeStudioProjectCanvasResult,
      variables: ResizeStudioProjectCanvasPayload
    ) => {
      const normalizedProjectId = result.projectId?.trim() || variables.projectId.trim();
      void invalidateImageStudioProjects(queryClient);
      if (normalizedProjectId) {
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
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

  return createUpdateMutationV2<
    ImageStudioSlotRecord,
    { id: string; data: Partial<ImageStudioSlotRecord> },
    { previous?: StudioSlotsResponse | undefined }
  >({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      const slotId = normalizeStudioSlotId(id);
      const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(`/api/image-studio/slots/${encodeURIComponent(slotId)}`, data);
      if (!response.slot) {
        throw new Error('Failed to update image studio slot');
      }
      return response.slot;
    },
    onMutate: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }) => {
      const slotsQueryKey = QUERY_KEYS.imageStudio.slots(projectId);
      const slotCandidates = new Set(resolveStudioSlotIdCandidates(id));
      if (slotCandidates.size === 0) {
        return { previous: undefined };
      }

      await queryClient.cancelQueries({ queryKey: slotsQueryKey });
      const previous = queryClient.getQueryData<StudioSlotsResponse>(slotsQueryKey);

      queryClient.setQueryData<StudioSlotsResponse | undefined>(
        slotsQueryKey,
        (current: StudioSlotsResponse | undefined): StudioSlotsResponse | undefined => {
          if (!current?.slots?.length) return current;
          return {
            ...current,
            slots: current.slots.map((slot: ImageStudioSlotRecord) => {
              if (!slotCandidates.has(slot.id)) return slot;

              const next: ImageStudioSlotRecord = { ...slot };
              if (data.name !== undefined) next.name = data.name ?? null;
              if (data.folderPath !== undefined) next.folderPath = data.folderPath ?? null;
              if (data.imageUrl !== undefined) next.imageUrl = data.imageUrl ?? null;
              if (data.imageBase64 !== undefined) next.imageBase64 = data.imageBase64 ?? null;
              if (data.imageFileId !== undefined) {
                next.imageFileId = data.imageFileId ?? null;
                if (data.imageFileId === null) {
                  next.imageFile = null;
                }
              }
              if (data.asset3dId !== undefined) {
                next.asset3dId = data.asset3dId ?? null;
                if (data.asset3dId === null) {
                  next.asset3d = null;
                }
              }
              if (data.screenshotFileId !== undefined) {
                next.screenshotFileId = data.screenshotFileId ?? null;
                if (data.screenshotFileId === null) {
                  next.screenshotFile = null;
                }
              }
              if (data.metadata !== undefined) next.metadata = data.metadata ?? null;
              next.updatedAt = new Date().toISOString();
              return next;
            }),
          };
        }
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previous) return;
      queryClient.setQueryData(QUERY_KEYS.imageStudio.slots(projectId), context.previous);
    },
    onSuccess: (updatedSlot: ImageStudioSlotRecord) => {
      queryClient.setQueryData<StudioSlotsResponse | undefined>(
        QUERY_KEYS.imageStudio.slots(projectId),
        (current: StudioSlotsResponse | undefined): StudioSlotsResponse | undefined => {
          if (!current?.slots?.length) return current;
          return {
            ...current,
            slots: current.slots.map((slot: ImageStudioSlotRecord) =>
              slot.id === updatedSlot.id ? updatedSlot : slot
            ),
          };
        }
      );
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
    onSettled: () => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useDeleteStudioSlot(projectId: string): DeleteMutation<void, string> {
  const queryClient = useQueryClient();
  const deletedIdsByRequestRef = useRef<Map<string, string[]>>(new Map());
  const deleteTimingsByRequestRef = useRef<Map<string, unknown>>(new Map());
  const timeoutFallbackIdsRef = useRef<Set<string>>(new Set());
  const pendingDeleteCandidatesRef = useRef<Map<string, Set<string>>>(new Map());
  const activeDeleteVerifierIdsRef = useRef<Set<string>>(new Set());
  const slotsQueryKey = QUERY_KEYS.imageStudio.slots(projectId);

  const applyOptimisticDeleteFilter = (candidateIds: Set<string>): void => {
    if (candidateIds.size === 0) return;
    queryClient.setQueryData<StudioSlotsResponse | undefined>(
      slotsQueryKey,
      (current: StudioSlotsResponse | undefined): StudioSlotsResponse | undefined => {
        if (!current?.slots?.length) return current;
        const nextSlots = current.slots.filter(
          (slot: ImageStudioSlotRecord) => !candidateIds.has(normalizeStudioSlotId(slot.id)),
        );
        if (nextSlots.length === current.slots.length) return current;
        return {
          ...current,
          slots: nextSlots,
        };
      },
    );
  };

  const verifyPendingDelete = async (normalizedDeletedSlotId: string): Promise<void> => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      return;
    }
    if (activeDeleteVerifierIdsRef.current.has(normalizedDeletedSlotId)) return;
    activeDeleteVerifierIdsRef.current.add(normalizedDeletedSlotId);

    const candidateIds = pendingDeleteCandidatesRef.current.get(normalizedDeletedSlotId)
      ?? new Set(resolveStudioSlotIdCandidates(normalizedDeletedSlotId));

    const cleanup = (): void => {
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      activeDeleteVerifierIdsRef.current.delete(normalizedDeletedSlotId);
      deleteTimingsByRequestRef.current.delete(normalizedDeletedSlotId);
      deletedIdsByRequestRef.current.delete(normalizedDeletedSlotId);
    };

    try {
      for (let attempt = 0; attempt < DELETE_VERIFY_ATTEMPTS; attempt += 1) {
        applyOptimisticDeleteFilter(candidateIds);
        try {
          const response = await api.get<StudioSlotsResponse>(
            `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
            {
              cache: 'no-store',
              logError: false,
              timeout: 15_000,
            }
          );
          queryClient.setQueryData<StudioSlotsResponse | undefined>(slotsQueryKey, response);
        } catch {
          // Continue polling even if one refresh attempt fails.
        }

        const current = queryClient.getQueryData<StudioSlotsResponse | undefined>(slotsQueryKey);
        const remainingSlotIds = new Set(
          (current?.slots ?? [])
            .map((slot: ImageStudioSlotRecord) => normalizeStudioSlotId(slot.id))
            .filter(Boolean)
        );
        const stillPresent = Array.from(candidateIds).some((candidateId: string) =>
          remainingSlotIds.has(candidateId)
        );
        if (!stillPresent) {
          cleanup();
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
          return;
        }

        applyOptimisticDeleteFilter(candidateIds);
        await wait(DELETE_VERIFY_INTERVAL_MS);
      }

      cleanup();
      void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      console.warn('[image-studio] delete verification timed out; slot still present after polling', {
        projectId: normalizedProjectId,
        slotId: normalizedDeletedSlotId,
      });
    } catch (error) {
      cleanup();
      void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      console.error('[image-studio] delete verification failed', {
        projectId: normalizedProjectId,
        slotId: normalizedDeletedSlotId,
        error,
      });
    }
  };

  return createDeleteMutationV2<void, string>({
    mutationFn: async (id: string) => {
      const slotId = normalizeStudioSlotId(id);
      if (
        timeoutFallbackIdsRef.current.has(slotId) ||
        activeDeleteVerifierIdsRef.current.has(slotId)
      ) {
        return;
      }
      try {
        const response = await api.delete<{ deletedSlotIds?: string[]; timingsMs?: unknown }>(
          `/api/image-studio/slots/${encodeURIComponent(slotId)}`,
          {
            timeout: DELETE_SLOT_TIMEOUT_MS,
            ...(process.env['NODE_ENV'] !== 'production'
              ? { params: { debug: '1' } }
              : {}),
          }
        );
        const deletedSlotIds = Array.isArray(response?.deletedSlotIds)
          ? response.deletedSlotIds
            .filter((value: unknown): value is string => typeof value === 'string')
            .map((value: string) => normalizeStudioSlotId(value))
            .filter((value: string) => value.length > 0)
          : [];
        deletedIdsByRequestRef.current.set(slotId, deletedSlotIds);
        deleteTimingsByRequestRef.current.set(slotId, response?.timingsMs ?? null);
      } catch (error) {
        if (isDeleteTimeoutError(error)) {
          timeoutFallbackIdsRef.current.add(slotId);
          deletedIdsByRequestRef.current.set(slotId, []);
          console.info('[image-studio] delete request timed out; keeping optimistic state and polling', {
            projectId,
            slotId,
          });
          return;
        }
        throw error;
      }
    },
    mutationKey: slotsQueryKey,
    meta: {
      source: 'imageStudio.hooks.useDeleteStudioSlot',
      operation: 'delete',
      resource: 'image-studio.slots',
      domain: 'image_studio',
      mutationKey: slotsQueryKey,
      tags: ['image-studio', 'slots', 'delete'],
    },
    onMutate: async (deletedSlotRawId: string) => {
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      const deleteCandidates = new Set<string>(
        resolveStudioSlotIdCandidates(normalizedDeletedSlotId)
      );
      pendingDeleteCandidatesRef.current.set(normalizedDeletedSlotId, deleteCandidates);

      const previousSlots = queryClient.getQueryData<StudioSlotsResponse | undefined>(
        slotsQueryKey,
      );

      applyOptimisticDeleteFilter(deleteCandidates);

      return { previousSlots };
    },
    onError: (error: Error, deletedSlotRawId: string, _snapshot: unknown, context: unknown) => {
      const typedContext = context as { previousSlots?: StudioSlotsResponse } | undefined;
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      deletedIdsByRequestRef.current.delete(normalizedDeletedSlotId);
      deleteTimingsByRequestRef.current.delete(normalizedDeletedSlotId);
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      activeDeleteVerifierIdsRef.current.delete(normalizedDeletedSlotId);
      if (typedContext?.previousSlots) {
        queryClient.setQueryData<StudioSlotsResponse | undefined>(
          slotsQueryKey,
          typedContext.previousSlots,
        );
      }
      console.error('[image-studio] delete card failed', {
        projectId,
        slotId: normalizedDeletedSlotId,
        message: error.message,
      });
    },
    onSuccess: (_result: void, deletedSlotRawId: string) => {
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      const isTimeoutFallback = timeoutFallbackIdsRef.current.has(normalizedDeletedSlotId);
      const timings = deleteTimingsByRequestRef.current.get(normalizedDeletedSlotId);
      const deletedSlotIds = deletedIdsByRequestRef.current.get(normalizedDeletedSlotId) ?? [];
      const deletedSlotCandidates = new Set<string>();
      const baseDeletedIds = deletedSlotIds.length > 0 ? deletedSlotIds : [normalizedDeletedSlotId];
      baseDeletedIds.forEach((deletedSlotId: string) => {
        resolveStudioSlotIdCandidates(deletedSlotId).forEach((candidate: string) => {
          deletedSlotCandidates.add(candidate);
        });
      });
      if (deletedSlotCandidates.size === 0) {
        resolveStudioSlotIdCandidates(normalizedDeletedSlotId).forEach((candidate: string) => {
          deletedSlotCandidates.add(candidate);
        });
      }
      pendingDeleteCandidatesRef.current.set(normalizedDeletedSlotId, deletedSlotCandidates);
      if (timings) {
        console.info('[image-studio] delete card cascade timings', {
          projectId,
          slotId: normalizedDeletedSlotId,
          timingsMs: timings,
        });
      }
      if (!isTimeoutFallback) {
        deletedIdsByRequestRef.current.delete(normalizedDeletedSlotId);
        deleteTimingsByRequestRef.current.delete(normalizedDeletedSlotId);
        pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      }

      applyOptimisticDeleteFilter(deletedSlotCandidates);
    },
    onSettled: (_result: void | undefined, error: Error | null, deletedSlotRawId: string) => {
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      if (error) {
        void invalidateImageStudioSlots(queryClient, projectId);
        return;
      }
      if (timeoutFallbackIdsRef.current.has(normalizedDeletedSlotId)) {
        void verifyPendingDelete(normalizedDeletedSlotId);
        return;
      }
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
      return api.post<RunStudioEnqueueResult>('/api/image-studio/run', payload, {
        timeout: 60_000,
      });
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
