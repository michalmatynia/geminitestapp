'use client';

import { Activity, Radar } from 'lucide-react';
import React from 'react';

import { Button, MetadataItem, StatusBadge, Alert, SectionHeader, FormSection } from '@/shared/ui';

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

export function MetricsTab(): React.JSX.Element {
  const {
    analyticsSummaryQuery,
    logMetricsQuery,
    insightsQuery,
    runtimeAnalyticsQuery,
  } = useBrain();

  const latestAnalyticsInsight = insightsQuery.data?.analytics?.[0] ?? null;
  const latestLogsInsight = insightsQuery.data?.logs?.[0] ?? null;

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Deep Metrics'
        description='Auto-refreshing telemetry from analytics, system logs, and AI insight runs.'
        className='p-4'
        actions={
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void analyticsSummaryQuery.refetch();
              void logMetricsQuery.refetch();
              void insightsQuery.refetch();
              void runtimeAnalyticsQuery.refetch();
            }}
          >
            Refresh now
          </Button>
        }
      />

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <MetadataItem
          label='Analytics Events (24h)'
          value={formatNumber(analyticsSummaryQuery.data?.totals.events)}
          valueClassName='text-2xl font-semibold text-white'
        />
        <MetadataItem
          label='Visitors (24h)'
          value={formatNumber(analyticsSummaryQuery.data?.visitors)}
          valueClassName='text-2xl font-semibold text-white'
        />
        <MetadataItem
          label='Error Logs (24h)'
          value={formatNumber(logMetricsQuery.data?.last24Hours)}
          valueClassName='text-2xl font-semibold text-white'
        />
        <MetadataItem
          label='Error Logs (7d)'
          value={formatNumber(logMetricsQuery.data?.last7Days)}
          valueClassName='text-2xl font-semibold text-white'
        />
        <MetadataItem
          label='Runtime Runs (24h)'
          value={formatNumber(runtimeAnalyticsQuery.data?.runs.total)}
          valueClassName='text-2xl font-semibold text-white'
          hint={`Success ${formatPercent(runtimeAnalyticsQuery.data?.runs.successRate)}`}
        />
        <MetadataItem
          label='Brain Reports (24h)'
          value={formatNumber(runtimeAnalyticsQuery.data?.brain.totalReports)}
          valueClassName='text-2xl font-semibold text-white'
          hint={`Warn ${formatNumber(runtimeAnalyticsQuery.data?.brain.warningReports)} · Err ${formatNumber(runtimeAnalyticsQuery.data?.brain.errorReports)}`}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <div className='flex items-center gap-2 text-sm font-semibold text-white'>
            <Activity className='size-4 text-cyan-300' />
            Top Analytics Pages (24h)
          </div>
          <div className='mt-3 space-y-2'>
            {(analyticsSummaryQuery.data?.topPages ?? []).slice(0, 6).map((entry: { path: string; count: number }) => (
              <div key={entry.path} className='flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs'>
                <span className='truncate text-gray-200'>{entry.path || '/'}</span>
                <span className='text-gray-400'>{entry.count}</span>
              </div>
            ))}
            {(analyticsSummaryQuery.data?.topPages?.length ?? 0) === 0 ? (
              <div className='text-xs text-gray-500'>No analytics page data available.</div>
            ) : null}
          </div>
        </div>

        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <div className='flex items-center gap-2 text-sm font-semibold text-white'>
            <Radar className='size-4 text-amber-300' />
            Top Error Sources (logs)
          </div>
          <div className='mt-3 space-y-2'>
            {(logMetricsQuery.data?.topSources ?? []).slice(0, 6).map((entry: { source: string; count: number }) => (
              <div key={`${entry.source}-${entry.count}`} className='flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs'>
                <span className='truncate text-gray-200'>{entry.source || 'unknown'}</span>
                <span className='text-gray-400'>{entry.count}</span>
              </div>
            ))}
            {(logMetricsQuery.data?.topSources?.length ?? 0) === 0 ? (
              <div className='text-xs text-gray-500'>No log source data available.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <MetadataItem
          label='Latest Analytics Insight'
          className='p-4'
          hint={latestAnalyticsInsight ? formatDate(latestAnalyticsInsight.createdAt) : undefined}
          value={(
            latestAnalyticsInsight ? (
              <div className='space-y-2'>
                <StatusBadge status={latestAnalyticsInsight.status} />
                <div className='text-xs text-gray-300'>{latestAnalyticsInsight.summary}</div>
              </div>
            ) : (
              <div className='text-xs text-gray-500'>No analytics insights yet.</div>
            )
          )}
        />

        <MetadataItem
          label='Latest Log Insight'
          className='p-4'
          hint={latestLogsInsight ? formatDate(latestLogsInsight.createdAt) : undefined}
          value={(
            latestLogsInsight ? (
              <div className='space-y-2'>
                <StatusBadge status={latestLogsInsight.status} />
                <div className='text-xs text-gray-300'>{latestLogsInsight.summary}</div>
              </div>
            ) : (
              <div className='text-xs text-gray-500'>No log insights yet.</div>
            )
          )}
        />
      </div>

      <FormSection
        title='Runtime Analysis (Redis)'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
          <MetadataItem
            label='Queued / Started'
            value={`${formatNumber(runtimeAnalyticsQuery.data?.runs.queued)} / ${formatNumber(runtimeAnalyticsQuery.data?.runs.started)}`}
          />
          <MetadataItem
            label='Completed / Failed'
            value={`${formatNumber(runtimeAnalyticsQuery.data?.runs.completed)} / ${formatNumber(runtimeAnalyticsQuery.data?.runs.failed)}`}
          />
          <MetadataItem
            label='Avg Runtime'
            value={formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
          />
          <MetadataItem
            label='p95 Runtime'
            value={formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
          />
        </div>
        <div className='mt-3 text-[11px] text-gray-500'>
          Storage: {runtimeAnalyticsQuery.data?.storage ?? '—'} · Updated {runtimeAnalyticsQuery.data?.generatedAt ? formatDate(runtimeAnalyticsQuery.data.generatedAt) : '—'}
        </div>
      </FormSection>

      {analyticsSummaryQuery.error || logMetricsQuery.error || insightsQuery.error || runtimeAnalyticsQuery.error ? (
        <Alert variant='error'>
          {(analyticsSummaryQuery.error)?.message ??
            (logMetricsQuery.error)?.message ??
            (insightsQuery.error)?.message ??
            (runtimeAnalyticsQuery.error)?.message ??
            'Failed to load metrics.'}
        </Alert>
      ) : null}
    </div>
  );
}
