'use client';

import type { AiInsightResponse } from '@/shared/contracts/ai-insights';
import {
  type ClearLogsTargetDto as ClearLogsTarget,
  ClearLogsResponseDto as ClearLogsResponse,
  MongoRebuildIndexesResponseDto as MongoRebuildIndexesResponse,
  mongoRebuildIndexesResponseSchema,
} from '@/shared/contracts/observability';
import type { UpdateMutation } from '@/shared/contracts/ui';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateAnalytics,
  invalidateSystemActivity,
  invalidateSystemDiagnostics,
  invalidateSystemLogs,
} from '@/shared/lib/query-invalidation';
import { logsKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';

export function useClearLogsMutation(): UpdateMutation<ClearLogsResponse, ClearLogsTarget> {
  return createDeleteMutationV2({
    mutationFn: (target: ClearLogsTarget) =>
      api.delete<ClearLogsResponse>('/api/system/logs', {
        params: { target },
      }),
    mutationKey: logsKeys.all,
    meta: {
      source: 'observability.hooks.useClearLogsMutation',
      operation: 'delete',
      resource: 'system.logs',
      domain: 'observability',

      tags: ['observability', 'logs', 'delete'],
      description: 'Deletes system logs.'},
    invalidate: async (queryClient, _data, target) => {
      if (target === 'error_logs') {
        await invalidateSystemLogs(queryClient);
        return;
      }

      if (target === 'activity_logs') {
        await invalidateSystemActivity(queryClient);
        return;
      }

      if (target === 'page_access_logs') {
        await invalidateAnalytics(queryClient);
        return;
      }

      await Promise.all([
        invalidateSystemLogs(queryClient),
        invalidateSystemActivity(queryClient),
        invalidateAnalytics(queryClient),
      ]);
    },
  });
}

export function useRebuildIndexesMutation(): UpdateMutation<MongoRebuildIndexesResponse, void> {
  return createCreateMutationV2({
    mutationFn: async () =>
      mongoRebuildIndexesResponseSchema.parse(
        await api.post<MongoRebuildIndexesResponse>('/api/system/diagnostics/mongo-indexes')
      ),
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

export function useRunLogInsight(): UpdateMutation<AiInsightResponse, void> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return createCreateMutationV2({
    mutationFn: () =>
      api.post<AiInsightResponse>('/api/system/logs/insights', {
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

export function useInterpretLog(): UpdateMutation<AiInsightResponse, string> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return createCreateMutationV2({
    mutationFn: (logId: string) =>
      api.post<AiInsightResponse>('/api/system/logs/interpret', {
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
