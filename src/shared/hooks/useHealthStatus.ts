'use client';

import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { SingleQuery } from '@/shared/types/query-result-types';

interface HealthStatus {
  ok: boolean;
}

export function useHealthStatus(): SingleQuery<HealthStatus> {
  return createSingleQueryV2<HealthStatus>({
    id: 'health-status',
    queryKey: QUERY_KEYS.health.status(),
    queryFn: async (): Promise<HealthStatus> =>
      await api.get<HealthStatus>('/api/health'),
    staleTime: 1000 * 10, // data is fresh for 10 seconds
    refetchInterval: 1000 * 30, // refetch every 30 seconds
    meta: {
      source: 'shared.hooks.useHealthStatus',
      operation: 'polling',
      resource: 'health-status',
      domain: 'global',
      tags: ['health', 'polling'],
    },
  });
}
