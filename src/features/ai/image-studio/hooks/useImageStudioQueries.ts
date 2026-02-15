'use client';

import { api } from '@/shared/lib/api-client';
import {
  createListQuery,
  createSingleQuery,
} from '@/shared/lib/query-factories';
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
  return createListQuery({
    queryKey: studioKeys.projects(),
    queryFn: async (): Promise<string[]> => {
      const data = await api.get<StudioProjectsResponse>('/api/image-studio/projects');
      return Array.isArray(data.projects) ? data.projects : [];
    },
    options: {
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  });
}

export function useStudioSlots(projectId: string): SingleQuery<StudioSlotsResponse> {
  return createSingleQuery({
    queryKey: studioKeys.slots(projectId),
    queryFn: () =>
      api.get<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`),
    options: {
      enabled: !!projectId,
      staleTime: 15_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  });
}

export function useStudioImageModels(): SingleQuery<StudioImageModelsResponse> {
  return createSingleQuery({
    queryKey: studioKeys.models(),
    queryFn: () => api.get<StudioImageModelsResponse>('/api/image-studio/models'),
    options: {
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  });
}
