import { useRealtimeQuery } from '@/shared/hooks/query/useRealtimeQuery';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { getJobStatus } from '../api';

import type { UseQueryResult } from '@tanstack/react-query';

export const jobKeys = QUERY_KEYS.jobs;

// Real-time job monitoring
export function useRealtimeJobs(): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(jobKeys.realtime(), getJobStatus, {
    interval: 5000, // 5 second fallback
    enabled: true,
    domain: 'jobs',
  });
}
