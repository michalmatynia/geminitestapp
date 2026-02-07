'use client';

import { useMutation, useQuery, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';

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
    queryKey: ['ai-insights', 'analytics'],
    queryFn: async (): Promise<InsightResponse> => {
      const res = await fetch('/api/analytics/insights?limit=10');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to load analytics insights.');
      }
      return (await res.json()) as InsightResponse;
    },
  });

  const logsQuery = useQuery({
    queryKey: ['ai-insights', 'logs'],
    queryFn: async (): Promise<InsightResponse> => {
      const res = await fetch('/api/system/logs/insights?limit=10');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to load log insights.');
      }
      return (await res.json()) as InsightResponse;
    },
  });

  const runAnalyticsMutation = useMutation<AiInsightRecord | null, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/analytics/insights', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to generate analytics insight.');
      }
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
      const res = await fetch('/api/system/logs/insights', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to generate log insight.');
      }
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
