'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAnalyticsSummary, type AnalyticsRange } from '@/features/analytics/api';
import { api } from '@/shared/lib/api-client';
import type { AnalyticsScope, AiInsightRecord } from '@/shared/types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (range: AnalyticsRange, scope: AnalyticsScope | 'all') => 
    [...analyticsKeys.all, 'summary', range, scope] as const,
  insights: () => [...analyticsKeys.all, 'insights'] as const,
};

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
    queryKey: analyticsKeys.insights(),
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
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.insights() });
    },
  });
}
