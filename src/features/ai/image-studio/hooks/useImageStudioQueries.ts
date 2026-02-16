'use client';

import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { studioKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery 
} from '@/shared/types/query-result-types';

import type { StudioProjectsResponse, StudioSlotsResponse } from '../types';

export { studioKeys };

export type StudioImageModelsResponse = {
  models?: string[];
  source?: 'openai' | 'fallback';
  warning?: string;
};

export function useStudioProjects(): ListQuery<string> {
  const queryKey = studioKeys.projects();
  const queryFn = async (): Promise<string[]> => {
    const data = await api.get<StudioProjectsResponse>('/api/image-studio/projects');
    return Array.isArray(data.projects) ? data.projects : [];
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
    api.get<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`);

  return createSingleQueryV2({
    id: projectId,
    queryKey,
    queryFn,
    enabled: !!projectId,
    staleTime: 15_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

export function useStudioImageModels(): SingleQuery<StudioImageModelsResponse> {
  const queryKey = studioKeys.models();
  const queryFn = async (): Promise<StudioImageModelsResponse> =>
    api.get<StudioImageModelsResponse>('/api/image-studio/models');

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
