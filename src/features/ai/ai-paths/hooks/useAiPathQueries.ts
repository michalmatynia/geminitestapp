'use client';

import { useQueryClient } from '@tanstack/react-query';

import { runsApi, analyticsApi, type AiPathRuntimeAnalyticsSummary } from '@/features/ai/ai-paths/lib';
import {
  invalidateAiPathRunDetail,
  invalidateAiPathRuns,
} from '@/shared/lib/query-invalidation';
import { aiPathKeys } from '@/shared/lib/query-key-exports';
import {
  createSingleQuery,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
import type { AiPathRunRecord, AiPathRunNodeRecord, AiPathRunEventRecord } from '@/shared/types/domain/ai-paths';
import type { SingleQuery, UpdateMutation } from '@/shared/types/query-result-types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function useAiPathRuntimeAnalytics(range: string = '24h', enabled: boolean = true): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  return createSingleQuery({
    queryKey: aiPathKeys.runtimeAnalytics(range),
    queryFn: async () => {
      try {
        const response = await analyticsApi.summary({ range });
        if (!response.ok) throw new Error(response.error || 'Failed to load runtime analytics');
        return response.data;
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathRuntimeAnalytics', range } });
        throw error;
      }
    },
    options: {
      enabled,
      refetchInterval: 30_000,
    },
  });
}

export function useAiPathDeadLetterRuns(filters: { status: string; pathId?: string; query?: string; limit: number; offset: number }): SingleQuery<{ runs: AiPathRunRecord[]; total: number }> {
  return createSingleQuery({
    queryKey: aiPathKeys.deadLetter(filters),
    queryFn: async () => {
      try {
        const response = await runsApi.list(filters);
        if (!response.ok) throw new Error(response.error || 'Failed to load dead-letter runs');
        if (!response.data) throw new Error('No data returned for dead-letter runs');
        return response.data as { runs: AiPathRunRecord[]; total: number };
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathDeadLetterRuns', filters } });
        throw error;
      }
    },
  });
}

export function useAiPathRunDetail(runId: string, enabled: boolean = true): SingleQuery<{ run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] }> {
  return createSingleQuery({
    queryKey: aiPathKeys.run(runId),
    queryFn: async () => {
      try {
        const response = await runsApi.get(runId);
        if (!response.ok) throw new Error(response.error || 'Failed to load run details');
        return response.data as { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] };
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathRunDetail', runId } });
        throw error;
      }
    },
    options: {
      enabled: enabled && !!runId,
    },
  });
}

export function useAiPathRequeueMutation(): UpdateMutation<unknown, { runIds?: string[]; pathId?: string | null; query?: string | null; mode: 'resume' | 'replay' }> {
  const queryClient = useQueryClient();
  
  return createUpdateMutation({
    mutationFn: async (params: { runIds?: string[]; pathId?: string | null; query?: string | null; mode: 'resume' | 'replay' }) => {
      try {
        const response = await runsApi.requeueDeadLetter(params);
        if (!response.ok) throw new Error(response.error || 'Failed to requeue runs');
        return response.data;
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathRequeueMutation', params } });
        throw error;
      }
    },
    options: {
      onSuccess: () => {
        void invalidateAiPathRuns(queryClient);
      },
    },
  });
}

export function useAiPathResumeMutation(): UpdateMutation<unknown, { runId: string; mode: 'resume' | 'replay' }> {
  const queryClient = useQueryClient();
  
  return createUpdateMutation({
    mutationFn: async ({ runId, mode }: { runId: string; mode: 'resume' | 'replay' }) => {
      try {
        const response = await runsApi.resume(runId, mode);
        if (!response.ok) throw new Error(response.error || 'Failed to resume run');
        return response.data;
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathResumeMutation', runId, mode } });
        throw error;
      }
    },
    options: {
      onSuccess: (_data: unknown, { runId }: { runId: string; mode: 'resume' | 'replay' }) => {
        void invalidateAiPathRunDetail(queryClient, runId);
        void invalidateAiPathRuns(queryClient);
      },
    },
  });
}

export function useAiPathRetryNodeMutation(): UpdateMutation<unknown, { runId: string; nodeId: string }> {
  const queryClient = useQueryClient();
  
  return createUpdateMutation({
    mutationFn: async ({ runId, nodeId }: { runId: string; nodeId: string }) => {
      try {
        const response = await runsApi.retryNode(runId, nodeId);
        if (!response.ok) throw new Error(response.error || 'Failed to retry node');
        return response.data;
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathRetryNodeMutation', runId, nodeId } });
        throw error;
      }
    },
    options: {
      onSuccess: (_data: unknown, { runId }: { runId: string; nodeId: string }) => {
        void invalidateAiPathRunDetail(queryClient, runId);
        void invalidateAiPathRuns(queryClient);
      },
    },
  });
}

    
