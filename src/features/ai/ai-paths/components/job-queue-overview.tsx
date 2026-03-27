import React from 'react';

import { Alert, InsetPanel, StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  formatDurationMs,
  formatUtcClockTime,
  getSloVariant,
  type QueueHistoryEntry,
  type QueueStatus,
} from './job-queue-panel-utils';
import { AiPathsPillButton } from './AiPathsPillButton';
import { RunningIndicator } from './job-queue-running-indicator';

type JobQueueOverviewProps = {
  queueStatus: QueueStatus | undefined;
  queueStatusError: unknown;
  queueStatusFetching: boolean;
  queueHistory: QueueHistoryEntry[];
  lagThresholdMs: number;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  showMetricsPanel: boolean;
  onToggleMetricsPanel: () => void;
  onClearHistory: () => void;
};

type QueueOverviewCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

type QueueDepthSparklineProps = {
  entries: QueueHistoryEntry[];
  maxItems?: number;
  className?: string;
  barClassName: string;
  minHeight: number;
  titleFormatter: (entry: QueueHistoryEntry) => string;
};

type QueueOverviewLineProps = {
  children: React.ReactNode;
  className?: string;
};

function renderQueueOverviewCard({
  title,
  children,
  className,
}: QueueOverviewCardProps): React.JSX.Element {
  return (
    <InsetPanel
      radius='compact'
      padding='sm'
      className={cn('bg-card/50 text-xs text-gray-300 border-border/60', className)}
    >
      <div className='text-[10px] uppercase text-gray-500'>{title}</div>
      {children}
    </InsetPanel>
  );
}

function renderQueueOverviewMiniCard({
  title,
  children,
  className,
}: QueueOverviewCardProps): React.JSX.Element {
  return (
    <InsetPanel
      radius='compact'
      padding='none'
      className={cn('bg-card/60 p-2 text-[11px] text-gray-300 border-border/60', className)}
    >
      <div className='text-[10px] uppercase text-gray-500'>{title}</div>
      {children}
    </InsetPanel>
  );
}

