'use client';

import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import {
  useAnalyticsSummary,
  useAnalyticsInsights,
  useRunAnalyticsInsight,
} from '@/shared/lib/analytics/hooks/useAnalyticsQueries';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { AnalyticsScope, AnalyticsSummary } from '@/shared/contracts/analytics';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';

import { type AnalyticsRange } from '../api';

interface AnalyticsFiltersContextValue {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  scope: AnalyticsScope | 'all';
  setScope: (scope: AnalyticsScope | 'all') => void;
}

interface AnalyticsSummaryContextValue {
  summaryQuery: UseQueryResult<AnalyticsSummary, Error>;
  fromToLabel: string | null;
}

interface AnalyticsInsightsContextValue {
  insightsQuery: UseQueryResult<{ insights: AiInsightRecord[] }, Error>;
  runInsightMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, void>;
}

export const { Context: AnalyticsFiltersContext, useStrictContext: useAnalyticsFilters } =
  createStrictContext<AnalyticsFiltersContextValue>({
    hookName: 'useAnalyticsFilters',
    providerName: 'an AnalyticsProvider',
    displayName: 'AnalyticsFiltersContext',
  });

export const { Context: AnalyticsSummaryContext, useStrictContext: useAnalyticsSummaryData } =
  createStrictContext<AnalyticsSummaryContextValue>({
    hookName: 'useAnalyticsSummaryData',
    providerName: 'an AnalyticsProvider',
    displayName: 'AnalyticsSummaryContext',
  });

export const { Context: AnalyticsInsightsContext, useStrictContext: useAnalyticsInsightsData } =
  createStrictContext<AnalyticsInsightsContextValue>({
    hookName: 'useAnalyticsInsightsData',
    providerName: 'an AnalyticsProvider',
    displayName: 'AnalyticsInsightsContext',
  });

export function AnalyticsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [range, setRange] = useState<AnalyticsRange>('24h');
  const [scope, setScope] = useState<AnalyticsScope | 'all'>('all');

  const summaryQuery = useAnalyticsSummary({ range, scope });

  const insightsQuery = useAnalyticsInsights({ limit: 5 });

  const runInsightMutation = useRunAnalyticsInsight();

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

  const filtersValue = useMemo<AnalyticsFiltersContextValue>(
    () => ({
      range,
      setRange,
      scope,
      setScope,
    }),
    [range, scope]
  );

  const summaryValue = useMemo<AnalyticsSummaryContextValue>(
    () => ({
      summaryQuery,
      fromToLabel,
    }),
    [summaryQuery, fromToLabel]
  );

  const insightsValue = useMemo<AnalyticsInsightsContextValue>(
    () => ({
      insightsQuery,
      runInsightMutation,
    }),
    [insightsQuery, runInsightMutation]
  );

  return (
    <AnalyticsFiltersContext.Provider value={filtersValue}>
      <AnalyticsSummaryContext.Provider value={summaryValue}>
        <AnalyticsInsightsContext.Provider value={insightsValue}>
          {children}
        </AnalyticsInsightsContext.Provider>
      </AnalyticsSummaryContext.Provider>
    </AnalyticsFiltersContext.Provider>
  );
}
