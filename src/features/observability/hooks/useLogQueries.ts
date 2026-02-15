'use client';

import {
  createSingleQuery,
} from '@/shared/lib/query-factories';
import { api } from '@/shared/lib/api-client';
import { logsKeys, activityKeys, diagnosticsKeys } from '@/shared/lib/query-key-exports';
import type { SystemLogMetrics, SystemLogRecord, AiInsightRecord } from '@/shared/types';
import type { SingleQuery } from '@/shared/types/query-result-types';
import type { ActivityLogDto } from '@/shared/contracts/system';

export type LogFilters = {
  page?: number;
  pageSize?: number;
  level?: string;
  query?: string;
  source?: string;
  method?: string;
  statusCode?: number | null;
  requestId?: string;
  userId?: string;
  fingerprint?: string;
  category?: string;
  from?: string | null;
  to?: string | null;
};

export interface SystemLogsResponse {
  logs?: SystemLogRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface SystemActivityResponse {
  data: ActivityLogDto[];
  total: number;
  page: number;
  pageSize: number;
}

export function useSystemLogs(filters: LogFilters): SingleQuery<SystemLogsResponse> {
  return createSingleQuery({
    queryKey: logsKeys.list(filters),
    queryFn: () => 
      api.get<SystemLogsResponse>('/api/system/logs', {
        params: {
          page: filters.page,
          pageSize: filters.pageSize,
          level: filters.level !== 'all' ? filters.level : undefined,
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
        }
      }),
  });
}

export function useSystemActivity(params: { page?: number; pageSize?: number; search?: string } = {}): SingleQuery<SystemActivityResponse> {
  const { page = 1, pageSize = 10, search } = params;
  return createSingleQuery({
    queryKey: activityKeys.list({ page, pageSize, search }),
    queryFn: () => 
      api.get<SystemActivityResponse>('/api/system/activity', {
        params: { page, pageSize, search }
      }),
  });
}

export interface SystemLogMetricsResponse {
  metrics?: SystemLogMetrics;
}

export function useSystemLogMetrics(filters: Omit<LogFilters, 'page' | 'pageSize'>): SingleQuery<SystemLogMetricsResponse> {
  return createSingleQuery({
    queryKey: logsKeys.metrics(filters),
    queryFn: () => 
      api.get<SystemLogMetricsResponse>('/api/system/logs/metrics', {
        params: {
          level: filters.level !== 'all' ? filters.level : undefined,
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
        }
      }),
  });
}

export function useMongoDiagnostics(): SingleQuery<unknown> {
  return createSingleQuery({
    queryKey: diagnosticsKeys.mongo,
    queryFn: () => api.get<unknown>('/api/system/diagnostics/mongo-indexes'),
  });
}

export function useLogInsights(options: { limit?: number; enabled?: boolean } = {}): SingleQuery<{ insights: AiInsightRecord[] }> {
  return createSingleQuery({
    queryKey: logsKeys.insights(options.limit),
    queryFn: () => 
      api.get<{ insights: AiInsightRecord[] }>('/api/system/logs/insights', {
        params: { limit: options.limit ?? 5 }
      }),
    options: {
      enabled: options.enabled ?? true,
    }
  });
}
