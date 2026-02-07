'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export interface AiJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  result?: any;
  errorMessage?: string;
  progress?: number;
}

/**
 * Hook to poll AI job status
 */
export function useAiJobStatus(jobId: string | null): UseQueryResult<{ job: AiJobStatus }, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.products.aiJobs.detail(jobId || 'none'),
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetch(`/api/products/ai-jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job status');
      return res.json();
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
export function useEnqueueAiJob(): UseMutationResult<{ jobId: string }, Error, { productId: string; type: string; payload: any }> {
  return useMutation({
    mutationFn: async (params) => {
      const res = await fetch('/api/products/ai-jobs/enqueue', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enqueue job');
      return data;
    },
  });
}

/**
 * Hook to enqueue bulk AI jobs
 */
export function useBulkAiJobs(): UseMutationResult<{ count: number }, Error, { type: string; config: any }> {
  return useMutation({
    mutationFn: async (params) => {
      const res = await fetch('/api/products/ai-jobs/bulk', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue bulk jobs');
      return data;
    },
  });
}
