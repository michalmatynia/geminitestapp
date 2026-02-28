'use client';

import type { MutationResult, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
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
export function useAiJobStatus(jobId: string | null): SingleQuery<{ job: AiJobStatus } | null> {
  const queryKey = QUERY_KEYS.products.aiJobs.detail(jobId || 'none');
  return createSingleQueryV2({
    id: jobId,
    queryKey,
    queryFn: async (): Promise<{ job: AiJobStatus } | null> => {
      if (!jobId) return null;
      return await api.get<{ job: AiJobStatus }>(`/api/products/ai-jobs/${jobId}`);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const jobData = query.state.data;
      if (
        jobData?.job?.status === 'completed' ||
        jobData?.job?.status === 'failed' ||
        jobData?.job?.status === 'canceled'
      ) {
        return false;
      }
      return 2000;
    },
    meta: {
      source: 'products.hooks.useAiJobStatus',
      operation: 'polling',
      resource: 'products.ai-jobs.status',
      domain: 'products',
      queryKey,
      tags: ['products', 'ai-jobs', 'status'],
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
  const mutationKey = QUERY_KEYS.products.aiJobs.lists();
  return createCreateMutationV2({
    mutationFn: async (params) =>
      await api.post<{ jobId: string }>('/api/products/ai-jobs/enqueue', params),
    mutationKey,
    meta: {
      source: 'products.hooks.useEnqueueAiJobMutation',
      operation: 'create',
      resource: 'products.ai-jobs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'ai-jobs', 'enqueue'],
    },
  });
}

/**
 * Hook to enqueue bulk AI jobs
 */
export function useBulkAiJobsMutation(): MutationResult<
  { count: number },
  { type: string; config: unknown }
> {
  const mutationKey = QUERY_KEYS.products.aiJobs.lists();
  return createCreateMutationV2({
    mutationFn: async (params) =>
      await api.post<{ count: number }>('/api/products/ai-jobs/bulk', params),
    mutationKey,
    meta: {
      source: 'products.hooks.useBulkAiJobsMutation',
      operation: 'create',
      resource: 'products.ai-jobs.bulk',
      domain: 'products',
      mutationKey,
      tags: ['products', 'ai-jobs', 'bulk'],
    },
  });
}
