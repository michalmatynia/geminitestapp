'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAnalyticsSummary, type AnalyticsRange } from '@/features/analytics/api';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AnalyticsScope, AiInsightRecord } from '@/shared/types';

export const analyticsKeys = QUERY_KEYS.analytics;

export function useAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  enabled?: boolean;
}) {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const enabled = input?.enabled ?? true;

  return useQuery({
    queryKey: analyticsKeys.summary(range, scope),
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAnalyticsInsights(options: { limit?: number; enabled?: boolean } = {}) {
  const limit = options.limit ?? 5;
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: analyticsKeys.insights(limit),
    queryFn: () => api.get<{ insights: AiInsightRecord[] }>('/api/analytics/insights', {
      params: { limit }
    }),
    enabled,
  });
}

export function useRunAnalyticsInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/analytics/insights'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

export function useTrackEventMutation() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const body = JSON.stringify(payload);
      
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/analytics/events', blob);
        if (ok) return Promise.resolve();
      }

      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
        keepalive: true,
      });
    },
  });
}
