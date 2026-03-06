'use client';

import type { AiInsightRecord } from '@/shared/contracts';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type InsightResponse = { insights: AiInsightRecord[] };

export function useAnalyticsInsightsQuery(): ListQuery<AiInsightRecord, InsightResponse> {
  const queryKey = QUERY_KEYS.ai.insights.analytics();
  return createListQueryV2<AiInsightRecord, InsightResponse>({
    queryKey,
    queryFn: () =>
      api.get<InsightResponse>('/api/analytics/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useAnalyticsInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.analytics',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'analytics'],
    },
  });
}

export function useLogInsightsQuery(): ListQuery<AiInsightRecord, InsightResponse> {
  const queryKey = QUERY_KEYS.ai.insights.logs();
  return createListQueryV2<AiInsightRecord, InsightResponse>({
    queryKey,
    queryFn: () =>
      api.get<InsightResponse>('/api/system/logs/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useLogInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.logs',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'logs'],
    },
  });
}

export function useRuntimeAnalyticsInsightsQuery(): ListQuery<AiInsightRecord, InsightResponse> {
  const queryKey = QUERY_KEYS.ai.insights.runtimeAnalytics();
  return createListQueryV2<AiInsightRecord, InsightResponse>({
    queryKey,
    queryFn: () =>
      api.get<InsightResponse>('/api/ai-paths/runtime-analytics/insights', {
        params: { limit: 10 },
      }),
    meta: {
      source: 'insights.hooks.useRuntimeAnalyticsInsightsQuery',
      operation: 'list',
      resource: 'ai.insights.runtime-analytics',
      domain: 'analytics',
      queryKey,
      tags: ['ai', 'insights', 'runtime-analytics'],
    },
  });
}

export function useRunAnalyticsInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const mutationKey = QUERY_KEYS.ai.insights.analytics();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/analytics/insights', {});
      return data?.insight ?? null;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunAnalyticsInsightMutation',
      operation: 'create',
      resource: 'ai.insights.analytics',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'analytics', 'run'],
    },
    invalidateKeys: [QUERY_KEYS.ai.insights.analytics()],
  });
}

export function useRunLogInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const mutationKey = QUERY_KEYS.ai.insights.logs();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/system/logs/insights', {});
      return data?.insight ?? null;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunLogInsightMutation',
      operation: 'create',
      resource: 'ai.insights.logs',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'logs', 'run'],
    },
    invalidateKeys: [QUERY_KEYS.ai.insights.logs()],
  });
}

export function useRunRuntimeAnalyticsInsightMutation(): MutationResult<
  AiInsightRecord | null,
  void
  > {
  const mutationKey = QUERY_KEYS.ai.insights.runtimeAnalytics();
  return createCreateMutationV2<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>(
        '/api/ai-paths/runtime-analytics/insights',
        {}
      );
      return data?.insight ?? null;
    },
    mutationKey,
    meta: {
      source: 'insights.hooks.useRunRuntimeAnalyticsInsightMutation',
      operation: 'create',
      resource: 'ai.insights.runtime-analytics',
      domain: 'analytics',
      mutationKey,
      tags: ['ai', 'insights', 'runtime-analytics', 'run'],
    },
    invalidateKeys: [QUERY_KEYS.ai.insights.runtimeAnalytics()],
  });
}
