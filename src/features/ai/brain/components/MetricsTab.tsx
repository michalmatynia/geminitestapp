'use client';

import { Activity, Radar } from 'lucide-react';
import React from 'react';

import { Button, MetadataItem, StatusBadge, SectionHeader, FormSection, EmptyState, Card } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';

const formatNumber = (value: number | undefined): string =>
  Number.isFinite(value) ? Number(value).toLocaleString() : '—';

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString();
};

const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

export function MetricsTab(): React.JSX.Element {
  const {
    analyticsSummaryQuery,
    logMetricsQuery,
    insightsQuery,
    runtimeAnalyticsQuery,
  } = useBrain();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const insightsData = insightsQuery.data;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const latestAnalyticsInsight = insightsData?.analytics?.[0];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const latestLogsInsight = insightsData?.logs?.[0];

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Deep Metrics'
        description='Auto-refreshing telemetry from analytics, system logs, and AI insight runs.'
      />

      <div className='grid gap-4 md:grid-cols-2'>
        <FormSection
          title='General Analytics'
          titleIcon={<Activity className='size-4 text-emerald-400' />}
          description='Events and engagement from the last 24 hours.'
        >
          {analyticsSummaryQuery.isLoading ? (
            <div className='py-8 text-center text-xs text-gray-500'>Loading analytics summary...</div>
          ) : analyticsSummaryQuery.data ? (
            <div className='grid grid-cols-2 gap-4 mt-2'>
              {/* eslint-disable @typescript-eslint/no-unsafe-argument */}
              <MetadataItem label='Total Events' value={formatNumber(analyticsSummaryQuery.data.total)} />
              <MetadataItem label='Unique Users' value={formatNumber(analyticsSummaryQuery.data.uniqueUsers)} />
              <MetadataItem label='Error Rate' value={formatPercent(analyticsSummaryQuery.data.errorRate)} />
              <MetadataItem label='Avg Response' value={formatDurationMs(analyticsSummaryQuery.data.avgLatency)} />
              {/* eslint-enable @typescript-eslint/no-unsafe-argument */}
            </div>
          ) : (
            <EmptyState title='No analytics' description='Failed to load analytics summary.' variant='compact' />
          )}
        </FormSection>

        <FormSection
          title='System Logs'
          titleIcon={<Radar className='size-4 text-cyan-400' />}
          description='Error distribution and log volume.'
        >
          {logMetricsQuery.isLoading ? (
            <div className='py-8 text-center text-xs text-gray-500'>Loading log metrics...</div>
          ) : logMetricsQuery.data ? (
            <div className='grid grid-cols-2 gap-4 mt-2'>
              <MetadataItem label='Total Logs' value={formatNumber(logMetricsQuery.data.total)} />
              <MetadataItem label='Errors (24h)' value={formatNumber(logMetricsQuery.data.last24Hours)} />
              <MetadataItem label='Errors (7d)' value={formatNumber(logMetricsQuery.data.last7Days)} />
              <MetadataItem label='Top Source' value={logMetricsQuery.data.topSources[0]?.source || '—'} />
            </div>
          ) : (
            <EmptyState title='No log metrics' description='Failed to load log metrics.' variant='compact' />
          )}
        </FormSection>
      </div>

      <FormSection
        title='AI Insight Runs'
        description='Recent results from scheduled Brain audits.'
      >
        <div className='grid gap-4 md:grid-cols-2 mt-2'>
          <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-emerald-300 uppercase'>Latest Analytics Audit</span>
              <StatusBadge status={latestAnalyticsInsight ? (latestAnalyticsInsight as AiInsightRecord).status : 'none'} />
            </div>
            <div className='mt-3 space-y-2'>
              <MetadataItem 
                label='Generated' 
                value={latestAnalyticsInsight ? formatDate((latestAnalyticsInsight as AiInsightRecord).createdAt) : '—'} 
              />
              <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
                {latestAnalyticsInsight ? (latestAnalyticsInsight as AiInsightRecord).summary : 'No analytics audits found in history.'}
              </div>
            </div>
          </Card>

          <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-cyan-300 uppercase'>Latest Logs Audit</span>
              <StatusBadge status={latestLogsInsight ? (latestLogsInsight as AiInsightRecord).status : 'none'} />
            </div>
            <div className='mt-3 space-y-2'>
              <MetadataItem 
                label='Generated' 
                value={latestLogsInsight ? formatDate((latestLogsInsight as AiInsightRecord).createdAt) : '—'} 
              />
              <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
                {latestLogsInsight ? (latestLogsInsight as AiInsightRecord).summary : 'No system log audits found in history.'}
              </div>
            </div>
          </Card>
        </div>
      </FormSection>

      <FormSection
        title='AI Paths Runtime'
        description='Execution performance and node status summary.'
      >
        {runtimeAnalyticsQuery.isLoading ? (
          <div className='py-8 text-center text-xs text-gray-500'>Loading runtime analytics...</div>
        ) : runtimeAnalyticsQuery.data ? (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4 mt-2'>
            {/* eslint-disable @typescript-eslint/no-unsafe-argument */}
            <MetadataItem label='Total Runs' value={formatNumber(runtimeAnalyticsQuery.data.totalRuns)} />
            <MetadataItem label='Success Rate' value={formatPercent(runtimeAnalyticsQuery.data.successRate)} />
            <MetadataItem label='Avg Duration' value={formatDurationMs(runtimeAnalyticsQuery.data.avgDuration)} />
            <MetadataItem label='Active Nodes' value={formatNumber(runtimeAnalyticsQuery.data.activeNodes)} />
            {/* eslint-enable @typescript-eslint/no-unsafe-argument */}
          </div>
        ) : (
          <EmptyState title='No runtime telemetry' description='Failed to load runtime analytics.' variant='compact' />
        )}
      </FormSection>

      <div className='flex justify-end gap-3'>
        <Button variant='outline' size='sm' onClick={() => {
          void analyticsSummaryQuery.refetch();
          void logMetricsQuery.refetch();
          void insightsQuery.refetch();
          void runtimeAnalyticsQuery.refetch();
        }}>
          Refresh All Metrics
        </Button>
      </div>
    </div>
  );
}
