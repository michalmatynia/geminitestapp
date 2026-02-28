'use client';

import type { AiInsightRecord } from '@/shared/contracts';
import type {
  SystemLogsResponseDto as SystemLogsResponse,
  SystemActivityResponseDto as SystemActivityResponse,
  SystemLogMetricsResponseDto as SystemLogMetricsResponse,
  ListSystemLogsInputDto as LogFilters,
} from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { logsKeys, activityKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';

export type { LogFilters, SystemLogsResponse, SystemActivityResponse, SystemLogMetricsResponse };

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
          method: filters.method?.trim() || undefined,
          statusCode: filters.statusCode ?? undefined,
          requestId: filters.requestId?.trim() || undefined,
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
      queryKey,
      tags: ['observability', 'logs'],
    },
  });
}

export function useSystemActivity(
  params: { page?: number; pageSize?: number; search?: string } = {}
): SingleQuery<SystemActivityResponse> {
  const { page = 1, pageSize = 10, search } = params;
  const queryKey = activityKeys.list({ page, pageSize, search });
  return createSingleQueryV2({
    id: 'system-activity',
    queryKey,
    queryFn: () =>
      api.get<SystemActivityResponse>('/api/system/activity', {
        params: { page, pageSize, search },
      }),
    meta: {
      source: 'observability.hooks.useSystemActivity',
      operation: 'detail',
      resource: 'system.activity',
      queryKey,
      tags: ['observability', 'activity'],
    },
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
          method: filters.method?.trim() || undefined,
          statusCode: filters.statusCode ?? undefined,
          requestId: filters.requestId?.trim() || undefined,
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
      queryKey,
      tags: ['observability', 'logs', 'metrics'],
    },
  });
}

export function useMongoDiagnostics(): SingleQuery<unknown> {
  const queryKey = diagnosticsKeys.mongo();
  return createSingleQueryV2({
    id: 'mongo-diagnostics',
    queryKey,
    queryFn: () => api.get<unknown>('/api/system/diagnostics/mongo-indexes'),
    meta: {
      source: 'observability.hooks.useMongoDiagnostics',
      operation: 'detail',
      resource: 'system.diagnostics.mongo-indexes',
      queryKey,
      tags: ['observability', 'diagnostics', 'mongo'],
    },
  });
}

export function useLogInsights(
  options: { limit?: number; enabled?: boolean } = {}
): SingleQuery<{ insights: AiInsightRecord[] }> {
  const queryKey = logsKeys.insights(options.limit);
  return createSingleQueryV2({
    id: 'log-insights',
    queryKey,
    queryFn: () =>
      api.get<{ insights: AiInsightRecord[] }>('/api/system/logs/insights', {
        params: { limit: options.limit ?? 5 },
      }),
    enabled: options.enabled ?? true,
    meta: {
      source: 'observability.hooks.useLogInsights',
      operation: 'detail',
      resource: 'system.logs.insights',
      queryKey,
      tags: ['observability', 'logs', 'insights'],
    },
  });
}
