'use client';

import { useQuery, useMutation, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

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
      const res = await fetch(`/api/products/ai-jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job status');
      return res.json() as Promise<{ job: AiJobStatus }>;
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
    mutationFn: async (params): Promise<{ jobId: string }> => {
      const res = await fetch('/api/products/ai-jobs/enqueue', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });
      const data = await res.json() as { jobId: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to enqueue job');
      return data;
    },
  });
}

/**
 * Hook to enqueue bulk AI jobs
 */
export function useBulkAiJobs(): UseMutationResult<{ count: number }, Error, { type: string; config: unknown }> {
  return useMutation({
    mutationFn: async (params): Promise<{ count: number }> => {
      const res = await fetch('/api/products/ai-jobs/bulk', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });
      const data = await res.json() as { count: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to queue bulk jobs');
      return data;
    },
  });
}
