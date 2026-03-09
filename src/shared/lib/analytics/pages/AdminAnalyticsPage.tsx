'use client';

import React from 'react';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import {
  buildAnalyticsWorkspaceContextBundle,
  ANALYTICS_CONTEXT_ROOT_IDS,
} from '@/shared/lib/analytics/context-registry/workspace';
import { FormSection } from '@/shared/ui';

import { AnalyticsAiInsights } from '../components/AnalyticsAiInsights';
import { AnalyticsDashboardHeader } from '../components/AnalyticsDashboardHeader';
import { AnalyticsMetricsGrid } from '../components/AnalyticsMetricsGrid';
import { AnalyticsTopStats } from '../components/AnalyticsTopStats';
import { RecentEventsTable } from '../components/RecentEventsTable';
import {
  AnalyticsProvider,
  useAnalyticsFilters,
  useAnalyticsInsightsData,
  useAnalyticsSummaryData,
} from '../context/AnalyticsContext';

function AnalyticsContextRegistrySource(): React.JSX.Element {
  const { range, scope } = useAnalyticsFilters();
  const { summaryQuery, fromToLabel } = useAnalyticsSummaryData();
  const { insightsQuery, runInsightMutation } = useAnalyticsInsightsData();

  const registrySource = React.useMemo(
    () => ({
      label: 'Analytics Workspace State',
      resolved: buildAnalyticsWorkspaceContextBundle({
        range,
        scope,
        fromToLabel,
        summary: summaryQuery.data,
        insights: insightsQuery.data?.insights ?? [],
        latestInsightStatus: insightsQuery.data?.insights?.[0]?.status ?? null,
      }),
    }),
    [fromToLabel, insightsQuery.data?.insights, range, scope, summaryQuery.data]
  );

  useRegisterContextRegistryPageSource('analytics-workspace-state', registrySource);

  useRegisterContextRegistryPageSource('analytics-insight-run-state', {
    label: 'Analytics Insight Run State',
    rootNodeIds: runInsightMutation.isPending ? ['action:analytics-generate-insight'] : [],
  });

  return <></>;
}

function AnalyticsPageContent(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <AnalyticsContextRegistrySource />
      <AnalyticsDashboardHeader />
      <AnalyticsAiInsights />
      <AnalyticsMetricsGrid />
      <AnalyticsTopStats />

      <FormSection title='Recent Events' className='mt-6'>
        <RecentEventsTable />
      </FormSection>
    </div>
  );
}

export default function AdminAnalyticsPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider
      pageId='admin:analytics'
      title='Analytics Dashboard'
      rootNodeIds={[...ANALYTICS_CONTEXT_ROOT_IDS]}
    >
      <AnalyticsProvider>
        <AnalyticsPageContent />
      </AnalyticsProvider>
    </ContextRegistryPageProvider>
  );
}
