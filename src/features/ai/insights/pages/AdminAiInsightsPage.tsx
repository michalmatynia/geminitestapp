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
import type { AiInsightRecord } from '@/shared/contracts';
import {
  Button,
  CompactEmptyState,
  FormSection,
  LoadingState,
  SectionHeader,
} from '@/shared/ui';

import { InsightCard } from '../components/InsightCard';
import {
  InsightsProvider,
  useInsightsActions,
  useInsightsState,
} from '../context/InsightsContext';

type InsightQueryLike = {
  isLoading: boolean;
  error: Error | null;
  data?: {
    insights?: AiInsightRecord[] | null;
  } | null;
};

type RunMutationLike = {
  mutate: () => void;
  isPending: boolean;
};

interface InsightsResultPanelProps {
  title: string;
  description: string;
  emptyDescription: string;
  query: InsightQueryLike;
  runMutation: RunMutationLike;
}

function InsightsResultPanel(props: InsightsResultPanelProps): React.JSX.Element {
  const { title, description, emptyDescription, query, runMutation } = props;

  return (
    <FormSection
      title={title}
      description={description}
      className='p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      }
    >
      <div className='mt-3 space-y-3'>
        {query.isLoading ? (
          <LoadingState message='Loading insights...' size='sm' className='py-4' />
        ) : query.error ? (
          <div className='text-xs text-red-400'>{query.error.message}</div>
        ) : (query.data?.insights?.length ?? 0) === 0 ? (
          <CompactEmptyState
            title='No insights yet'
            description={emptyDescription}
            className='py-8'
          />
        ) : (
          query.data?.insights?.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </FormSection>
  );
}

function AnalyticsInsightsPanel(): React.JSX.Element {
  const { analyticsQuery } = useInsightsState();
  const { runAnalyticsMutation } = useInsightsActions();

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

function RuntimeAnalyticsInsightsPanel(): React.JSX.Element {
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

function LogInsightsPanel(): React.JSX.Element {
  const { logsQuery } = useInsightsState();
  const { runLogsMutation } = useInsightsActions();

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
    <div className='page-section'>
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
