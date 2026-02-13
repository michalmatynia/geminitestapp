'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { studioKeys } from '@/shared/lib/query-key-exports';

import type { StudioProjectsResponse, StudioSlotsResponse } from '../types';

export { studioKeys };

export type StudioImageModelsResponse = {
  models?: string[];
  source?: 'openai' | 'fallback';
  warning?: string;
};

export function useStudioProjects(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: studioKeys.projects(),
    queryFn: async (): Promise<string[]> => {
      const data = await api.get<StudioProjectsResponse>('/api/image-studio/projects');
      return Array.isArray(data.projects) ? data.projects : [];
    },
    staleTime: 10_000,
  });
}

export function useStudioSlots(projectId: string): UseQueryResult<StudioSlotsResponse, Error> {
  return useQuery({
    queryKey: studioKeys.slots(projectId),
    queryFn: () => api.get<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`),
    enabled: !!projectId,
  });
}

export function useStudioImageModels(): UseQueryResult<StudioImageModelsResponse, Error> {
  return useQuery({
    queryKey: studioKeys.models(),
    queryFn: () => api.get<StudioImageModelsResponse>('/api/image-studio/models'),
    staleTime: 60_000,
  });
}
