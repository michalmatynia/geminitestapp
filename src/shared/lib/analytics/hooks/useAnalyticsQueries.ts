'use client';

import type {
  AnalyticsEventFilterBot,
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsScope,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import type { AiInsightResponse, AiInsightsResponse } from '@/shared/contracts/ai-insights';
import type { SingleQuery, MutationResult } from '@/shared/contracts/ui/queries';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import {
  fetchAnalyticsEvents,
  fetchAnalyticsSummary,
  type AnalyticsRange,
} from '@/shared/lib/analytics/api';
import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2, useCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { analyticsKeys } from '@/shared/lib/query-key-exports';

export { analyticsKeys };

export function useAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  enabled?: boolean;
}): SingleQuery<AnalyticsSummary> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const enabled = input?.enabled ?? true;

  const queryKey = analyticsKeys.summary(range, scope);
  return useSingleQueryV2({
    id: `${range}-${scope}`,
    queryKey,
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      source: 'analytics.hooks.useAnalyticsSummary',
      operation: 'detail',
      resource: 'analytics.summary',
      domain: 'analytics',

      tags: ['analytics', 'summary'],
      description: 'Loads analytics summary.'},
  });
}

type AnalyticsEventsQueryInput = {
  page?: number;
  pageSize?: number;
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  type?: AnalyticsEventFilterType;
  search?: string;
  country?: string;
  referrerHost?: string;
  browser?: string;
  device?: string;
  bot?: AnalyticsEventFilterBot;
  enabled?: boolean;
};

const DEFAULT_ANALYTICS_EVENTS_QUERY_INPUT: Required<AnalyticsEventsQueryInput> = {
  page: 1,
  pageSize: 25,
  range: '24h',
  scope: 'all',
  type: 'all',
  search: '',
  country: '',
  referrerHost: '',
  browser: '',
  device: '',
  bot: 'all',
  enabled: true,
};

export function useAnalyticsEvents(
  input: AnalyticsEventsQueryInput = {}
): SingleQuery<AnalyticsEventsResponse> {
  const { enabled, ...filters } = {
    ...DEFAULT_ANALYTICS_EVENTS_QUERY_INPUT,
    ...input,
  };

  const queryKey = analyticsKeys.events(filters);

  return useSingleQueryV2({
    id: `${filters.range}-${filters.scope}-${filters.type}-${filters.search}-${filters.country}-${filters.referrerHost}-${filters.browser}-${filters.device}-${filters.bot}-${filters.page}-${filters.pageSize}`,
    queryKey,
    queryFn: () => fetchAnalyticsEvents(filters),
    enabled,
    meta: {
      source: 'analytics.hooks.useAnalyticsEvents',
      operation: 'detail',
      resource: 'analytics.events',
      domain: 'analytics',
      queryKey,
      tags: ['analytics', 'events'],
      description: 'Loads paginated analytics events.',
    },
  });
}

export function useAnalyticsInsights(
  options: { limit?: number; enabled?: boolean } = {}
): SingleQuery<AiInsightsResponse> {
  const limit = options.limit ?? 5;
  const enabled = options.enabled ?? true;

  const queryKey = analyticsKeys.insights(limit);
  return useSingleQueryV2({
    id: String(limit),
    queryKey,
    queryFn: () =>
      api.get<AiInsightsResponse>('/api/analytics/insights', {
        params: { limit },
      }),
    enabled,
    meta: {
      source: 'analytics.hooks.useAnalyticsInsights',
      operation: 'detail',
      resource: 'analytics.insights',
      domain: 'analytics',

      tags: ['analytics', 'insights'],
      description: 'Loads analytics insights.'},
  });
}

export function useRunAnalyticsInsight(): MutationResult<AiInsightResponse, void> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return useCreateMutationV2({
    mutationFn: () =>
      api.post<AiInsightResponse>('/api/analytics/insights', {
        ...(contextRegistry ? { contextRegistry } : {}),
      }),
    mutationKey: analyticsKeys.all,
    meta: {
      source: 'analytics.hooks.useRunAnalyticsInsight',
      operation: 'create',
      resource: 'analytics.insights',
      domain: 'analytics',
      tags: ['analytics', 'insights', 'create'],
      description: 'Creates analytics insights.'},
    invalidateKeys: [analyticsKeys.all],
  });
}

export function useTrackEventMutation(): MutationResult<void, Record<string, unknown>> {
  return useCreateMutationV2({
    mutationFn: (payload: Record<string, unknown>) => {
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
      return Promise.resolve();
    },
    mutationKey: analyticsKeys.all,
    meta: {
      source: 'analytics.hooks.useTrackEventMutation',
      operation: 'create',
      resource: 'analytics.events',
      domain: 'analytics',

      tags: ['analytics', 'events'],
      description: 'Creates analytics events.'},
  });
}
