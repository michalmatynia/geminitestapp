'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { runsApi } from '@/features/ai/ai-paths/lib';
import type { AiPathRunRecord, AiPathRunNodeRecord, AiPathRunEventRecord } from '@/shared/types/ai-paths';

export const aiPathKeys = {
  all: ['ai-paths'] as const,
  deadLetter: (filters: { status: string; pathId?: string; query?: string; limit: number; offset: number }) => [...aiPathKeys.all, 'dead-letter', filters] as const,
  run: (runId: string) => [...aiPathKeys.all, 'runs', runId] as const,
};

export function useAiPathDeadLetterRuns(filters: { status: string; pathId?: string; query?: string; limit: number; offset: number }): UseQueryResult<{ runs: AiPathRunRecord[]; total: number }, Error> {
  return useQuery({
    queryKey: aiPathKeys.deadLetter(filters),
    queryFn: async () => {
      const response = await runsApi.list(filters);
      if (!response.ok) throw new Error(response.error || 'Failed to load dead-letter runs');
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
  });
}

export function useAiPathRunDetail(runId: string, enabled: boolean = true): UseQueryResult<{ run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] }, Error> {
  return useQuery({
    queryKey: aiPathKeys.run(runId),
    queryFn: async () => {
      const response = await runsApi.get(runId);
      if (!response.ok) throw new Error(response.error || 'Failed to load run details');
      return response.data as { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] };
    },
    enabled: enabled && !!runId,
  });
}

export function useAiPathRequeueMutation(): UseMutationResult<unknown, Error, { runIds?: string[]; pathId?: string | null; query?: string | null; mode: 'resume' | 'replay' }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { runIds?: string[]; pathId?: string | null; query?: string | null; mode: 'resume' | 'replay' }) => {
      const response = await runsApi.requeueDeadLetter(params);
      if (!response.ok) throw new Error(response.error || 'Failed to requeue runs');
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}

export function useAiPathResumeMutation(): UseMutationResult<unknown, Error, { runId: string; mode: 'resume' | 'replay' }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ runId, mode }: { runId: string; mode: 'resume' | 'replay' }) => {
      const response = await runsApi.resume(runId, mode);
      if (!response.ok) throw new Error(response.error || 'Failed to resume run');
      return response.data;
    },
    onSuccess: (_data: unknown, { runId }: { runId: string; mode: 'resume' | 'replay' }) => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}

export function useAiPathRetryNodeMutation(): UseMutationResult<unknown, Error, { runId: string; nodeId: string }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ runId, nodeId }: { runId: string; nodeId: string }) => {
      const response = await runsApi.retryNode(runId, nodeId);
      if (!response.ok) throw new Error(response.error || 'Failed to retry node');
      return response.data;
    },
    onSuccess: (_data: unknown, { runId }: { runId: string; nodeId: string }) => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}
