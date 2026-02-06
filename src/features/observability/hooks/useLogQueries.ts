'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { SystemLogMetrics, SystemLogRecord } from '@/shared/types/system-logs';

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
    queryFn: async (): Promise<SystemLogsResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
      if (filters.level && filters.level !== 'all') params.set('level', filters.level);
      if (filters.query?.trim()) params.set('query', filters.query.trim());
      if (filters.source?.trim()) params.set('source', filters.source.trim());
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/system/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load system logs.');
      return res.json() as Promise<SystemLogsResponse>;
    },
  });
}

export interface SystemLogMetricsResponse {
  metrics?: SystemLogMetrics;
}

export function useSystemLogMetrics(filters: Omit<LogFilters, 'page' | 'pageSize'>): UseQueryResult<SystemLogMetricsResponse, Error> {
  return useQuery({
    queryKey: logKeys.metrics(filters),
    queryFn: async (): Promise<SystemLogMetricsResponse> => {
      const params = new URLSearchParams();
      if (filters.level && filters.level !== 'all') params.set('level', filters.level);
      if (filters.query?.trim()) params.set('query', filters.query.trim());
      if (filters.source?.trim()) params.set('source', filters.source.trim());
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/system/logs/metrics?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load system log metrics.');
      return res.json() as Promise<SystemLogMetricsResponse>;
    },
  });
}

export function useMongoDiagnostics(): UseQueryResult<unknown, Error> {
  return useQuery({
    queryKey: logKeys.diagnostics,
    queryFn: async (): Promise<unknown> => {
      const res = await fetch('/api/system/diagnostics/mongo-indexes');
      if (!res.ok) throw new Error('Failed to load Mongo index diagnostics.');
      return res.json() as Promise<unknown>;
    },
  });
}