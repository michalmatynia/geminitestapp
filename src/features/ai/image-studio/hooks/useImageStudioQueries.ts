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
    queryFn: async ({ signal }): Promise<string[]> => {
      const data = await api.get<StudioProjectsResponse>('/api/image-studio/projects', { signal });
      return Array.isArray(data.projects) ? data.projects : [];
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useStudioSlots(projectId: string): UseQueryResult<StudioSlotsResponse, Error> {
  return useQuery({
    queryKey: studioKeys.slots(projectId),
    queryFn: ({ signal }) =>
      api.get<StudioSlotsResponse>(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, {
        signal,
      }),
    enabled: !!projectId,
    staleTime: 15_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useStudioImageModels(): UseQueryResult<StudioImageModelsResponse, Error> {
  return useQuery({
    queryKey: studioKeys.models(),
    queryFn: ({ signal }) => api.get<StudioImageModelsResponse>('/api/image-studio/models', { signal }),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
