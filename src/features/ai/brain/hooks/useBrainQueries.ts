import type {
  BrainOperationsOverviewResponse,
  BrainOperationsRange,
  BrainModelsResponse,
  InsightsSnapshot,
} from '@/shared/contracts/ai-brain';
import type { AiInsightsResponse } from '@/shared/contracts/ai-insights';
import {
  aiPathRuntimeAnalyticsSummaryResponseSchema,
  type AiPathRuntimeAnalyticsSummary,
  type AiPathRuntimeAnalyticsSummaryResponse,
} from '@/shared/contracts/ai-paths';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import type {
  SystemLogMetrics,
  SystemLogMetricsResponseDto as SystemLogMetricsResponse,
} from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { brainKeys } from '@/shared/lib/query-key-exports';

export { brainKeys };
export type { BrainModelsResponse, InsightsSnapshot, BrainOperationsOverviewResponse };

const INSIGHTS_LIMIT = 5;
const EMPTY_INSIGHTS_RESPONSE: AiInsightsResponse = { insights: [] };

export async function fetchBrainInsightsSnapshot(options?: {
  includeRuntimeAnalytics?: boolean;
}): Promise<InsightsSnapshot> {
  const includeRuntimeAnalytics = options?.includeRuntimeAnalytics ?? true;
  const runtimeInsightsPromise = includeRuntimeAnalytics
    ? api
        .get<AiInsightsResponse>('/api/ai-paths/runtime-analytics/insights', {
          params: { limit: INSIGHTS_LIMIT },
        })
        .catch(() => EMPTY_INSIGHTS_RESPONSE)
    : Promise.resolve(EMPTY_INSIGHTS_RESPONSE);

  const [analyticsData, logsData, runtimeData] = await Promise.all([
    api.get<AiInsightsResponse>('/api/analytics/insights', {
      params: { limit: INSIGHTS_LIMIT },
    }),
    api.get<AiInsightsResponse>('/api/system/logs/insights', {
      params: { limit: INSIGHTS_LIMIT },
    }),
    runtimeInsightsPromise,
  ]);

  return {
    analytics: analyticsData.insights,
    runtimeAnalytics: runtimeData.insights,
    logs: logsData.insights,
  };
}

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
      description: 'Polls the AI Brain model catalog.',
    },
  });
}

export function useBrainOperationsOverview(options?: {
  range?: BrainOperationsRange;
  enabled?: boolean;
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
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    refetchInterval: 15_000,
    meta: {
      source: 'brain.hooks.useBrainOperationsOverview',
      operation: 'polling',
      resource: 'brain.operations-overview',
      domain: 'global',
      queryKey,
      tags: ['brain', 'operations-overview'],
      description: 'Polls the AI Brain operations overview for the selected range.',
    },
  });
}

export function useBrainAnalyticsSummary(enabled: boolean = true): SingleQuery<AnalyticsSummary> {
  const queryKey = brainKeys.analyticsSummary();
  return createSingleQueryV2<AnalyticsSummary>({
    queryKey,
    queryFn: () =>
      api.get<AnalyticsSummary>('/api/analytics/summary', {
        params: { range: '24h', scope: 'all' },
      }),
    id: 'analytics-summary',
    enabled,
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainAnalyticsSummary',
      operation: 'polling',
      resource: 'brain.analytics-summary',
      domain: 'global',
      queryKey,
      tags: ['brain', 'analytics-summary'],
      description: 'Polls the cross-system analytics summary used by AI Brain.',
    },
  });
}

export function useBrainLogMetrics(enabled: boolean = true): SingleQuery<SystemLogMetrics> {
  const queryKey = brainKeys.logMetrics();
  return createSingleQueryV2<SystemLogMetrics>({
    queryKey,
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<SystemLogMetricsResponse>('/api/system/logs/metrics', {
        params: { level: 'error' },
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    id: 'log-metrics',
    enabled,
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainLogMetrics',
      operation: 'polling',
      resource: 'brain.log-metrics',
      domain: 'global',
      queryKey,
      tags: ['brain', 'log-metrics'],
      description: 'Polls error log metrics surfaced in the AI Brain dashboard.',
    },
  });
}

export function useBrainInsights(
  includeRuntimeAnalytics: boolean = true,
  enabled: boolean = true
): SingleQuery<InsightsSnapshot> {
  const queryKey = brainKeys.insights();
  return createSingleQueryV2<InsightsSnapshot>({
    queryKey,
    queryFn: () => fetchBrainInsightsSnapshot({ includeRuntimeAnalytics }),
    id: 'insights',
    enabled,
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainInsights',
      operation: 'polling',
      resource: 'brain.insights',
      domain: 'global',
      queryKey,
      tags: ['brain', 'insights'],
      description: 'Polls the combined AI Brain insights snapshot.',
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
      const data = aiPathRuntimeAnalyticsSummaryResponseSchema.parse(
        await api.get<AiPathRuntimeAnalyticsSummaryResponse>(
          '/api/ai-paths/runtime-analytics/summary',
          {
            params: { range: '24h' },
          }
        )
      );
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
      description: 'Polls AI Paths runtime analytics for the AI Brain dashboard.',
    },
  });
}
