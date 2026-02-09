'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ActivityLogDto } from '@/shared/dtos/system';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
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

const logKeys = QUERY_KEYS.system.logs;
const activityKeys = QUERY_KEYS.system.activity;

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

export function useSystemActivity(params: { page?: number; pageSize?: number; search?: string } = {}): UseQueryResult<SystemActivityResponse, Error> {
  const { page = 1, pageSize = 10, search } = params;
  return useQuery({
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
    queryKey: QUERY_KEYS.system.diagnostics.mongo,
    queryFn: () => api.get<unknown>('/api/system/diagnostics/mongo-indexes'),
  });
}

export function useLogInsights(options: { limit?: number; enabled?: boolean } = {}): UseQueryResult<{ insights: AiInsightRecord[] }, Error> {
  return useQuery<{ insights: AiInsightRecord[] }, Error>({
    queryKey: logKeys.insights(options.limit),
    queryFn: () => 
      api.get<{ insights: AiInsightRecord[] }>('/api/system/logs/insights', {
        params: { limit: options.limit ?? 5 }
      }),
    enabled: options.enabled ?? true,
  });
}
