'use client';

import type { MutationResult } from '@/shared/contracts/ui';
import { useRealtimeQuery } from '@/shared/hooks/query/useRealtimeQuery';
import { createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { cancelJob, getJobStatus, getJobStatusDetail } from '../api';

import type { UseQueryResult } from '@tanstack/react-query';

export const jobKeys = QUERY_KEYS.jobs;

// Real-time job monitoring
export function useRealtimeJobs(): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(jobKeys.realtime(), getJobStatus, {
    interval: 5000, // 5 second fallback
    enabled: true,
  });
}

// Individual job status with real-time updates
export function useJobStatus(jobId: string): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(jobKeys.status(jobId), () => getJobStatusDetail(jobId), {
    interval: 2000, // 2 second fallback for individual jobs
    enabled: !!jobId,
  });
}

// Cancel job mutation
export function useCancelJob(): MutationResult<{ success: boolean }, string> {
  const mutationKey = jobKeys.all;
  return createCreateMutationV2({
    mutationFn: (jobId) => cancelJob(jobId),
    mutationKey,
    meta: {
      source: 'jobs.hooks.useCancelJob',
      operation: 'create',
      resource: 'jobs.cancel',
      domain: 'jobs',
      mutationKey,
      tags: ['jobs', 'cancel'],
    },
    invalidateKeys: [jobKeys.all],
  });
}
