'use no memo';

import type { AiInsightResponse } from '@/shared/contracts/ai-insights';
import {
  type ClearLogsTargetDto as ClearLogsTarget,
  type ClearLogsResponseDto as ClearLogsResponse,
  type MongoRebuildIndexesResponseDto as MongoRebuildIndexesResponse,
  mongoRebuildIndexesResponseSchema,
} from '@/shared/contracts/observability';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { UpdateMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateAnalytics,
  invalidateSystemActivity,
  invalidateSystemDiagnostics,
  invalidateSystemLogs,
} from '@/shared/lib/query-invalidation';
import { logsKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';

// These hooks delegate into TanStack Query mutation factory wrappers. Keep them
// out of React Compiler memoization to avoid dev cache-size mismatches.

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
      if (target === 'error_logs' || target === 'info_logs') {
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

export function useRunLogInsight(
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): UpdateMutation<AiInsightResponse, void> {
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

export function useInterpretLog(
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): UpdateMutation<AiInsightResponse, string> {
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
