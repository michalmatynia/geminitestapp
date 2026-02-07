'use client';

import { Activity, Radar } from 'lucide-react';

import { type AiInsightRecord } from '@/shared/types';
import { Button, SectionPanel } from '@/shared/ui';
import { cn } from '@/shared/utils';

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

const getInsightStatusClass = (status: AiInsightRecord['status']): string => {
  if (status === 'ok') return 'border-emerald-500/40 text-emerald-300';
  if (status === 'warning') return 'border-amber-500/40 text-amber-300';
  return 'border-rose-500/40 text-rose-300';
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
    <div className="space-y-4">
      <SectionPanel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Deep Metrics</div>
          <div className="text-xs text-gray-400">
            Auto-refreshing telemetry from analytics, system logs, and AI insight runs.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void analyticsSummaryQuery.refetch();
            void logMetricsQuery.refetch();
            void insightsQuery.refetch();
            void runtimeAnalyticsQuery.refetch();
          }}
        >
          Refresh now
        </Button>
      </SectionPanel>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Analytics Events (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(analyticsSummaryQuery.data?.totals.events)}
          </div>
        </SectionPanel>
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Visitors (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(analyticsSummaryQuery.data?.visitors)}
          </div>
        </SectionPanel>
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Error Logs (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(logMetricsQuery.data?.last24Hours)}
          </div>
        </SectionPanel>
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Error Logs (7d)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(logMetricsQuery.data?.last7Days)}
          </div>
        </SectionPanel>
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Runtime Runs (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(runtimeAnalyticsQuery.data?.runs.total)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Success {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate)}
          </div>
        </SectionPanel>
        <SectionPanel variant="subtle-compact">
          <div className="text-[11px] uppercase text-gray-500">Brain Reports (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {formatNumber(runtimeAnalyticsQuery.data?.brain.totalReports)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Warn {formatNumber(runtimeAnalyticsQuery.data?.brain.warningReports)} · Err {formatNumber(runtimeAnalyticsQuery.data?.brain.errorReports)}
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="size-4 text-cyan-300" />
            Top Analytics Pages (24h)
          </div>
          <div className="mt-3 space-y-2">
            {(analyticsSummaryQuery.data?.topPages ?? []).slice(0, 6).map((entry: { path: string; count: number }) => (
              <div key={entry.path} className="flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs">
                <span className="truncate text-gray-200">{entry.path || '/'}</span>
                <span className="text-gray-400">{entry.count}</span>
              </div>
            ))}
            {(analyticsSummaryQuery.data?.topPages?.length ?? 0) === 0 ? (
              <div className="text-xs text-gray-500">No analytics page data available.</div>
            ) : null}
          </div>
        </SectionPanel>

        <SectionPanel>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar className="size-4 text-amber-300" />
            Top Error Sources (logs)
          </div>
          <div className="mt-3 space-y-2">
            {(logMetricsQuery.data?.topSources ?? []).slice(0, 6).map((entry: { source: string; count: number }) => (
              <div key={`${entry.source}-${entry.count}`} className="flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs">
                <span className="truncate text-gray-200">{entry.source || 'unknown'}</span>
                <span className="text-gray-400">{entry.count}</span>
              </div>
            ))}
            {(logMetricsQuery.data?.topSources?.length ?? 0) === 0 ? (
              <div className="text-xs text-gray-500">No log source data available.</div>
            ) : null}
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel>
          <div className="text-sm font-semibold text-white">Latest Analytics Insight</div>
          {latestAnalyticsInsight ? (
            <div className="mt-3 space-y-2">
              <div className={cn('inline-flex rounded border px-2 py-1 text-[11px] uppercase', getInsightStatusClass(latestAnalyticsInsight.status))}>
                {latestAnalyticsInsight.status}
              </div>
              <div className="text-xs text-gray-300">{latestAnalyticsInsight.summary}</div>
              <div className="text-[11px] text-gray-500">
                {formatDate(latestAnalyticsInsight.createdAt)}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-500">No analytics insights yet.</div>
          )}
        </SectionPanel>

        <SectionPanel>
          <div className="text-sm font-semibold text-white">Latest Log Insight</div>
          {latestLogsInsight ? (
            <div className="mt-3 space-y-2">
              <div className={cn('inline-flex rounded border px-2 py-1 text-[11px] uppercase', getInsightStatusClass(latestLogsInsight.status))}>
                {latestLogsInsight.status}
              </div>
              <div className="text-xs text-gray-300">{latestLogsInsight.summary}</div>
              <div className="text-[11px] text-gray-500">
                {formatDate(latestLogsInsight.createdAt)}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-500">No log insights yet.</div>
          )}
        </SectionPanel>
      </div>

      <SectionPanel>
        <div className="text-sm font-semibold text-white">Runtime Analysis (Redis)</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-border/60 bg-card/60 p-3">
            <div className="text-[10px] uppercase text-gray-500">Queued / Started</div>
            <div className="mt-1 text-sm text-white">
              {formatNumber(runtimeAnalyticsQuery.data?.runs.queued)} / {formatNumber(runtimeAnalyticsQuery.data?.runs.started)}
            </div>
          </div>
          <div className="rounded border border-border/60 bg-card/60 p-3">
            <div className="text-[10px] uppercase text-gray-500">Completed / Failed</div>
            <div className="mt-1 text-sm text-white">
              {formatNumber(runtimeAnalyticsQuery.data?.runs.completed)} / {formatNumber(runtimeAnalyticsQuery.data?.runs.failed)}
            </div>
          </div>
          <div className="rounded border border-border/60 bg-card/60 p-3">
            <div className="text-[10px] uppercase text-gray-500">Avg Runtime</div>
            <div className="mt-1 text-sm text-white">
              {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
            </div>
          </div>
          <div className="rounded border border-border/60 bg-card/60 p-3">
            <div className="text-[10px] uppercase text-gray-500">p95 Runtime</div>
            <div className="mt-1 text-sm text-white">
              {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-gray-500">
          Storage: {runtimeAnalyticsQuery.data?.storage ?? '—'} · Updated {runtimeAnalyticsQuery.data?.generatedAt ? formatDate(runtimeAnalyticsQuery.data.generatedAt) : '—'}
        </div>
      </SectionPanel>

      {analyticsSummaryQuery.error || logMetricsQuery.error || insightsQuery.error || runtimeAnalyticsQuery.error ? (
        <SectionPanel variant="danger">
          <div className="text-sm text-rose-200">
            {(analyticsSummaryQuery.error as Error | null)?.message ??
              (logMetricsQuery.error as Error | null)?.message ??
              (insightsQuery.error as Error | null)?.message ??
              (runtimeAnalyticsQuery.error as Error | null)?.message ??
              'Failed to load metrics.'}
          </div>
        </SectionPanel>
      ) : null}
    </div>
  );
}
