'use client';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import type { AiInsightRecord } from '@/shared/contracts';
import { ClearLogsResponseDto as ClearLogsResponse } from '@/shared/contracts/observability';
import type { UpdateMutation } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateSystemDiagnostics, invalidateSystemLogs } from '@/shared/lib/query-invalidation';
import { logsKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';

export function useClearLogsMutation(): UpdateMutation<ClearLogsResponse, void> {
  return createDeleteMutationV2({
    mutationFn: () => api.delete<ClearLogsResponse>('/api/system/logs'),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useClearLogsMutation',
      operation: 'delete',
      resource: 'system.logs',
      domain: 'observability',

      tags: ['observability', 'logs', 'delete'],
      description: 'Deletes system logs.'},
    invalidate: (queryClient) => invalidateSystemLogs(queryClient),
  });
}

export function useRebuildIndexesMutation(): UpdateMutation<unknown, void> {
  return createCreateMutationV2({
    mutationFn: () => api.post<unknown>('/api/system/diagnostics/mongo-indexes'),
    mutationKey: diagnosticsKeys.mongo(),
    meta: {
      source: 'observability.hooks.useRebuildIndexesMutation',
      operation: 'create',
      resource: 'system.diagnostics.mongo-indexes',
      domain: 'observability',

      tags: ['observability', 'diagnostics', 'mongo'],
      description: 'Creates system diagnostics mongo indexes.'},
    invalidate: (queryClient) => invalidateSystemDiagnostics(queryClient),
  });
}

export function useRunLogInsight(): UpdateMutation<{ insight: AiInsightRecord }, void> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return createCreateMutationV2({
    mutationFn: () =>
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/insights', {
        ...(contextRegistry ? { contextRegistry } : {}),
      }),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useRunLogInsight',
      operation: 'create',
      resource: 'system.logs.insights',
      domain: 'observability',

      tags: ['observability', 'logs', 'insights'],
      description: 'Creates system logs insights.'},
    invalidate: (queryClient) => invalidateSystemLogs(queryClient),
  });
}

export function useInterpretLog(): UpdateMutation<{ insight: AiInsightRecord }, string> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return createCreateMutationV2({
    mutationFn: (logId: string) =>
      api.post<{ insight: AiInsightRecord }>('/api/system/logs/interpret', {
        logId,
        ...(contextRegistry ? { contextRegistry } : {}),
      }),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useInterpretLog',
      operation: 'create',
      resource: 'system.logs.interpret',
      domain: 'observability',

      tags: ['observability', 'logs', 'interpret'],
      description: 'Creates system logs interpret.'},
  });
}
