'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { AiInsightRecord } from '@/shared/types';

import { logKeys } from './useLogQueries';

export function useClearLogsMutation(): UseMutationResult<boolean, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<boolean>('/api/system/logs'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });
}

export function useRebuildIndexesMutation(): UseMutationResult<unknown, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: logKeys.diagnostics });
    },
  });
}

export function useRunLogInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: logKeys.insights() });
    },
  });
}

export function useInterpretLog() {
  return useMutation({
    mutationFn: (logId: string) => 
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', { logId }),
  });
}
