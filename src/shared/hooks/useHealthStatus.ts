/**
 * Health Status Hook
 * 
 * React hook for monitoring application health status with automatic polling.
 * Provides:
 * - Real-time health status monitoring
 * - Configurable polling intervals for continuous monitoring
 * - Stale-while-revalidate caching strategy
 * - Error handling and retry logic
 * - Integration with observability system
 */

import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

interface HealthStatus {
  ok: boolean;
}

export function useHealthStatus(): SingleQuery<HealthStatus> {
  return useSingleQueryV2<HealthStatus>({
    id: 'health-status',
    queryKey: QUERY_KEYS.health.status(),
    queryFn: async (): Promise<HealthStatus> => await api.get<HealthStatus>('/api/health'),
    staleTime: 1000 * 10, // data is fresh for 10 seconds
    refetchInterval: 1000 * 30, // refetch every 30 seconds
    meta: {
      source: 'shared.hooks.useHealthStatus',
      operation: 'polling',
      resource: 'health-status',
      domain: 'global',
      tags: ['health', 'polling'],
      description: 'Polls health status.'},
  });
}