function QueueDepthSparkline({
  entries,
  maxItems,
  className,
  barClassName,
  minHeight,
  titleFormatter,
}: QueueDepthSparklineProps): React.JSX.Element {
  const visibleEntries =
    typeof maxItems === 'number' ? entries.slice(-maxItems) : entries;
  const maxQueued = Math.max(
    1,
    ...visibleEntries.map((item: QueueHistoryEntry) => item.queued)
  );

  return (
    <div className={className}>
      <div className='flex h-full items-end gap-[2px]'>
        {visibleEntries.length === 0 ? (
          <div className='text-[10px] text-gray-500'>No samples</div>
        ) : (
          visibleEntries.map((entry: QueueHistoryEntry, index: number) => {
            const height = Math.max(minHeight, Math.round((entry.queued / maxQueued) * 100));
            return (
              <div
                key={`${entry.ts}-${index}`}
                className={barClassName}
                style={{ height: `${height}%` }}
                title={titleFormatter(entry)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function QueueOverviewPrimaryLine({
  children,
  className,
}: QueueOverviewLineProps): React.JSX.Element {
  return <div className={cn('mt-1 text-sm text-white', className)}>{children}</div>;
}

function QueueOverviewDetailLine({
  children,
  className,
}: QueueOverviewLineProps): React.JSX.Element {
  return <div className={cn('mt-1 text-[11px] text-gray-400', className)}>{children}</div>;
}

function QueueOverviewCompactDetailLine({
  children,
  className,
}: QueueOverviewLineProps): React.JSX.Element {
  return <div className={cn('mt-1 text-[10px] text-gray-400', className)}>{children}</div>;
}

export function JobQueueOverview(props: JobQueueOverviewProps): React.JSX.Element {
  const {
    queueStatus,
    queueStatusError,
    queueStatusFetching,
    queueHistory,
    lagThresholdMs,
    autoRefreshEnabled,
    autoRefreshInterval,
    showMetricsPanel,
    onToggleMetricsPanel,
    onClearHistory,
  } = props;

  const runtimeAnalyticsEnabled = queueStatus?.runtimeAnalytics.enabled ?? false;

  return (
    <>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
        {renderQueueOverviewCard({
          title: 'Worker',
          children: (
            <>
              <QueueOverviewPrimaryLine className='flex items-center gap-2'>
                {queueStatus ? (queueStatus.running ? 'Running' : 'Stopped') : '-'}
                {queueStatus?.running ? <RunningIndicator label='Active' /> : null}
              </QueueOverviewPrimaryLine>
              <QueueOverviewDetailLine>
                Healthy: {queueStatus ? (queueStatus.healthy ? 'Yes' : 'No') : '-'}
              </QueueOverviewDetailLine>
            </>
          ),
        })}
        {renderQueueOverviewCard({
          title: 'Concurrency',
          children: (
            <>
              <QueueOverviewPrimaryLine>{queueStatus?.concurrency ?? '-'}</QueueOverviewPrimaryLine>
              <QueueOverviewDetailLine className='flex items-center gap-2'>
                <span>Active runs: {queueStatus?.activeRuns ?? 0}</span>
                {(queueStatus?.activeRuns ?? 0) > 0 ? <RunningIndicator label='Busy' /> : null}
              </QueueOverviewDetailLine>
            </>
          ),
        })}
        {renderQueueOverviewCard({
          title: 'Last poll',
          children: (
            <>
              <QueueOverviewPrimaryLine>
                {formatUtcClockTime(queueStatus?.lastPollTime)}
              </QueueOverviewPrimaryLine>
              <QueueOverviewDetailLine>
                Age: {formatDurationMs(queueStatus?.timeSinceLastPoll ?? null)}
              </QueueOverviewDetailLine>
            </>
          ),
        })}
        {renderQueueOverviewCard({
          title: 'Status',
          children: (
            <>
              <QueueOverviewPrimaryLine>
                {queueStatusFetching ? 'Refreshing...' : 'Live'}
              </QueueOverviewPrimaryLine>
              {queueStatusError ? (
                <QueueOverviewDetailLine className='text-rose-200'>
                  {queueStatusError instanceof Error
                    ? queueStatusError.message
                    : 'Failed to load queue status.'}
                </QueueOverviewDetailLine>
              ) : (
                <QueueOverviewDetailLine>
                  Polled every 5s while this panel is active
                </QueueOverviewDetailLine>
              )}
              {queueStatus?.slo ? (
                <StatusBadge
                  status={`SLO ${queueStatus.slo.overall} · ${queueStatus.slo.breachCount} breach${queueStatus.slo.breachCount === 1 ? '' : 'es'}`}
                  variant={getSloVariant(queueStatus.slo.overall)}
                  size='sm'
                  className='mt-2 font-bold'
                />
              ) : null}
            </>
          ),
        })}
        {renderQueueOverviewCard({
          title: 'Queue Depth',
          children: (
            <>
              <QueueOverviewPrimaryLine>{queueStatus?.queuedCount ?? 0} queued</QueueOverviewPrimaryLine>
              <QueueOverviewDetailLine>
                Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
              </QueueOverviewDetailLine>
              <QueueDepthSparkline
                entries={queueHistory}
                maxItems={30}
                className='mt-2 h-10 w-full rounded bg-foreground/5 px-1 py-1'
                barClassName='w-[6px] rounded bg-sky-400/60'
                minHeight={8}
                titleFormatter={(entry: QueueHistoryEntry) => `${entry.queued} queued`}
              />
              <QueueOverviewCompactDetailLine className='mt-2 flex flex-wrap gap-2'>
                <span>Throughput: {queueStatus?.throughputPerMinute ?? 0}/min</span>
                {runtimeAnalyticsEnabled ? (
                  <>
                    <span>p50: {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)}</span>
                    <span>p95: {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}</span>
                  </>
                ) : (
                  <span>Runtime analytics disabled</span>
                )}
              </QueueOverviewCompactDetailLine>
            </>
          ),
        })}
        {renderQueueOverviewCard({
          title: 'Brain Analytics Queue',
          children: (
            <>
              <QueueOverviewPrimaryLine className='flex items-center gap-2'>
                {queueStatus?.brainQueue?.running ? 'Running' : 'Stopped'}
                {queueStatus?.brainQueue?.running ? <RunningIndicator label='Active' /> : null}
              </QueueOverviewPrimaryLine>
              <QueueOverviewDetailLine className='flex items-center gap-2'>
                <span>
                  Active {queueStatus?.brainQueue?.activeJobs ?? 0} · Waiting{' '}
                  {queueStatus?.brainQueue?.waitingJobs ?? 0}
                </span>
                {(queueStatus?.brainQueue?.activeJobs ?? 0) > 0 ? (
                  <RunningIndicator label='Busy' />
                ) : null}
              </QueueOverviewDetailLine>
              {runtimeAnalyticsEnabled ? (
                <>
                  <QueueOverviewCompactDetailLine className='mt-2'>
                    Reports 24h: {queueStatus?.brainAnalytics24h?.totalReports ?? 0}
                  </QueueOverviewCompactDetailLine>
                  <QueueOverviewCompactDetailLine>
                    Analytics {queueStatus?.brainAnalytics24h?.analyticsReports ?? 0} · Logs{' '}
                    {queueStatus?.brainAnalytics24h?.logReports ?? 0}
                  </QueueOverviewCompactDetailLine>
                  <QueueOverviewCompactDetailLine className='text-amber-200/90'>
                    Warnings {queueStatus?.brainAnalytics24h?.warningReports ?? 0} · Errors{' '}
                    {queueStatus?.brainAnalytics24h?.errorReports ?? 0}
                  </QueueOverviewCompactDetailLine>
                </>
              ) : (
                <QueueOverviewCompactDetailLine className='mt-2'>
                  Runtime analytics disabled in AI Brain.
                </QueueOverviewCompactDetailLine>
              )}
            </>
          ),
        })}
      </div>

      {queueStatus?.queueLagMs && queueStatus.queueLagMs > lagThresholdMs ? (
        <Alert variant='error' className='mt-4'>
          Queue lag is high: {formatDurationMs(queueStatus.queueLagMs)} (threshold{' '}
          {formatDurationMs(lagThresholdMs)}). Consider increasing concurrency or investigating slow
          nodes.
        </Alert>
      ) : null}

      {queueStatus?.slo && queueStatus.slo.overall !== 'ok' ? (
        <Alert variant={getSloVariant(queueStatus.slo.overall)} className='mt-3'>
          <div className='font-medium'>Runtime SLO is {queueStatus.slo.overall}.</div>
          <div className='mt-1 text-xs opacity-90'>
            {queueStatus.slo.breaches
              .slice(0, 3)
              .map((breach) => breach.message)
              .join(' ')}
          </div>
        </Alert>
      ) : null}

      <InsetPanel radius='compact' padding='sm' className='mt-4'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-gray-200'>Queue Metrics (History)</div>
            <div className='text-[11px] text-gray-500'>
              Last {queueHistory.length} samples · refresh{' '}
              {autoRefreshEnabled ? `${Math.round(autoRefreshInterval / 1000)}s` : 'off'}
              {queueHistory.length > 0
                ? ` · last sample ${formatUtcClockTime(queueHistory[queueHistory.length - 1]!.ts)}`
                : ''}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <AiPathsPillButton
              className='text-gray-200'
              onClick={onToggleMetricsPanel}
            >
              {showMetricsPanel ? 'Hide' : 'Show'}
            </AiPathsPillButton>
            <AiPathsPillButton
              className='text-gray-200'
              onClick={onClearHistory}
            >
              Clear
            </AiPathsPillButton>
          </div>
        </div>
        {showMetricsPanel ? (
          <div className='mt-3 space-y-3'>
            <QueueDepthSparkline
              entries={queueHistory}
              className='h-24 w-full rounded bg-foreground/5 px-2 py-2'
              barClassName='w-[5px] rounded bg-emerald-400/60'
              minHeight={6}
              titleFormatter={(entry: QueueHistoryEntry) =>
                `${entry.queued} queued @ ${formatUtcClockTime(entry.ts)}`
              }
            />
            <div className='grid gap-2 md:grid-cols-3'>
              {renderQueueOverviewMiniCard({
                title: 'Queue Depth',
                children: (
                  <>
                    <QueueOverviewPrimaryLine>{queueStatus?.queuedCount ?? 0}</QueueOverviewPrimaryLine>
                    <QueueOverviewCompactDetailLine>
                      Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
                    </QueueOverviewCompactDetailLine>
                  </>
                ),
              })}
              {renderQueueOverviewMiniCard({
                title: 'Throughput',
                children: (
                  <>
                    <QueueOverviewPrimaryLine>
                      {queueStatus?.throughputPerMinute ?? 0}/min
                    </QueueOverviewPrimaryLine>
                    <QueueOverviewCompactDetailLine>
                      Completed: {queueStatus?.completedLastMinute ?? 0} (last min)
                    </QueueOverviewCompactDetailLine>
                  </>
                ),
              })}
              {renderQueueOverviewMiniCard({
                title: 'Runtime',
                children: runtimeAnalyticsEnabled ? (
                  <>
                    <QueueOverviewPrimaryLine>
                      avg {formatDurationMs(queueStatus?.avgRuntimeMs ?? null)}
                    </QueueOverviewPrimaryLine>
                    <QueueOverviewCompactDetailLine>
                      p50 {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)} · p95{' '}
                      {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}
                    </QueueOverviewCompactDetailLine>
                  </>
                ) : (
                  <QueueOverviewCompactDetailLine>
                    Runtime analytics disabled.
                  </QueueOverviewCompactDetailLine>
                ),
              })}
            </div>
          </div>
        ) : null}
      </InsetPanel>
    </>
  );
}
