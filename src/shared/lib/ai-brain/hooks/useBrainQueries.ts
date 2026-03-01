'use client';

import type { AiPathRuntimeAnalyticsSummaryDto as AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths';
import type { AnalyticsSummaryDto as AnalyticsSummary } from '@/shared/contracts/analytics';
import type { AiInsightRecordDto as AiInsightRecord } from '@/shared/contracts/ai-insights';
import type {
  BrainOperationsOverviewResponseDto as BrainOperationsOverviewResponse,
  BrainOperationsRange,
  BrainModelsResponseDto as BrainModelsResponse,
  InsightsSnapshotDto as InsightsSnapshot,
} from '@/shared/contracts/ai-brain';
import type { SystemLogMetricsDto as SystemLogMetrics } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { brainKeys } from '@/shared/lib/query-key-exports';

export { brainKeys };
export type { BrainModelsResponse, InsightsSnapshot, BrainOperationsOverviewResponse };

export function useBrainModels(options?: {
  enabled?: boolean;
  staleTime?: number;
}): SingleQuery<BrainModelsResponse> {
  const queryKey = brainKeys.models();
  return createSingleQueryV2<BrainModelsResponse>({
    queryKey,
    queryFn: () => api.get<BrainModelsResponse>('/api/brain/models'),
    id: 'brain-models',
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60,
    refetchInterval: 1000 * 60,
    meta: {
      source: 'brain.hooks.useBrainModels',
      operation: 'polling',
      resource: 'brain.models',
      domain: 'global',
      queryKey,
      tags: ['brain', 'models'],
    },
  });
}

// Backward-compatibility alias for existing call sites.
export function useOllamaModels(): SingleQuery<BrainModelsResponse> {
  return useBrainModels();
}

export function useBrainOperationsOverview(options?: {
  range?: BrainOperationsRange;
}): SingleQuery<BrainOperationsOverviewResponse> {
  const range = options?.range ?? '1h';
  const queryKey = brainKeys.operationsOverview(range);
  return createSingleQueryV2<BrainOperationsOverviewResponse>({
    queryKey,
    queryFn: () =>
      api.get<BrainOperationsOverviewResponse>('/api/brain/operations/overview', {
        params: { range },
      }),
    id: 'brain-operations-overview',
    staleTime: 10_000,
    refetchInterval: 15_000,
    meta: {
      source: 'brain.hooks.useBrainOperationsOverview',
      operation: 'polling',
      resource: 'brain.operations-overview',
      domain: 'global',
      queryKey,
      tags: ['brain', 'operations-overview'],
    },
  });
}

export function useBrainAnalyticsSummary(): SingleQuery<AnalyticsSummary> {
  const queryKey = brainKeys.analyticsSummary();
  return createSingleQueryV2<AnalyticsSummary>({
    queryKey,
    queryFn: () =>
      api.get<AnalyticsSummary>('/api/analytics/summary', {
        params: { range: '24h', scope: 'all' },
      }),
    id: 'analytics-summary',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainAnalyticsSummary',
      operation: 'polling',
      resource: 'brain.analytics-summary',
      domain: 'global',
      queryKey,
      tags: ['brain', 'analytics-summary'],
    },
  });
}

export function useBrainLogMetrics(): SingleQuery<SystemLogMetrics> {
  const queryKey = brainKeys.logMetrics();
  return createSingleQueryV2<SystemLogMetrics>({
    queryKey,
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<{ metrics?: SystemLogMetrics }>('/api/system/logs/metrics', {
        params: { level: 'error' },
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    id: 'log-metrics',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainLogMetrics',
      operation: 'polling',
      resource: 'brain.log-metrics',
      domain: 'global',
      queryKey,
      tags: ['brain', 'log-metrics'],
    },
  });
}

export function useBrainInsights(): SingleQuery<InsightsSnapshot> {
  const queryKey = brainKeys.insights();
  return createSingleQueryV2<InsightsSnapshot>({
    queryKey,
    queryFn: async (): Promise<InsightsSnapshot> => {
      const [analyticsData, logsData] = await Promise.all([
        api.get<{ insights?: AiInsightRecord[] }>('/api/analytics/insights', {
          params: { limit: 5 },
        }),
        api.get<{ insights?: AiInsightRecord[] }>('/api/system/logs/insights', {
          params: { limit: 5 },
        }),
      ]);
      return {
        analytics: (analyticsData.insights as AiInsightRecord[]) ?? [],
        logs: (logsData.insights as AiInsightRecord[]) ?? [],
      };
    },
    id: 'insights',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainInsights',
      operation: 'polling',
      resource: 'brain.insights',
      domain: 'global',
      queryKey,
      tags: ['brain', 'insights'],
    },
  });
}

export function useBrainRuntimeAnalytics(
  enabled: boolean = true
): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  const queryKey = brainKeys.runtimeAnalytics();
  return createSingleQueryV2<AiPathRuntimeAnalyticsSummary>({
    queryKey,
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const data = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>(
        '/api/ai-paths/runtime-analytics/summary',
        {
          params: { range: '24h' },
        }
      );
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    id: 'runtime-analytics',
    enabled,
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainRuntimeAnalytics',
      operation: 'polling',
      resource: 'brain.runtime-analytics',
      domain: 'global',
      queryKey,
      tags: ['brain', 'runtime-analytics'],
    },
  });
}
