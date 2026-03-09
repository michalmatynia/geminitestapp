'use client';

import React from 'react';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import {
  AI_INSIGHTS_CONTEXT_ROOT_IDS,
  buildAiInsightsWorkspaceContextBundle,
} from '@/features/ai/insights/context-registry/workspace';
import { Button, SectionHeader } from '@/shared/ui';

import { AnalyticsInsightsPanel } from '../components/AnalyticsInsightsPanel';
import { LogInsightsPanel } from '../components/LogInsightsPanel';
import { RuntimeAnalyticsInsightsPanel } from '../components/RuntimeAnalyticsInsightsPanel';
import {
  InsightsProvider,
  useInsightsActions,
  useInsightsState,
} from '../context/InsightsContext';

function AiInsightsContextRegistrySource(): React.JSX.Element {
  const { analyticsQuery, runtimeAnalyticsQuery, logsQuery } = useInsightsState();
  const { runAnalyticsMutation, runRuntimeAnalyticsMutation, runLogsMutation } =
    useInsightsActions();

  const registrySource = React.useMemo(
    () => ({
      label: 'AI Insights Workspace State',
      resolved: buildAiInsightsWorkspaceContextBundle({
        analyticsInsights: analyticsQuery.data?.insights ?? [],
        runtimeInsights: runtimeAnalyticsQuery.data?.insights ?? [],
        logInsights: logsQuery.data?.insights ?? [],
        analyticsRunPending: runAnalyticsMutation.isPending,
        runtimeRunPending: runRuntimeAnalyticsMutation.isPending,
        logsRunPending: runLogsMutation.isPending,
      }),
    }),
    [
      analyticsQuery.data?.insights,
      logsQuery.data?.insights,
      runAnalyticsMutation.isPending,
      runLogsMutation.isPending,
      runRuntimeAnalyticsMutation.isPending,
      runtimeAnalyticsQuery.data?.insights,
    ]
  );

  useRegisterContextRegistryPageSource('ai-insights-workspace-state', registrySource);

  return <></>;
}

function AdminAiInsightsPageContent(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <AiInsightsContextRegistrySource />
      <SectionHeader
        title='AI Insights'
        description='Aggregated AI summaries for analytics, runtime telemetry, and system logs.'
        className='mb-6'
        actions={
          <Button
            variant='outline'
            size='sm'
            onClick={() => window.location.assign('/admin/brain?tab=routing')}
          >
            Settings
          </Button>
        }
      />

      <div className='grid gap-6 xl:grid-cols-3'>
        <AnalyticsInsightsPanel />
        <RuntimeAnalyticsInsightsPanel />
        <LogInsightsPanel />
      </div>
    </div>
  );
}

export default function AdminAiInsightsPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider
      pageId='admin:ai-insights'
      title='AI Insights Dashboard'
      rootNodeIds={[...AI_INSIGHTS_CONTEXT_ROOT_IDS]}
    >
      <InsightsProvider>
        <AdminAiInsightsPageContent />
      </InsightsProvider>
    </ContextRegistryPageProvider>
  );
}
