'use client';

import type { AiInsightsResponse } from '@/shared/contracts/ai-insights';
import type {
  SystemLogsResponseDto as SystemLogsResponse,
  SystemActivityResponseDto as SystemActivityResponse,
  SystemLogMetricsResponseDto as SystemLogMetricsResponse,
  MongoDiagnosticsResponseDto as MongoDiagnosticsResponse,
  ListSystemLogsInputDto as LogFilters,
} from '@/shared/contracts/observability';
import { mongoDiagnosticsResponseSchema } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { logsKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';

export type { LogFilters, SystemLogsResponse, SystemActivityResponse, SystemLogMetricsResponse };
export { useSystemActivity } from '@/shared/hooks/useSystemActivity';

export function useSystemLogs(filters: LogFilters): SingleQuery<SystemLogsResponse> {
  const queryKey = logsKeys.list(filters);
  return createSingleQueryV2({
    id: 'system-logs',
    queryKey,
    queryFn: () =>
      api.get<SystemLogsResponse>('/api/system/logs', {
        params: {
          page: filters.page,
          pageSize: filters.pageSize,
          level: filters.level || undefined,
          query: filters.query?.trim() || undefined,
          source: filters.source?.trim() || undefined,
          service: filters.service?.trim() || undefined,
          method: filters.method?.trim() || undefined,
          statusCode: filters.statusCode ?? undefined,
          minDurationMs: filters.minDurationMs ?? undefined,
          requestId: filters.requestId?.trim() || undefined,
          traceId: filters.traceId?.trim() || undefined,
          correlationId: filters.correlationId?.trim() || undefined,
          userId: filters.userId?.trim() || undefined,
          fingerprint: filters.fingerprint?.trim() || undefined,
          category: filters.category?.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        },
      }),
    meta: {
      source: 'observability.hooks.useSystemLogs',
      operation: 'detail',
      resource: 'system.logs',
      domain: 'observability',
      queryKey,
      tags: ['observability', 'logs'],
      description: 'Loads system logs.'},
  });
}

export function useSystemLogMetrics(
  filters: Omit<LogFilters, 'page' | 'pageSize'>
): SingleQuery<SystemLogMetricsResponse> {
  const queryKey = logsKeys.metrics(filters);
  return createSingleQueryV2({
    id: 'system-log-metrics',
    queryKey,
    queryFn: () =>
      api.get<SystemLogMetricsResponse>('/api/system/logs/metrics', {
        params: {
          level: filters.level || undefined,
          query: filters.query?.trim() || undefined,
          source: filters.source?.trim() || undefined,
          service: filters.service?.trim() || undefined,
          method: filters.method?.trim() || undefined,
          statusCode: filters.statusCode ?? undefined,
          minDurationMs: filters.minDurationMs ?? undefined,
          requestId: filters.requestId?.trim() || undefined,
          traceId: filters.traceId?.trim() || undefined,
          correlationId: filters.correlationId?.trim() || undefined,
          userId: filters.userId?.trim() || undefined,
          fingerprint: filters.fingerprint?.trim() || undefined,
          category: filters.category?.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        },
      }),
    meta: {
      source: 'observability.hooks.useSystemLogMetrics',
      operation: 'detail',
      resource: 'system.logs.metrics',
      domain: 'observability',
      queryKey,
      tags: ['observability', 'logs', 'metrics'],
      description: 'Loads system logs metrics.'},
  });
}

export function useMongoDiagnostics(): SingleQuery<MongoDiagnosticsResponse> {
  const queryKey = diagnosticsKeys.mongo();
  return createSingleQueryV2({
    id: 'mongo-diagnostics',
    queryKey,
    queryFn: async () =>
      mongoDiagnosticsResponseSchema.parse(
        await api.get<MongoDiagnosticsResponse>('/api/system/diagnostics/mongo-indexes')
      ),
    meta: {
      source: 'observability.hooks.useMongoDiagnostics',
      operation: 'detail',
      resource: 'system.diagnostics.mongo-indexes',
      domain: 'observability',
      queryKey,
      tags: ['observability', 'diagnostics', 'mongo'],
      description: 'Loads system diagnostics mongo indexes.'},
  });
}

export function useLogInsights(
  options: { limit?: number; enabled?: boolean } = {}
): SingleQuery<AiInsightsResponse> {
  const queryKey = logsKeys.insights(options.limit);
  return createSingleQueryV2({
    id: 'log-insights',
    queryKey,
    queryFn: () =>
      api.get<AiInsightsResponse>('/api/system/logs/insights', {
        params: { limit: options.limit ?? 5 },
      }),
    enabled: options.enabled ?? true,
    meta: {
      source: 'observability.hooks.useLogInsights',
      operation: 'detail',
      resource: 'system.logs.insights',
      domain: 'observability',
      queryKey,
      tags: ['observability', 'logs', 'insights'],
      description: 'Loads system logs insights.'},
  });
}
