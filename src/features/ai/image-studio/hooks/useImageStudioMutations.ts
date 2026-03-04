'use client';

import { useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import {
  type ImageStudioProjectRecord,
  type ImageStudioSlotRecord,
  type StudioSlotsResponse,
  type RunStudioPayload,
  type RunStudioEnqueueResult,
} from '@/shared/contracts/image-studio';

export type { RunStudioPayload, RunStudioEnqueueResult };

import type {
  CreateMutation,
  UpdateMutation,
  DeleteMutation,
  MutationResult,
} from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateImageStudioProjects,
  invalidateImageStudioSlots,
  patchImageStudioSlotsCache,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  normalizeStudioSlotId,
  resolveStudioSlotIdCandidates,
} from '../components/center-preview/variant-thumbnails';

const DELETE_SLOT_TIMEOUT_MS = 30_000;
const DELETE_VERIFY_ATTEMPTS = 15;
const DELETE_VERIFY_INTERVAL_MS = 1500;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isDeleteTimeoutError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('timeout') || msg.includes('deadline');
};

export type ResizeStudioProjectCanvasPayload = {
  projectId: string;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
};

export type CreateStudioProjectPayload = {
  projectId: string;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
};

export type CreateStudioProjectResult = {
  projectId: string;
  project: ImageStudioProjectRecord;
  projectSettingsKey: string;
};

export type UpdateStudioProjectPayload = {
  projectId: string;
  nextProjectId: string;
};

export type UpdateStudioProjectStats = {
  movedDirectory: boolean;
  createdDirectory: boolean;
  updatedSlots: number;
  updatedSlotImageUrls: number;
  updatedRuns: number;
  updatedSlotLinks: number;
  updatedImageFiles: number;
  migratedSettings?: boolean;
  deletedLegacySettingsKeys?: number;
  settingsKey?: string | null;
};

export type UpdateStudioProjectResult = {
  projectId: string;
  project: ImageStudioProjectRecord;
  fromProjectId: string;
  renamed: boolean;
  stats: UpdateStudioProjectStats;
};

export type ResizeStudioProjectCanvasResult = {
  projectId: string;
  canvasWidthPx: number;
  canvasHeightPx: number;
};

export type StudioAssetImportResult = {
  ok: boolean;
  slots: ImageStudioSlotRecord[];
  importedFiles: ImageFileRecord[];
  warnings: string[];
};

export function useCreateStudioProject(): CreateMutation<
  CreateStudioProjectResult,
  CreateStudioProjectPayload
> {
  return createCreateMutationV2({
    mutationFn: (data: CreateStudioProjectPayload) =>
      api.post<CreateStudioProjectResult>('/api/image-studio/projects', data),
    mutationKey: QUERY_KEYS.imageStudio.all,
    meta: {
      source: 'imageStudio.hooks.useCreateStudioProject',
      operation: 'create',
      resource: 'image-studio.projects',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.all,
      tags: ['image-studio', 'project', 'create'],
    },
    invalidate: (queryClient) => invalidateImageStudioProjects(queryClient),
  });
}

export function useRenameStudioProject(): UpdateMutation<
  UpdateStudioProjectResult,
  UpdateStudioProjectPayload
> {
  return createUpdateMutationV2({
    mutationFn: ({ projectId, nextProjectId }: UpdateStudioProjectPayload) =>
      api.patch<UpdateStudioProjectResult>(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}`,
        { projectId: nextProjectId }
      ),
    mutationKey: QUERY_KEYS.imageStudio.all,
    meta: {
      source: 'imageStudio.hooks.useRenameStudioProject',
      operation: 'update',
      resource: 'image-studio.projects',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.all,
      tags: ['image-studio', 'project', 'rename'],
    },
    invalidate: (queryClient) => invalidateImageStudioProjects(queryClient),
  });
}

export function useResizeStudioProjectCanvas(): UpdateMutation<
  ResizeStudioProjectCanvasResult,
  ResizeStudioProjectCanvasPayload
> {
  return createUpdateMutationV2({
    mutationFn: async (
      payload: ResizeStudioProjectCanvasPayload
    ): Promise<ResizeStudioProjectCanvasResult> => {
      const normalizedProjectId = payload.projectId.trim();
      if (!normalizedProjectId) {
        throw new Error('Project id is required.');
      }
      if (typeof payload.canvasWidthPx !== 'number' && typeof payload.canvasHeightPx !== 'number') {
        throw new Error('At least one canvas dimension is required.');
      }
      const response = await api.patch<UpdateStudioProjectResult>(
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
      const canvasWidthPx = response.project.canvasWidthPx ?? payload.canvasWidthPx ?? null;
      const canvasHeightPx = response.project.canvasHeightPx ?? payload.canvasHeightPx ?? null;
      if (canvasWidthPx === null || canvasHeightPx === null) {
        throw new Error('Failed to resolve project canvas size.');
      }
      return {
        projectId: response.projectId,
        canvasWidthPx,
        canvasHeightPx,
      };
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
    invalidate: (queryClient, result, variables) => {
      const normalizedProjectId = result.projectId?.trim() || variables.projectId.trim();
      void invalidateImageStudioProjects(queryClient);
      if (normalizedProjectId) {
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      }
    },
  });
}

export function useDeleteStudioProject(): DeleteMutation<string, string> {
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
    invalidate: (queryClient, id) => {
      void invalidateImageStudioProjects(queryClient);
      void invalidateImageStudioSlots(queryClient, id);
    },
  });
}

export function useCreateStudioSlots(
  projectId: string
): CreateMutation<StudioSlotsResponse, Array<Partial<ImageStudioSlotRecord>>> {
  return createCreateMutationV2({
    mutationFn: (slots: Array<Partial<ImageStudioSlotRecord>>) =>
      api.post<StudioSlotsResponse>(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`,
        { slots }
      ),
    mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
    meta: {
      source: 'imageStudio.hooks.useCreateStudioSlots',
      operation: 'create',
      resource: 'image-studio.slots',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      tags: ['image-studio', 'slots', 'create'],
    },
    invalidate: (queryClient) => invalidateImageStudioSlots(queryClient, projectId),
  });
}

