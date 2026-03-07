'use client';

import type {
  ImageStudioModelsResponse,
  ImageStudioProjectRecord,
  StudioProjectsResponse,
  StudioSlotsResponse,
} from '@/shared/contracts/image-studio';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { studioKeys } from '@/shared/lib/query-key-exports';

export { studioKeys };

const normalizeProjectRecord = (entry: unknown): ImageStudioProjectRecord | null => {
  const normalizeCanvasDimension = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const parsed = Math.floor(value);
    if (parsed < 64 || parsed > 32_768) return null;
    return parsed;
  };

  if (typeof entry === 'string') {
    const id = entry.trim();
    if (!id) return null;
    const now = new Date().toISOString();
    return {
      id,
      createdAt: now,
      updatedAt: now,
      canvasWidthPx: null,
      canvasHeightPx: null,
    };
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const record = entry as Record<string, unknown>;
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  if (!id) return null;
  const createdAt =
    typeof record['createdAt'] === 'string' && record['createdAt'].trim()
      ? record['createdAt'].trim()
      : new Date().toISOString();
  const updatedAt =
    typeof record['updatedAt'] === 'string' && record['updatedAt'].trim()
      ? record['updatedAt'].trim()
      : createdAt;
  return {
    id,
    createdAt,
    updatedAt,
    canvasWidthPx: normalizeCanvasDimension(record['canvasWidthPx']),
    canvasHeightPx: normalizeCanvasDimension(record['canvasHeightPx']),
  };
};

export function useStudioProjects(): ListQuery<ImageStudioProjectRecord> {
  const queryKey = studioKeys.projects();
  const queryFn = async (): Promise<ImageStudioProjectRecord[]> => {
    const data = await api.get<StudioProjectsResponse>('/api/image-studio/projects');
    if (!Array.isArray(data.projects)) return [];
    const normalized = data.projects
      .map((entry: unknown) => normalizeProjectRecord(entry))
      .filter((entry): entry is ImageStudioProjectRecord => Boolean(entry));
    const seen = new Set<string>();
    return normalized.filter((project: ImageStudioProjectRecord) => {
      if (seen.has(project.id)) return false;
      seen.add(project.id);
      return true;
    });
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'imageStudio.hooks.useStudioProjects',
      operation: 'list',
      resource: 'image-studio.projects',
      domain: 'image_studio',
      queryKey,
      tags: ['image-studio', 'projects'],
    },
  });
}

export function useStudioSlots(projectId: string): SingleQuery<StudioSlotsResponse> {
  const queryKey = studioKeys.slots(projectId);
  const queryFn = async (): Promise<StudioSlotsResponse> =>
    api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`
    );

  return createSingleQueryV2({
    id: projectId,
    queryKey,
    queryFn,
    enabled: !!projectId,
    staleTime: 60_000,
    // Slot data is frequently mutated outside Studio (e.g. Product Modal sends),
    // but those mutations call invalidateImageStudioSlots() explicitly, so
    // window-focus and mount refetches are redundant and cause refetch storms.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    meta: {
      source: 'imageStudio.hooks.useStudioSlots',
      operation: 'detail',
      resource: 'image-studio.slots',
      domain: 'image_studio',
      queryKey,
      tags: ['image-studio', 'slots'],
    },
  });
}

export function useStudioImageModels(): SingleQuery<ImageStudioModelsResponse> {
  const queryKey = studioKeys.models();
  const queryFn = async (): Promise<ImageStudioModelsResponse> =>
    api.get<ImageStudioModelsResponse>('/api/image-studio/models');

  return createSingleQueryV2({
    id: 'models',
    queryKey,
    queryFn,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'imageStudio.hooks.useStudioImageModels',
      operation: 'detail',
      resource: 'image-studio.models',
      domain: 'image_studio',
      queryKey,
      tags: ['image-studio', 'models'],
    },
  });
}
