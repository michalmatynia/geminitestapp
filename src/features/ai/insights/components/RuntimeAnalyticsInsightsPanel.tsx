'use client';

import React from 'react';

import { InsightsResultPanel } from './InsightsResultPanel';
import { useInsightsActions, useInsightsState } from '../context/InsightsContext';

export function RuntimeAnalyticsInsightsPanel(): React.JSX.Element {
  const { runtimeAnalyticsQuery } = useInsightsState();
  const { runRuntimeAnalyticsMutation } = useInsightsActions();

  return (
    <InsightsResultPanel
      title='Runtime Insights'
      description='AI Paths runtime performance, migration parity, and rollout risks.'
      emptyDescription='Run runtime analysis to inspect execution quality and kernel parity risks.'
      query={runtimeAnalyticsQuery}
      runMutation={runRuntimeAnalyticsMutation}
    />
  );
}
