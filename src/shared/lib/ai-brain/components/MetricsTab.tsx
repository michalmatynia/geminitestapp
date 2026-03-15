'use client';

import { Activity, Radar } from 'lucide-react';
import React from 'react';

import {
  Button,
  MetadataItem,
  StatusBadge,
  SectionHeader,
  FormSection,
  CompactEmptyState,
  Card,
} from '@/shared/ui';

import { useBrain } from '../context/BrainContext';

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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const getRuntimeKernelRisk = (metadata: unknown): string => {
  const record = asRecord(metadata);
  const raw = record?.['runtimeKernelParityRiskLevel'];
  if (typeof raw !== 'string') return '—';
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return '—';
  return normalized.toUpperCase();
};

export function MetricsTab(): React.JSX.Element {
  const {
    analyticsSummaryQuery,
    logMetricsQuery,
    insightsQuery,
    runtimeAnalyticsQuery,
    runtimeAnalyticsLiveEnabled,
  } = useBrain();

  const insightsData = insightsQuery.data;

  const latestAnalyticsInsight = insightsData?.analytics?.[0];
  const latestRuntimeInsight = insightsData?.runtimeAnalytics?.[0];

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
            <div className='py-8 text-center text-xs text-gray-500'>
              Loading analytics summary...
            </div>
          ) : analyticsSummaryQuery.data ? (
            <div className='grid grid-cols-2 gap-4 mt-2'>
              {}
              <MetadataItem
                label='Total Events'
                value={formatNumber(analyticsSummaryQuery.data.totals.events)}
              />
              <MetadataItem
                label='Pageviews'
                value={formatNumber(analyticsSummaryQuery.data.totals.pageviews)}
              />
              <MetadataItem
                label='Visitors'
                value={formatNumber(analyticsSummaryQuery.data.visitors)}
              />
              <MetadataItem
                label='Sessions'
                value={formatNumber(analyticsSummaryQuery.data.sessions)}
              />
              {}
            </div>
          ) : (
            <CompactEmptyState
              title='No analytics'
              description='Failed to load analytics summary.'
             />
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
              <MetadataItem
                label='Errors (24h)'
                value={formatNumber(logMetricsQuery.data.last24Hours)}
              />
              <MetadataItem
                label='Errors (7d)'
                value={formatNumber(logMetricsQuery.data.last7Days)}
              />
              <MetadataItem
                label='Top Source'
                value={logMetricsQuery.data.topSources[0]?.source || '—'}
              />
            </div>
          ) : (
            <CompactEmptyState
              title='No log metrics'
              description='Failed to load log metrics.'
             />
          )}
        </FormSection>
      </div>

      <FormSection
        title='AI Insight Runs'
        description='Recent results from scheduled Brain audits.'
      >
        <div className='grid gap-4 md:grid-cols-3 mt-2'>
          <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-emerald-300 uppercase'>
                Latest Analytics Audit
              </span>
              <StatusBadge
                status={latestAnalyticsInsight ? latestAnalyticsInsight.status : 'none'}
                label={latestAnalyticsInsight ? latestAnalyticsInsight.status : 'never'}
              />
            </div>
            <div className='mt-3 space-y-2'>
              <MetadataItem
                label='Generated'
                value={latestAnalyticsInsight ? formatDate(latestAnalyticsInsight.createdAt) : '—'}
              />
              <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
                {latestAnalyticsInsight
                  ? latestAnalyticsInsight.summary
                  : 'No analytics audits found in history.'}
              </div>
            </div>
          </Card>

          <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-amber-300 uppercase'>
                Latest Runtime Audit
              </span>
              <StatusBadge
                status={latestRuntimeInsight ? latestRuntimeInsight.status : 'none'}
                label={latestRuntimeInsight ? latestRuntimeInsight.status : 'never'}
              />
            </div>
            <div className='mt-3 space-y-2'>
              <MetadataItem
                label='Generated'
                value={latestRuntimeInsight ? formatDate(latestRuntimeInsight.createdAt) : '—'}
              />
              <MetadataItem
                label='Kernel parity risk'
                value={
                  latestRuntimeInsight ? getRuntimeKernelRisk(latestRuntimeInsight.metadata) : '—'
                }
              />
              <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
                {latestRuntimeInsight
                  ? latestRuntimeInsight.summary
                  : 'No runtime analytics audits found in history.'}
              </div>
            </div>
          </Card>

          <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-cyan-300 uppercase'>
                Latest Logs Audit
              </span>
              <StatusBadge
                status={latestLogsInsight ? latestLogsInsight.status : 'none'}
                label={latestLogsInsight ? latestLogsInsight.status : 'never'}
              />
            </div>
            <div className='mt-3 space-y-2'>
              <MetadataItem
                label='Generated'
                value={latestLogsInsight ? formatDate(latestLogsInsight.createdAt) : '—'}
              />
              <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
                {latestLogsInsight
                  ? latestLogsInsight.summary
                  : 'No system log audits found in history.'}
              </div>
            </div>
          </Card>
        </div>
      </FormSection>

      <FormSection
        title='AI Paths Runtime'
        description='Execution performance and node status summary.'
      >
        {!runtimeAnalyticsLiveEnabled ? (
          <CompactEmptyState
            title='Runtime analytics disabled'
            description='Enable Runtime Analytics and AI Paths model capabilities in AI Brain to load this telemetry.'
           />
        ) : runtimeAnalyticsQuery.isLoading ? (
          <div className='py-8 text-center text-xs text-gray-500'>Loading runtime analytics...</div>
        ) : runtimeAnalyticsQuery.data ? (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4 mt-2'>
            {(() => {
              const kernelParity = runtimeAnalyticsQuery.data?.traces.kernelParity;
              const sampledRuns = kernelParity?.sampledRuns ?? 0;
              const runsWithKernelParity = kernelParity?.runsWithKernelParity ?? 0;
              const sampledHistoryEntries = kernelParity?.sampledHistoryEntries ?? 0;
              const v3Entries = kernelParity?.strategyCounts.code_object_v3 ?? 0;
              const kernelCoverage =
                sampledRuns > 0 ? (runsWithKernelParity / sampledRuns) * 100 : 0;
              const v3Share =
                sampledHistoryEntries > 0 ? (v3Entries / sampledHistoryEntries) * 100 : 0;

              return (
                <>
                  <MetadataItem
                    label='Kernel Coverage'
                    value={`${runsWithKernelParity}/${sampledRuns} (${formatPercent(kernelCoverage)})`}
                  />
                  <MetadataItem label='Kernel v3 Share' value={formatPercent(v3Share)} />
                </>
              );
            })()}
            {}
            <MetadataItem
              label='Total Runs'
              value={formatNumber(runtimeAnalyticsQuery.data.runs.total)}
            />
            <MetadataItem
              label='Success Rate'
              value={formatPercent(runtimeAnalyticsQuery.data.runs.successRate)}
            />
            <MetadataItem
              label='Avg Duration'
              value={formatDurationMs(runtimeAnalyticsQuery.data.runs.avgDurationMs)}
            />
            <MetadataItem
              label='Active Nodes'
              value={formatNumber(runtimeAnalyticsQuery.data.nodes.running)}
            />
            {}
          </div>
        ) : (
          <CompactEmptyState
            title='No runtime telemetry'
            description='Failed to load runtime analytics.'
           />
        )}
      </FormSection>

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
