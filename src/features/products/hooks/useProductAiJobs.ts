'use client';

import { useQuery, useMutation, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export interface AiJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  result?: unknown;
  errorMessage?: string;
  progress?: number;
}

/**
 * Hook to poll AI job status
 */
export function useAiJobStatus(jobId: string | null): UseQueryResult<{ job: AiJobStatus } | null, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.products.aiJobs.detail(jobId || 'none'),
    queryFn: async (): Promise<{ job: AiJobStatus } | null> => {
      if (!jobId) return null;
      return await api.get<{ job: AiJobStatus }>(`/api/products/ai-jobs/${jobId}`);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as { job: AiJobStatus } | undefined;
      if (data?.job?.status === 'completed' || data?.job?.status === 'failed' || data?.job?.status === 'canceled') {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook to enqueue a new AI job
 */
export function useEnqueueAiJob(): UseMutationResult<{ jobId: string }, Error, { productId: string; type: string; payload: unknown }> {
  return useMutation({
    mutationFn: async (params): Promise<{ jobId: string }> =>
      await api.post<{ jobId: string }>('/api/products/ai-jobs/enqueue', params),
  });
}

/**
 * Hook to enqueue bulk AI jobs
 */
export function useBulkAiJobs(): UseMutationResult<{ count: number }, Error, { type: string; config: unknown }> {
  return useMutation({
    mutationFn: async (params): Promise<{ count: number }> =>
      await api.post<{ count: number }>('/api/products/ai-jobs/bulk', params),
  });
}
