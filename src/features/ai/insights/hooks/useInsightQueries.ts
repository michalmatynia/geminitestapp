import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import type {
  AiInsightRecord,
  AiInsightResponse,
  AiInsightsResponse,
} from '@/shared/contracts/ai-insights';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useAnalyticsInsightsQuery(): ListQuery<AiInsightRecord, AiInsightsResponse> {
  const queryKey = QUERY_KEYS.ai.insights.analytics();
  return createListQueryV2<AiInsightRecord, AiInsightsResponse>({
    queryKey,
    queryFn: () =>
      api.get<AiInsightsResponse>('/api/analytics/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useAnalyticsInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.analytics',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'analytics'],
      description: 'Loads ai insights analytics.'},
  });
}

export function useLogInsightsQuery(): ListQuery<AiInsightRecord, AiInsightsResponse> {
  const queryKey = QUERY_KEYS.ai.insights.logs();
  return createListQueryV2<AiInsightRecord, AiInsightsResponse>({
    queryKey,
    queryFn: () =>
      api.get<AiInsightsResponse>('/api/system/logs/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useLogInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.logs',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'logs'],
      description: 'Loads ai insights logs.'},
  });
}

export function useRuntimeAnalyticsInsightsQuery(): ListQuery<
  AiInsightRecord,
  AiInsightsResponse
> {
  const queryKey = QUERY_KEYS.ai.insights.runtimeAnalytics();
  return createListQueryV2<AiInsightRecord, AiInsightsResponse>({
    queryKey,
    queryFn: () =>
      api.get<AiInsightsResponse>('/api/ai-paths/runtime-analytics/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useRuntimeAnalyticsInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.runtime-analytics',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'runtime-analytics'],
      description: 'Loads ai insights runtime analytics.'},
  });
}

export function useRunAnalyticsInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const mutationKey = QUERY_KEYS.ai.insights.analytics();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<AiInsightResponse>('/api/analytics/insights', {
        ...(contextRegistry ? { contextRegistry } : {}),
      });
      return data.insight;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunAnalyticsInsightMutation',
      operation: 'create',
      resource: 'ai.insights.analytics',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'analytics', 'run'],
      description: 'Creates ai insights analytics.'},
    invalidateKeys: [QUERY_KEYS.ai.insights.analytics()],
  });
}

export function useRunLogInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const mutationKey = QUERY_KEYS.ai.insights.logs();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<AiInsightResponse>('/api/system/logs/insights', {
        ...(contextRegistry ? { contextRegistry } : {}),
      });
      return data.insight;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunLogInsightMutation',
      operation: 'create',
      resource: 'ai.insights.logs',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'logs', 'run'],
      description: 'Creates ai insights logs.'},
    invalidateKeys: [QUERY_KEYS.ai.insights.logs()],
  });
}

export function useRunRuntimeAnalyticsInsightMutation(): MutationResult<
  AiInsightRecord | null,
  void
  > {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const mutationKey = QUERY_KEYS.ai.insights.runtimeAnalytics();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<AiInsightResponse>('/api/ai-paths/runtime-analytics/insights', {
        ...(contextRegistry ? { contextRegistry } : {}),
      });
      return data.insight;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunRuntimeAnalyticsInsightMutation',
      operation: 'create',
      resource: 'ai.insights.runtime-analytics',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'runtime-analytics', 'run'],
      description: 'Creates ai insights runtime analytics.'},
    invalidateKeys: [QUERY_KEYS.ai.insights.runtimeAnalytics()],
  });
}
