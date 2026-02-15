'use client';

import { useQueryClient } from '@tanstack/react-query';

import { fetchAnalyticsSummary, type AnalyticsRange } from '@/features/analytics/api';
import { api } from '@/shared/lib/api-client';
import {
  createSingleQuery,
  createCreateMutation,
} from '@/shared/lib/query-factories';
import { analyticsKeys } from '@/shared/lib/query-key-exports';
import type { AnalyticsScope, AiInsightRecord, AnalyticsSummaryDto } from '@/shared/types';
import type { SingleQuery, MutationResult } from '@/shared/types/query-result-types';

export { analyticsKeys };

export function useAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  enabled?: boolean;
}): SingleQuery<AnalyticsSummaryDto> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const enabled = input?.enabled ?? true;

  return createSingleQuery({
    queryKey: analyticsKeys.summary(range, scope),
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
    options: {
      enabled,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  });
}

export function useAnalyticsInsights(options: { limit?: number; enabled?: boolean } = {}): SingleQuery<{ insights: AiInsightRecord[] }> {
  const limit = options.limit ?? 5;
  const enabled = options.enabled ?? true;

  return createSingleQuery({
    queryKey: analyticsKeys.insights(limit),
    queryFn: () => api.get<{ insights: AiInsightRecord[] }>('/api/analytics/insights', {
      params: { limit }
    }),
    options: {
      enabled,
    }
  });
}

export function useRunAnalyticsInsight(): MutationResult<{ insight: AiInsightRecord }, void> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: () => api.post<{ insight: AiInsightRecord }>('/api/analytics/insights'),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      },
    },
  });
}

export function useTrackEventMutation(): MutationResult<void, Record<string, unknown>> {
  return createCreateMutation({
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