export function useUpdateStudioSlot(
  projectId: string
): UpdateMutation<ImageStudioSlotRecord, { id: string; data: Partial<ImageStudioSlotRecord> }> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2<
    ImageStudioSlotRecord,
    { id: string; data: Partial<ImageStudioSlotRecord> },
    { previous?: StudioSlotsResponse | undefined }
  >({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ImageStudioSlotRecord>;
    }): Promise<ImageStudioSlotRecord> => {
      const slotId = normalizeStudioSlotId(id);
      const response = await api.patch<{ slot?: ImageStudioSlotRecord }>(
        `/api/image-studio/slots/${encodeURIComponent(slotId)}`,
        data
      );
      if (!response.slot) {
        throw new Error('Failed to update image studio slot');
      }
      return response.slot;
    },
    onMutate: async ({ id, data }) => {
      const slotsQueryKey = QUERY_KEYS.imageStudio.slots(projectId);
      const slotCandidates = new Set(resolveStudioSlotIdCandidates(id));
      if (slotCandidates.size === 0) {
        return { previous: undefined };
      }

      await queryClient.cancelQueries({ queryKey: slotsQueryKey });
      const previous = queryClient.getQueryData<StudioSlotsResponse>(slotsQueryKey);

      patchImageStudioSlotsCache(queryClient, projectId, (current) => {
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
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previous) return;
      patchImageStudioSlotsCache(queryClient, projectId, () => context.previous);
    },
    onSuccess: (updatedSlot: ImageStudioSlotRecord) => {
      patchImageStudioSlotsCache(queryClient, projectId, (current) => {
        if (!current?.slots?.length) return current;
        return {
          ...current,
          slots: current.slots.map((slot: ImageStudioSlotRecord) =>
            slot.id === updatedSlot.id ? updatedSlot : slot
          ),
        };
      });
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
    invalidate: (queryClient) => {
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

  const applyOptimisticDeleteFilter = (qc: QueryClient, candidateIds: Set<string>): void => {
    if (candidateIds.size === 0) return;
    patchImageStudioSlotsCache(qc, projectId, (current) => {
      if (!current?.slots?.length) return current;
      const nextSlots = current.slots.filter(
        (slot: ImageStudioSlotRecord) => !candidateIds.has(normalizeStudioSlotId(slot.id))
      );
      if (nextSlots.length === current.slots.length) return current;
      return {
        ...current,
        slots: nextSlots,
      };
    });
  };

  const verifyPendingDelete = async (
    qc: QueryClient,
    normalizedDeletedSlotId: string
  ): Promise<void> => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      return;
    }
    if (activeDeleteVerifierIdsRef.current.has(normalizedDeletedSlotId)) return;
    activeDeleteVerifierIdsRef.current.add(normalizedDeletedSlotId);

    const candidateIds =
      pendingDeleteCandidatesRef.current.get(normalizedDeletedSlotId) ??
      new Set(resolveStudioSlotIdCandidates(normalizedDeletedSlotId));

    const cleanup = (): void => {
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      activeDeleteVerifierIdsRef.current.delete(normalizedDeletedSlotId);
      deleteTimingsByRequestRef.current.delete(normalizedDeletedSlotId);
      deletedIdsByRequestRef.current.delete(normalizedDeletedSlotId);
    };

    try {
      for (let attempt = 0; attempt < DELETE_VERIFY_ATTEMPTS; attempt += 1) {
        applyOptimisticDeleteFilter(qc, candidateIds);
        try {
          const response = await api.get<StudioSlotsResponse>(
            `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
            {
              cache: 'no-store',
              logError: false,
              timeout: 15_000,
            }
          );
          patchImageStudioSlotsCache(qc, normalizedProjectId, () => response);
        } catch {
          // Continue polling even if one refresh attempt fails.
        }

        const current = qc.getQueryData<StudioSlotsResponse>(slotsQueryKey);
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
          void invalidateImageStudioSlots(qc, normalizedProjectId);
          return;
        }

        applyOptimisticDeleteFilter(qc, candidateIds);
        await wait(DELETE_VERIFY_INTERVAL_MS);
      }

      cleanup();
      void invalidateImageStudioSlots(qc, normalizedProjectId);
      console.warn(
        '[image-studio] delete verification timed out; slot still present after polling',
        {
          projectId: normalizedProjectId,
          slotId: normalizedDeletedSlotId,
        }
      );
    } catch (error) {
      cleanup();
      void invalidateImageStudioSlots(qc, normalizedProjectId);
      logClientError(error, {
        context: {
          source: 'useDeleteStudioSlot',
          action: 'deleteVerification',
          projectId: normalizedProjectId,
          slotId: normalizedDeletedSlotId,
        },
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
            ...(process.env['NODE_ENV'] !== 'production' ? { params: { debug: '1' } } : {}),
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
          console.info(
            '[image-studio] delete request timed out; keeping optimistic state and polling',
            {
              projectId,
              slotId,
            }
          );
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
        slotsQueryKey
      );

      applyOptimisticDeleteFilter(queryClient, deleteCandidates);

      return { previousSlots };
    },
    onError: (error: Error, deletedSlotRawId: string, context: unknown) => {
      const typedContext = context as { previousSlots?: StudioSlotsResponse } | undefined;
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      deletedIdsByRequestRef.current.delete(normalizedDeletedSlotId);
      deleteTimingsByRequestRef.current.delete(normalizedDeletedSlotId);
      timeoutFallbackIdsRef.current.delete(normalizedDeletedSlotId);
      pendingDeleteCandidatesRef.current.delete(normalizedDeletedSlotId);
      activeDeleteVerifierIdsRef.current.add(normalizedDeletedSlotId);
      if (typedContext?.previousSlots) {
        patchImageStudioSlotsCache(queryClient, projectId, () => typedContext.previousSlots);
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

      applyOptimisticDeleteFilter(queryClient, deletedSlotCandidates);
    },
    invalidate: (qc, _result, deletedSlotRawId) => {
      const normalizedDeletedSlotId = normalizeStudioSlotId(deletedSlotRawId);
      if (timeoutFallbackIdsRef.current.has(normalizedDeletedSlotId)) {
        void verifyPendingDelete(qc, normalizedDeletedSlotId);
        return;
      }
      void invalidateImageStudioSlots(qc, projectId);
    },
  });
}

export function useUploadStudioAssets(
  projectId: string
): CreateMutation<StudioAssetImportResult, { files: File[]; folder: string }> {
  return createCreateMutationV2({
    mutationFn: ({ files, folder }: { files: File[]; folder: string }) => {
      const formData = new FormData();
      files.forEach((file: File) => formData.append('files', file));
      if (folder.trim()) {
        formData.append('folder', folder.trim());
      }
      return api.post<StudioAssetImportResult>(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`,
        formData
      );
    },
    mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
    meta: {
      source: 'imageStudio.hooks.useUploadStudioAssets',
      operation: 'create',
      resource: 'image-studio.assets',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      tags: ['image-studio', 'assets', 'upload'],
    },
    invalidate: (queryClient) => invalidateImageStudioSlots(queryClient, projectId),
  });
}

export function useImportStudioAssetsFromDrive(
  projectId: string
): CreateMutation<StudioAssetImportResult, { files: ImageFileSelection[]; folder: string }> {
  return createCreateMutationV2({
    mutationFn: ({ files, folder }: { files: ImageFileSelection[]; folder: string }) =>
      api.post<StudioAssetImportResult>(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`,
        { files, folder }
      ),
    mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
    meta: {
      source: 'imageStudio.hooks.useImportStudioAssetsFromDrive',
      operation: 'create',
      resource: 'image-studio.assets.import',
      domain: 'image_studio',
      mutationKey: QUERY_KEYS.imageStudio.slots(projectId),
      tags: ['image-studio', 'assets', 'import'],
    },
    invalidate: (queryClient) => invalidateImageStudioSlots(queryClient, projectId),
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

export function useSaveSlotScreenshot(
  projectId: string
): MutationResult<void, { slotId: string; dataUrl: string; filename: string }> {
  return createMutationV2<void, { slotId: string; dataUrl: string; filename: string }>({
    mutationFn: async ({ slotId, dataUrl, filename }) => {
      await api.post(`/api/image-studio/slots/${encodeURIComponent(slotId)}/screenshot`, {
        dataUrl,
        filename,
      });
    },
    meta: {
      source: 'imageStudio.hooks.useSaveSlotScreenshot',
      operation: 'update',
      resource: 'image-studio.slots.screenshot',
      domain: 'image_studio',
      tags: ['image-studio', 'slots', 'screenshot'],
    },
    invalidate: (queryClient) => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}
