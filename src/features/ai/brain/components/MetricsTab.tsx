'use client';

import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import { useBrain } from '../context/BrainContext';
import {
  AiInsightsSection,
  AiPathsRuntimeSection,
  AnalyticsSection,
  SystemLogsSection,
} from './MetricsTabSections';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export function MetricsTab(): React.JSX.Element {
  const {
    analyticsSummaryQuery,
    logMetricsQuery,
    insightsQuery,
    runtimeAnalyticsQuery,
    runtimeAnalyticsLiveEnabled,
  } = useBrain();

  const insightsData = insightsQuery.data;

  const latestAnalyticsInsight = insightsData?.analytics[0];
  const latestRuntimeInsight = insightsData?.runtimeAnalytics[0];
  const latestLogsInsight = insightsData?.logs[0];

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Deep Metrics'
        description='Auto-refreshing telemetry from analytics, system logs, and AI insight runs.'
      />

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <AnalyticsSection query={analyticsSummaryQuery} />
        <SystemLogsSection query={logMetricsQuery} />
      </div>

      <AiInsightsSection
        latestAnalyticsInsight={latestAnalyticsInsight}
        latestRuntimeInsight={latestRuntimeInsight}
        latestLogsInsight={latestLogsInsight}
      />

      <AiPathsRuntimeSection
        liveEnabled={runtimeAnalyticsLiveEnabled}
        query={runtimeAnalyticsQuery}
      />

      <div className='flex justify-end gap-3'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            void analyticsSummaryQuery.refetch();
            void logMetricsQuery.refetch();
            void insightsQuery.refetch();
            if (runtimeAnalyticsLiveEnabled) {
              void runtimeAnalyticsQuery.refetch();
            }
          }}
        >
          Refresh All Metrics
        </Button>
      </div>
    </div>
  );
}
