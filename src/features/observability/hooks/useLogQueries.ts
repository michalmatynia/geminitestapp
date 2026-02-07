'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { SystemLogMetrics, SystemLogRecord, AiInsightRecord } from '@/shared/types';

export type LogFilters = {
  page?: number;
  pageSize?: number;
  level?: string;
  query?: string;
  source?: string;
  from?: string | null;
  to?: string | null;
};

export const logKeys = {
  all: ['system-logs'] as const,
  list: (filters: LogFilters) => ['system-logs', 'list', filters] as const,
  metrics: (filters: Omit<LogFilters, 'page' | 'pageSize'>) => ['system-logs', 'metrics', filters] as const,
  diagnostics: ['mongo-index-diagnostics'] as const,
  insights: () => ['system-logs', 'insights'] as const,
};

export interface SystemLogsResponse {
  logs?: SystemLogRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export function useSystemLogs(filters: LogFilters): UseQueryResult<SystemLogsResponse, Error> {
  return useQuery({
    queryKey: logKeys.list(filters),
    queryFn: () => 
      api.get<SystemLogsResponse>('/api/system/logs', {
        params: {
          page: filters.page,
          pageSize: filters.pageSize,
          level: filters.level !== 'all' ? filters.level : undefined,
          query: filters.query?.trim() || undefined,
          source: filters.source?.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }
      }),
  });
}

export interface SystemLogMetricsResponse {
  metrics?: SystemLogMetrics;
}

export function useSystemLogMetrics(filters: Omit<LogFilters, 'page' | 'pageSize'>): UseQueryResult<SystemLogMetricsResponse, Error> {
  return useQuery({
    queryKey: logKeys.metrics(filters),
    queryFn: () => 
      api.get<SystemLogMetricsResponse>('/api/system/logs/metrics', {
        params: {
          level: filters.level !== 'all' ? filters.level : undefined,
          query: filters.query?.trim() || undefined,
          source: filters.source?.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }
      }),
  });
}

export function useMongoDiagnostics(): UseQueryResult<unknown, Error> {
  return useQuery({
    queryKey: logKeys.diagnostics,
    queryFn: () => api.get<unknown>('/api/system/diagnostics/mongo-indexes'),
  });
}

export function useLogInsights(options: { limit?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: logKeys.insights(),
    queryFn: () => 
      api.get<{ insights: AiInsightRecord[] }>('/api/system/logs/insights', {
        params: { limit: options.limit ?? 5 }
      }),
    enabled: options.enabled,
  });
}