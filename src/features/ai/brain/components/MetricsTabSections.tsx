'use client';

import { Activity, Radar } from 'lucide-react';
import React from 'react';

import { MetadataItem, CompactEmptyState, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths-analytics';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import type { SystemLogMetrics } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import {
  formatDurationMs,
  formatNumber,
  formatPercent,
  InsightCard,
} from './MetricsTabUtils';

export function AnalyticsSection({
  query,
}: {
  query: SingleQuery<AnalyticsSummary>;
}): React.JSX.Element {
  if (query.isLoading) {
    return (
      <FormSection
        title='General Analytics'
        titleIcon={<Activity className='size-4 text-emerald-400' />}
        description='Events and engagement from the last 24 hours.'
      >
        <div className='py-8 text-center text-xs text-gray-500'>
          Loading analytics summary...
        </div>
      </FormSection>
    );
  }

  if (query.data !== undefined) {
    return (
      <FormSection
        title='General Analytics'
        titleIcon={<Activity className='size-4 text-emerald-400' />}
        description='Events and engagement from the last 24 hours.'
      >
        <div className='grid grid-cols-2 gap-4 mt-2'>
          <MetadataItem
            label='Total Events'
            value={formatNumber(query.data.totals.events)}
          />
          <MetadataItem
            label='Pageviews'
            value={formatNumber(query.data.totals.pageviews)}
          />
          <MetadataItem
            label='Visitors'
            value={formatNumber(query.data.visitors)}
          />
          <MetadataItem
            label='Sessions'
            value={formatNumber(query.data.sessions)}
          />
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection
      title='General Analytics'
      titleIcon={<Activity className='size-4 text-emerald-400' />}
      description='Events and engagement from the last 24 hours.'
    >
      <CompactEmptyState
        title='No analytics'
        description='Failed to load analytics summary.'
       />
    </FormSection>
  );
}

export function SystemLogsSection({
  query,
}: {
  query: SingleQuery<SystemLogMetrics>;
}): React.JSX.Element {
  if (query.isLoading) {
    return (
      <FormSection
        title='System Logs'
        titleIcon={<Radar className='size-4 text-cyan-400' />}
        description='Error distribution and log volume.'
      >
        <div className='py-8 text-center text-xs text-gray-500'>Loading log metrics...</div>
      </FormSection>
    );
  }

  if (query.data !== undefined) {
    return (
      <FormSection
        title='System Logs'
        titleIcon={<Radar className='size-4 text-cyan-400' />}
        description='Error distribution and log volume.'
      >
        <div className='grid grid-cols-2 gap-4 mt-2'>
          <MetadataItem label='Total Logs' value={formatNumber(query.data.total)} />
          <MetadataItem
            label='Errors (24h)'
            value={formatNumber(query.data.last24Hours)}
          />
          <MetadataItem
            label='Errors (7d)'
            value={formatNumber(query.data.last7Days)}
          />
          <MetadataItem
            label='Top Source'
            value={query.data.topSources[0]?.source ?? '—'}
          />
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection
      title='System Logs'
      titleIcon={<Radar className='size-4 text-cyan-400' />}
      description='Error distribution and log volume.'
    >
      <CompactEmptyState
        title='No log metrics'
        description='Failed to load log metrics.'
       />
    </FormSection>
  );
}

export function AiInsightsSection({
  latestAnalyticsInsight,
  latestRuntimeInsight,
  latestLogsInsight,
}: {
  latestAnalyticsInsight: AiInsightRecord | undefined;
  latestRuntimeInsight: AiInsightRecord | undefined;
  latestLogsInsight: AiInsightRecord | undefined;
}): React.JSX.Element {
  return (
    <FormSection
      title='AI Insight Runs'
      description='Recent results from scheduled Brain audits.'
    >
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-3 mt-2`}>
        <InsightCard
          title='Latest Analytics Audit'
          titleColor='text-emerald-300'
          insight={latestAnalyticsInsight}
          emptyText='No analytics audits found in history.'
        />
        <InsightCard
          title='Latest Runtime Audit'
          titleColor='text-amber-300'
          insight={latestRuntimeInsight}
          emptyText='No runtime analytics audits found in history.'
          includeRisk
        />
        <InsightCard
          title='Latest Logs Audit'
          titleColor='text-cyan-300'
          insight={latestLogsInsight}
          emptyText='No system log audits found in history.'
        />
      </div>
    </FormSection>
  );
}

export function AiPathsRuntimeSection({
  liveEnabled,
  query,
}: {
  liveEnabled: boolean;
  query: SingleQuery<AiPathRuntimeAnalyticsSummary>;
}): React.JSX.Element {
  if (!liveEnabled) {
    return (
      <FormSection
        title='AI Paths Runtime'
        description='Execution performance and node status summary.'
      >
        <CompactEmptyState
          title='Runtime analytics disabled'
          description='Enable Runtime Analytics and AI Paths model capabilities in AI Brain to load this telemetry.'
         />
      </FormSection>
    );
  }

  return (
    <FormSection
      title='AI Paths Runtime'
      description='Execution performance and node status summary.'
    >
      <AiPathsRuntimeContent query={query} />
    </FormSection>
  );
}

function AiPathsRuntimeContent({
  query,
}: {
  query: SingleQuery<AiPathRuntimeAnalyticsSummary>;
}): React.JSX.Element {
  if (query.isLoading) {
    return <div className='py-8 text-center text-xs text-gray-500'>Loading runtime analytics...</div>;
  }

  if (query.data !== undefined) {
    return (
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4 mt-2'>
        <AiPathsKernelMetrics data={query.data} />
        <MetadataItem
          label='Total Runs'
          value={formatNumber(query.data.runs.total)}
        />
        <MetadataItem
          label='Success Rate'
          value={formatPercent(query.data.runs.successRate)}
        />
        <MetadataItem
          label='Avg Duration'
          value={formatDurationMs(query.data.runs.avgDurationMs)}
        />
        <MetadataItem
          label='Active Nodes'
          value={formatNumber(query.data.nodes.running)}
        />
      </div>
    );
  }

  return (
    <CompactEmptyState
      title='No runtime telemetry'
      description='Failed to load runtime analytics.'
     />
  );
}

function AiPathsKernelMetrics({
  data,
}: {
  data: AiPathRuntimeAnalyticsSummary;
}): React.JSX.Element {
  const { kernelParity } = data.traces;
  const sampledRuns = kernelParity.sampledRuns;
  const runsWithKernelParity = kernelParity.runsWithKernelParity;
  const sampledHistoryEntries = kernelParity.sampledHistoryEntries;
  const v3Entries = kernelParity.strategyCounts.code_object_v3;
  const compatibilityEntries = kernelParity.strategyCounts.compatibility;
  
  const kernelCoverage =
    sampledRuns > 0 ? (runsWithKernelParity / sampledRuns) * 100 : 0;
  const v3Share =
    sampledHistoryEntries > 0 ? (v3Entries / sampledHistoryEntries) * 100 : 0;
  const compatibilityShare =
    sampledHistoryEntries > 0 ? (compatibilityEntries / sampledHistoryEntries) * 100 : 0;

  return (
    <>
      <MetadataItem
        label='Kernel Coverage'
        value={`${runsWithKernelParity}/${sampledRuns} (${formatPercent(kernelCoverage)})`}
      />
      <MetadataItem label='Kernel v3 Share' value={formatPercent(v3Share)} />
      <MetadataItem label='Kernel Compat Share' value={formatPercent(compatibilityShare)} />
    </>
  );
}
