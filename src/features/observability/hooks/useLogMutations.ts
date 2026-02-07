'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiInsightRecord } from '@/shared/types';

export function useClearLogsMutation(): UseMutationResult<boolean, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<boolean>('/api/system/logs'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.logs.all });
    },
  });
}

export function useRebuildIndexesMutation(): UseMutationResult<unknown, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.diagnostics.all });
    },
  });
}

export function useRunLogInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.logs.all });
    },
  });
}

export function useInterpretLog() {
  return useMutation({
    mutationFn: (logId: string) => 
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', { logId }),
  });
}