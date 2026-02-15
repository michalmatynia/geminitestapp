'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation, createListQuery } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiInsightRecord } from '@/shared/types';
import type { ListQuery, MutationResult } from '@/shared/types/query-result-types';

type InsightResponse = { insights: AiInsightRecord[] };

export function useAnalyticsInsightsQuery(): ListQuery<AiInsightRecord, InsightResponse> {
  return createListQuery<AiInsightRecord, InsightResponse>({
    queryKey: QUERY_KEYS.ai.insights.analytics(),
    queryFn: () => api.get<InsightResponse>('/api/analytics/insights', {
      params: { limit: 10 }
    }),
  });
}

export function useLogInsightsQuery(): ListQuery<AiInsightRecord, InsightResponse> {
  return createListQuery<AiInsightRecord, InsightResponse>({
    queryKey: QUERY_KEYS.ai.insights.logs(),
    queryFn: () => api.get<InsightResponse>('/api/system/logs/insights', {
      params: { limit: 10 }
    }),
  });
}

export function useRunAnalyticsInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const queryClient = useQueryClient();
  return createCreateMutation<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/analytics/insights', {});
      return data?.insight ?? null;
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.insights.analytics() });
      },
    }
  });
}

export function useRunLogInsightMutation(): MutationResult<AiInsightRecord | null, void> {
  const queryClient = useQueryClient();
  return createCreateMutation<AiInsightRecord | null, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/system/logs/insights', {});
      return data?.insight ?? null;
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.insights.logs() });
      },
    }
  });
}
