'use client';

import type {
  AnalyticsEventFilterBot,
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsScope,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import type { AiInsightResponse, AiInsightsResponse } from '@/shared/contracts/ai-insights';
import type { SingleQuery, MutationResult } from '@/shared/contracts/ui';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import {
  fetchAnalyticsEvents,
  fetchAnalyticsSummary,
  type AnalyticsRange,
} from '@/shared/lib/analytics/api';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2, createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
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
      domain: 'analytics',

      tags: ['analytics', 'summary'],
      description: 'Loads analytics summary.'},
  });
}

export function useAnalyticsEvents(input?: {
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
}): SingleQuery<AnalyticsEventsResponse> {
  const page = input?.page ?? 1;
  const pageSize = input?.pageSize ?? 25;
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const type = input?.type ?? 'all';
  const search = input?.search ?? '';
  const country = input?.country ?? '';
  const referrerHost = input?.referrerHost ?? '';
  const browser = input?.browser ?? '';
  const device = input?.device ?? '';
  const bot = input?.bot ?? 'all';
  const enabled = input?.enabled ?? true;

  const queryKey = analyticsKeys.events({
    page,
    pageSize,
    range,
    scope,
    type,
    search,
    country,
    referrerHost,
    browser,
    device,
    bot,
  });

  return createSingleQueryV2({
    id: `${range}-${scope}-${type}-${search}-${country}-${referrerHost}-${browser}-${device}-${bot}-${page}-${pageSize}`,
    queryKey,
    queryFn: () =>
      fetchAnalyticsEvents({
        page,
        pageSize,
        range,
        scope,
        type,
        search,
        country,
        referrerHost,
        browser,
        device,
        bot,
      }),
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
  return createSingleQueryV2({
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

  return createCreateMutationV2({
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
      domain: 'analytics',

      tags: ['analytics', 'events'],
      description: 'Creates analytics events.'},
  });
}
