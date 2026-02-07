'use client';

import { useMutation, useQuery, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiInsightRecord } from '@/shared/types';
import { useToast } from '@/shared/ui';

type InsightResponse = { insights: AiInsightRecord[] };

interface InsightsContextValue {
  analyticsQuery: UseQueryResult<InsightResponse>;
  logsQuery: UseQueryResult<InsightResponse>;
  runAnalyticsMutation: UseMutationResult<AiInsightRecord | null, Error, void>;
  runLogsMutation: UseMutationResult<AiInsightRecord | null, Error, void>;
}

const InsightsContext = createContext<InsightsContextValue | undefined>(undefined);

export function useInsights(): InsightsContextValue {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
}

export function InsightsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();

  const analyticsQuery = useQuery({
    queryKey: QUERY_KEYS.ai.insights.analytics(),
    queryFn: () => api.get<InsightResponse>('/api/analytics/insights', {
      params: { limit: 10 }
    }),
  });

  const logsQuery = useQuery({
    queryKey: QUERY_KEYS.ai.insights.logs(),
    queryFn: () => api.get<InsightResponse>('/api/system/logs/insights', {
      params: { limit: 10 }
    }),
  });

  const runAnalyticsMutation = useMutation<AiInsightRecord | null, Error, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/analytics/insights', {});
      return data?.insight ?? null;
    },
    onSuccess: () => {
      toast('AI analytics insight generated.', { variant: 'success' });
      void analyticsQuery.refetch();
    },
    onError: (error: Error) => {
      toast(error.message, { variant: 'error' });
    },
  });

  const runLogsMutation = useMutation<AiInsightRecord | null, Error, void>({
    mutationFn: async () => {
      const data = await api.post<{ insight?: AiInsightRecord }>('/api/system/logs/insights', {});
      return data?.insight ?? null;
    },
    onSuccess: () => {
      toast('AI log insight generated.', { variant: 'success' });
      void logsQuery.refetch();
    },
    onError: (error: Error) => {
      toast(error.message, { variant: 'error' });
    },
  });

  const value = {
    analyticsQuery,
    logsQuery,
    runAnalyticsMutation,
    runLogsMutation,
  };

  return <InsightsContext.Provider value={value}>{children}</InsightsContext.Provider>;
}