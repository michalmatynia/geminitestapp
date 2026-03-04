'use client';

import React from 'react';

import { InsightsResultPanel } from './InsightsResultPanel';
import { useInsights } from '../context/InsightsContext';

export function AnalyticsInsightsPanel(): React.JSX.Element {
  const { analyticsQuery, runAnalyticsMutation } = useInsights();

  return (
    <InsightsResultPanel
      title='Analytics Insights'
      description='Interaction anomalies, traffic changes, and warnings.'
      emptyDescription='Run analytics analysis to identify traffic changes and anomalies.'
      query={analyticsQuery}
      runMutation={runAnalyticsMutation}
    />
  );
}
