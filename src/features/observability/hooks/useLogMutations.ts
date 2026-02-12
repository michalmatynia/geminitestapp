'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  invalidateSystemDiagnostics,
  invalidateSystemLogs,
} from '@/shared/lib/query-invalidation';
import type { AiInsightRecord } from '@/shared/types';

type ClearLogsResponse = {
  deleted: number;
};

export function useClearLogsMutation(): UseMutationResult<ClearLogsResponse, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<ClearLogsResponse>('/api/system/logs'),
    onSuccess: () => {
      void invalidateSystemLogs(queryClient);
    },
  });
}

export function useRebuildIndexesMutation(): UseMutationResult<unknown, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    onSuccess: () => {
      void invalidateSystemDiagnostics(queryClient);
    },
  });
}

export function useRunLogInsight(): UseMutationResult<{ insight: AiInsightRecord }, Error, void> {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights'),

    onSuccess: () => {

      void invalidateSystemLogs(queryClient);

    },

  });

}



export function useInterpretLog(): UseMutationResult<{ insight: AiInsightRecord }, Error, string> {

  return useMutation({

    mutationFn: (logId: string) => 

      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', { logId }),

  });

}
