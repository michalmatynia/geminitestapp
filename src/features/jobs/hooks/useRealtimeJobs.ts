'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useRealtimeQuery } from '@/shared/hooks/query/useRealtimeQuery';
import { getJobStatus, getJobStatusDetail, cancelJob } from '../api';

import type { UseQueryResult } from '@tanstack/react-query';

export const jobKeys = {
  all: ['jobs'] as const,
  realtime: ['jobs', 'realtime'] as const,
  status: (id: string) => ['jobs', 'status', id] as const,
};

// Real-time job monitoring
export function useRealtimeJobs(): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(
    jobKeys.realtime,
    getJobStatus,
    {
      interval: 5000, // 5 second fallback
      enabled: true,
    }
  );
}

// Individual job status with real-time updates
export function useJobStatus(jobId: string): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(
    jobKeys.status(jobId),
    () => getJobStatusDetail(jobId),
    {
      interval: 2000, // 2 second fallback for individual jobs
      enabled: !!jobId,
    }
  );
}

// Cancel job mutation
export function useCancelJob(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelJob,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}
