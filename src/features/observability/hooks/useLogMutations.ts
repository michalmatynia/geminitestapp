'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation, createDeleteMutation } from '@/shared/lib/query-factories';
import {
  invalidateSystemDiagnostics,
  invalidateSystemLogs,
} from '@/shared/lib/query-invalidation';
import type { AiInsightRecord } from '@/shared/types';
import type { UpdateMutation } from '@/shared/types/query-result-types';

type ClearLogsResponse = {
  deleted: number;
};

export function useClearLogsMutation(): UpdateMutation<ClearLogsResponse, void> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: () => api.delete<ClearLogsResponse>('/api/system/logs'),
    options: {
      onSuccess: () => {
        void invalidateSystemLogs(queryClient);
      },
    },
  });
}

export function useRebuildIndexesMutation(): UpdateMutation<unknown, void> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    options: {
      onSuccess: () => {
        void invalidateSystemDiagnostics(queryClient);
      },
    },
  });
}

export function useRunLogInsight(): UpdateMutation<{ insight: AiInsightRecord }, void> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights'),
    options: {
      onSuccess: () => {
        void invalidateSystemLogs(queryClient);
      },
    },
  });
}

export function useInterpretLog(): UpdateMutation<{ insight: AiInsightRecord }, string> {
  return createCreateMutation({
    mutationFn: (logId: string) => 
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', { logId }),
  });
}
