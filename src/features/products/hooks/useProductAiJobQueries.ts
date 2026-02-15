'use client';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation, createSingleQuery } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { MutationResult, SingleQuery } from '@/shared/types/query-result-types';

export interface AiJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  result?: unknown;
  errorMessage?: string;
  progress?: number;
}

/**
 * Hook to poll AI job status
 */
export function useAiJobStatus(jobId: string | null): SingleQuery<{ job: AiJobStatus } | null> {
  return createSingleQuery({
    queryKey: QUERY_KEYS.products.aiJobs.detail(jobId || 'none'),
    queryFn: async (): Promise<{ job: AiJobStatus } | null> => {
      if (!jobId) return null;
      return await api.get<{ job: AiJobStatus }>(`/api/products/ai-jobs/${jobId}`);
    },
    options: {
      enabled: !!jobId,
      refetchInterval: (query) => {
        const data = query.state.data as { job: AiJobStatus } | undefined;
        if (data?.job?.status === 'completed' || data?.job?.status === 'failed' || data?.job?.status === 'canceled') {
          return false;
        }
        return 2000;
      },
      refetchIntervalInBackground: true,
    },
  });
}

/**
 * Hook to enqueue a new AI job
 */
export function useEnqueueAiJobMutation(): MutationResult<
  { jobId: string },
  { productId: string; type: string; payload: unknown }
  > {
  return createCreateMutation({
    mutationFn: async (params) =>
      await api.post<{ jobId: string }>('/api/products/ai-jobs/enqueue', params),
  });
}

/**
 * Hook to enqueue bulk AI jobs
 */
export function useBulkAiJobsMutation(): MutationResult<
  { count: number },
  { type: string; config: unknown }
  > {
  return createCreateMutation({
    mutationFn: async (params) =>
      await api.post<{ count: number }>('/api/products/ai-jobs/bulk', params),
  });
}
