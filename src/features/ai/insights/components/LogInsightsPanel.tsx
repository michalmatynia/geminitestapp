'use client';

import React from 'react';

import { InsightsResultPanel } from './InsightsResultPanel';
import { useInsights } from '../context/InsightsContext';

export function LogInsightsPanel(): React.JSX.Element {
  const { logsQuery, runLogsMutation } = useInsights();

  return (
    <InsightsResultPanel
      title='Log Insights'
      description='Error patterns, regressions, and suggested fixes.'
      emptyDescription='Run log analysis to identify error patterns and suggested fixes.'
      query={logsQuery}
      runMutation={runLogsMutation}
    />
  );
}
