'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateSystemDiagnostics,
  invalidateSystemLogs,
} from '@/shared/lib/query-invalidation';
import { logsKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';
import type { AiInsightRecord } from '@/shared/types';
import type { UpdateMutation } from '@/shared/types/query-result-types';

type ClearLogsResponse = {
  deleted: number;
};

export function useClearLogsMutation(): UpdateMutation<ClearLogsResponse, void> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: () => api.delete<ClearLogsResponse>('/api/system/logs'),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useClearLogsMutation',
      operation: 'delete',
      resource: 'system.logs',
      mutationKey: logsKeys.all,
      tags: ['observability', 'logs', 'delete'],
    },
    onSuccess: () => {
      void invalidateSystemLogs(queryClient);
    },
  });
}

export function useRebuildIndexesMutation(): UpdateMutation<unknown, void> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    mutationKey: diagnosticsKeys.mongo(),
    meta: {
      source: 'observability.hooks.useRebuildIndexesMutation',
      operation: 'create',
      resource: 'system.diagnostics.mongo-indexes',
      mutationKey: diagnosticsKeys.mongo(),
      tags: ['observability', 'diagnostics', 'mongo'],
    },
    onSuccess: () => {
      void invalidateSystemDiagnostics(queryClient);
    },
  });
}

export function useRunLogInsight(): UpdateMutation<{ insight: AiInsightRecord }, void> {
  const queryClient = useQueryClient();

  return createCreateMutationV2({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights'),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useRunLogInsight',
      operation: 'create',
      resource: 'system.logs.insights',
      mutationKey: logsKeys.all,
      tags: ['observability', 'logs', 'insights'],
    },
    onSuccess: () => {
      void invalidateSystemLogs(queryClient);
    },
  });
}

export function useInterpretLog(): UpdateMutation<{ insight: AiInsightRecord }, string> {
  return createCreateMutationV2({
    mutationFn: (logId: string) => 
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', { logId }),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useInterpretLog',
      operation: 'create',
      resource: 'system.logs.interpret',
      mutationKey: logsKeys.all,
      tags: ['observability', 'logs', 'interpret'],
    },
  });
}
