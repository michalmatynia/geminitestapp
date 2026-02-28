'use client';

import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

import {
  useAnalyticsSummary,
  useAnalyticsInsights,
  useRunAnalyticsInsight,
} from '@/shared/lib/analytics/hooks/useAnalytics';
import type { AnalyticsScope, AnalyticsSummaryDto, AiInsightRecord } from '@/shared/contracts';

import { type AnalyticsRange } from '../api';

interface AnalyticsContextValue {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  scope: AnalyticsScope | 'all';
  setScope: (scope: AnalyticsScope | 'all') => void;
  summaryQuery: UseQueryResult<AnalyticsSummaryDto, Error>;
  insightsQuery: UseQueryResult<{ insights: AiInsightRecord[] }, Error>;
  runInsightMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, void>;
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

  const summaryQuery = useAnalyticsSummary({ range, scope });

  const insightsQuery = useAnalyticsInsights({ limit: 5 });

  const runInsightMutation = useRunAnalyticsInsight();

  // We can wrap the mutation to add toast handling if we want it to be part of the context
  // or just let the components using it handle it.
  // Given it's in a context, let's keep it as is and maybe the components handle the toast.
  // Actually, the original had it in the mutation options.
  // Let's use the mutation with options if we want.

  // Actually, I'll just use the mutation as returned by the hook.
  // If the user wants specific behavior in the context, we can add it.

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
