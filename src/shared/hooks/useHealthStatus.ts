'use client';

import { useQuery } from '@tanstack/react-query';

interface HealthStatus {
  ok: boolean;
}

export function useHealthStatus() {
  return useQuery<HealthStatus, Error>({
    queryKey: ['health-status'],
    queryFn: async (): Promise<HealthStatus> => {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      return response.json() as Promise<HealthStatus>;
    },
    // Optional: add specific TanStack Query options for this hook
    staleTime: 1000 * 10, // data is fresh for 10 seconds
    refetchInterval: 1000 * 30, // refetch every 30 seconds
  });
}
