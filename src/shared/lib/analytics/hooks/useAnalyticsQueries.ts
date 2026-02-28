'use client';

import { useQueryClient } from '@tanstack/react-query';

import { fetchAnalyticsSummary, type AnalyticsRange } from '@/shared/lib/analytics/api';
import type { AiInsightRecordDto as AiInsightRecord } from '@/shared/contracts/ai-insights';
import type { AnalyticsScopeDto as AnalyticsScope, AnalyticsSummaryDto } from '@/shared/contracts/analytics';
import type { SingleQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createSingleQueryV2,
  createCreateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { analyticsKeys } from '@/shared/lib/query-key-exports';

export { analyticsKeys };

export function useAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  enabled?: boolean;
}): SingleQuery<AnalyticsSummaryDto> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const enabled = input?.enabled ?? true;

  const queryKey = analyticsKeys.summary(range, scope);
  return createSingleQueryV2({
    id: `${range}-${scope}`,
    queryKey,
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      source: 'analytics.hooks.useAnalyticsSummary',
      operation: 'detail',
      resource: 'analytics.summary',
      queryKey,
      tags: ['analytics', 'summary'],
    },
  });
}

export function useAnalyticsInsights(options: { limit?: number; enabled?: boolean } = {}): SingleQuery<{ insights: AiInsightRecord[] }> {
  const limit = options.limit ?? 5;
  const enabled = options.enabled ?? true;

  const queryKey = analyticsKeys.insights(limit);
  return createSingleQueryV2({
    id: String(limit),
    queryKey,
    queryFn: () => api.get<{ insights: AiInsightRecord[] }>('/api/analytics/insights', {
      params: { limit }
    }),
    enabled,
    meta: {
      source: 'analytics.hooks.useAnalyticsInsights',
      operation: 'detail',
      resource: 'analytics.insights',
      queryKey,
      tags: ['analytics', 'insights'],
    },
  });
}

export function useRunAnalyticsInsight(): MutationResult<{ insight: AiInsightRecord }, void> {
  const queryClient = useQueryClient();

  return createCreateMutationV2({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/analytics/insights'),
    mutationKey: analyticsKeys.all,
    meta: {
      source: 'analytics.hooks.useRunAnalyticsInsight',
      operation: 'create',
      resource: 'analytics.insights',
      mutationKey: analyticsKeys.all,
      tags: ['analytics', 'insights', 'create'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

export function useTrackEventMutation(): MutationResult<void, Record<string, unknown>> {
  return createCreateMutationV2({
    mutationFn: async (payload: Record<string, unknown>) => {
      const body = JSON.stringify(payload);
      
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/analytics/events', blob);
        if (ok) return Promise.resolve();
      }

      void fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
        keepalive: true,
      }).catch(() => {
        // Keep analytics best-effort and never block mutation flow.
      });
    },
    mutationKey: analyticsKeys.all,
    meta: {
      source: 'analytics.hooks.useTrackEventMutation',
      operation: 'create',
      resource: 'analytics.events',
      mutationKey: analyticsKeys.all,
      tags: ['analytics', 'events'],
    },
  });
}
