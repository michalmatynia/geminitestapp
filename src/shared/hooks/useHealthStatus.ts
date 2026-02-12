'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

interface HealthStatus {
  ok: boolean;
}

export function useHealthStatus() {
  return useQuery<HealthStatus, Error>({
    queryKey: QUERY_KEYS.health.status,
    queryFn: async (): Promise<HealthStatus> =>
      await api.get<HealthStatus>('/api/health'),
    // Optional: add specific TanStack Query options for this hook
    staleTime: 1000 * 10, // data is fresh for 10 seconds
    refetchInterval: 1000 * 30, // refetch every 30 seconds
  });
}
