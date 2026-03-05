'use client';

import { useRealtimeQuery } from '@/shared/hooks/query/useRealtimeQuery';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { getJobStatus, getJobStatusDetail } from '../api';

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

// Individual job status with real-time updates
export function useJobStatus(jobId: string): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(jobKeys.status(jobId), () => getJobStatusDetail(jobId), {
    interval: 2000, // 2 second fallback for individual jobs
    enabled: !!jobId,
    domain: 'jobs',
  });
}
