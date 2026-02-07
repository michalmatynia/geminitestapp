'use client';

import { useMutation, useQuery, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

import type { AnalyticsScope, AnalyticsSummaryDto, AiInsightRecord } from '@/shared/types';
import { useToast } from '@/shared/ui';

import { fetchAnalyticsSummary, type AnalyticsRange } from '../api';

interface AnalyticsContextValue {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  scope: AnalyticsScope | 'all';
  setScope: (scope: AnalyticsScope | 'all') => void;
  summaryQuery: UseQueryResult<AnalyticsSummaryDto, Error>;
  insightsQuery: UseQueryResult<{ insights: AiInsightRecord[] }, Error>;
  runInsightMutation: UseMutationResult<AiInsightRecord | null, Error, void>;
  fromToLabel: string | null;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

export function AnalyticsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [range, setRange] = useState<AnalyticsRange>('24h');
  const [scope, setScope] = useState<AnalyticsScope | 'all'>('all');
  const { toast } = useToast();

  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary', range, scope],
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
  });

  const insightsQuery = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/insights?limit=5');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to load AI insights.');
      }
      return (await res.json()) as { insights: AiInsightRecord[] };
    },
  });

  const runInsightMutation = useMutation<AiInsightRecord | null, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/analytics/insights', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to generate insight.');
      }
      return data?.insight ?? null;
    },
    onSuccess: (insight: AiInsightRecord | null) => {
      if (insight) {
        toast('AI analytics insight generated.', { variant: 'success' });
        void insightsQuery.refetch();
      }
    },
    onError: (error: Error) => {
      toast(error.message, { variant: 'error' });
    },
  });

  const fromToLabel = useMemo((): string | null => {
    const summary = summaryQuery.data;
    if (!summary) return null;
    try {
      const from = new Date(summary.from).toLocaleString();
      const to = new Date(summary.to).toLocaleString();
      return `${from} → ${to}`;
    } catch {
      return null;
    }
  }, [summaryQuery.data]);

  const value: AnalyticsContextValue = {
    range,
    setRange,
    scope,
    setScope,
    summaryQuery,
    insightsQuery,
    runInsightMutation,
    fromToLabel,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
