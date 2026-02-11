'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { StudioProjectsResponse, StudioSlotsResponse } from '../types';

export const studioKeys = QUERY_KEYS.imageStudio;

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
