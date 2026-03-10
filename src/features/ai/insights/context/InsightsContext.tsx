'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

import {
  useAnalyticsInsightsQuery,
  useRuntimeAnalyticsInsightsQuery,
  useLogInsightsQuery,
  useRunAnalyticsInsightMutation,
  useRunRuntimeAnalyticsInsightMutation,
  useRunLogInsightMutation,
} from '../hooks/useInsightQueries';

interface InsightsContextValue {
  analyticsQuery: ReturnType<typeof useAnalyticsInsightsQuery>;
  runtimeAnalyticsQuery: ReturnType<typeof useRuntimeAnalyticsInsightsQuery>;
  logsQuery: ReturnType<typeof useLogInsightsQuery>;
  runAnalyticsMutation: ReturnType<typeof useRunAnalyticsInsightMutation>;
  runRuntimeAnalyticsMutation: ReturnType<typeof useRunRuntimeAnalyticsInsightMutation>;
  runLogsMutation: ReturnType<typeof useRunLogInsightMutation>;
}

type InsightsStateContextValue = Pick<
  InsightsContextValue,
  'analyticsQuery' | 'runtimeAnalyticsQuery' | 'logsQuery'
>;
type InsightsActionsContextValue = Pick<
  InsightsContextValue,
  'runAnalyticsMutation' | 'runRuntimeAnalyticsMutation' | 'runLogsMutation'
>;

const InsightsStateContext = createContext<InsightsStateContextValue | undefined>(undefined);
const InsightsActionsContext = createContext<InsightsActionsContextValue | undefined>(undefined);

export function useInsightsState(): InsightsStateContextValue {
  const context = useContext(InsightsStateContext);
  if (!context) {
    throw internalError('useInsightsState must be used within an InsightsProvider');
  }
  return context;
}

export function useInsightsActions(): InsightsActionsContextValue {
  const context = useContext(InsightsActionsContext);
  if (!context) {
    throw internalError('useInsightsActions must be used within an InsightsProvider');
  }
  return context;
}

export function InsightsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();

  const analyticsQuery = useAnalyticsInsightsQuery();
  const runtimeAnalyticsQuery = useRuntimeAnalyticsInsightsQuery();
  const logsQuery = useLogInsightsQuery();

  const runAnalyticsMutation = useRunAnalyticsInsightMutation();
  const runRuntimeAnalyticsMutation = useRunRuntimeAnalyticsInsightMutation();
  const runLogsMutation = useRunLogInsightMutation();

  // Handle toast notifications via useEffect for mutations
  React.useEffect(() => {
    if (runAnalyticsMutation.isSuccess) {
      toast('AI analytics insight generated.', { variant: 'success' });
    }
  }, [runAnalyticsMutation.isSuccess, toast]);

  React.useEffect(() => {
    if (runAnalyticsMutation.isError) {
      toast(runAnalyticsMutation.error.message, { variant: 'error' });
    }
  }, [runAnalyticsMutation.isError, runAnalyticsMutation.error, toast]);

  React.useEffect(() => {
    if (runLogsMutation.isSuccess) {
      toast('AI log insight generated.', { variant: 'success' });
    }
  }, [runLogsMutation.isSuccess, toast]);

  React.useEffect(() => {
    if (runLogsMutation.isError) {
      toast(runLogsMutation.error.message, { variant: 'error' });
    }
  }, [runLogsMutation.isError, runLogsMutation.error, toast]);

  React.useEffect(() => {
    if (runRuntimeAnalyticsMutation.isSuccess) {
      toast('AI runtime analytics insight generated.', { variant: 'success' });
    }
  }, [runRuntimeAnalyticsMutation.isSuccess, toast]);

  React.useEffect(() => {
    if (runRuntimeAnalyticsMutation.isError) {
      toast(runRuntimeAnalyticsMutation.error.message, { variant: 'error' });
    }
  }, [runRuntimeAnalyticsMutation.isError, runRuntimeAnalyticsMutation.error, toast]);

  const stateValue: InsightsStateContextValue = {
    analyticsQuery,
    runtimeAnalyticsQuery,
    logsQuery,
  };
  const actionsValue: InsightsActionsContextValue = {
    runAnalyticsMutation,
    runRuntimeAnalyticsMutation,
    runLogsMutation,
  };

  return (
    <InsightsActionsContext.Provider value={actionsValue}>
      <InsightsStateContext.Provider value={stateValue}>{children}</InsightsStateContext.Provider>
    </InsightsActionsContext.Provider>
  );
}
