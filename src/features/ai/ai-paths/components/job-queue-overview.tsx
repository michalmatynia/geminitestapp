import React from 'react';

import { Alert, Button, InsetPanel, StatusBadge } from '@/shared/ui';

import {
  formatDurationMs,
  formatUtcClockTime,
  getSloVariant,
  type QueueHistoryEntry,
  type QueueStatus,
} from './job-queue-panel-utils';
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
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Worker</div>
          <div className='mt-1 flex items-center gap-2 text-sm text-white'>
            {queueStatus ? (queueStatus.running ? 'Running' : 'Stopped') : '-'}
            {queueStatus?.running ? <RunningIndicator label='Active' /> : null}
          </div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Healthy: {queueStatus ? (queueStatus.healthy ? 'Yes' : 'No') : '-'}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Concurrency</div>
          <div className='mt-1 text-sm text-white'>{queueStatus?.concurrency ?? '-'}</div>
          <div className='mt-1 flex items-center gap-2 text-[11px] text-gray-400'>
            <span>Active runs: {queueStatus?.activeRuns ?? 0}</span>
            {(queueStatus?.activeRuns ?? 0) > 0 ? <RunningIndicator label='Busy' /> : null}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Last poll</div>
          <div className='mt-1 text-sm text-white'>
            {formatUtcClockTime(queueStatus?.lastPollTime)}
          </div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Age: {formatDurationMs(queueStatus?.timeSinceLastPoll ?? null)}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Status</div>
          <div className='mt-1 text-sm text-white'>
            {queueStatusFetching ? 'Refreshing...' : 'Live'}
          </div>
          {queueStatusError ? (
            <div className='mt-1 text-[11px] text-rose-200'>
              {queueStatusError instanceof Error
                ? queueStatusError.message
                : 'Failed to load queue status.'}
            </div>
          ) : (
            <div className='mt-1 text-[11px] text-gray-400'>
              Polled every 5s while this panel is active
            </div>
          )}
          {queueStatus?.slo ? (
            <StatusBadge
              status={`SLO ${queueStatus.slo.overall} · ${queueStatus.slo.breachCount} breach${queueStatus.slo.breachCount === 1 ? '' : 'es'}`}
              variant={getSloVariant(queueStatus.slo.overall)}
              size='sm'
              className='mt-2 font-bold'
            />
          ) : null}
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Queue Depth</div>
          <div className='mt-1 text-sm text-white'>{queueStatus?.queuedCount ?? 0} queued</div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
          </div>
          <div className='mt-2 h-10 w-full rounded bg-foreground/5 px-1 py-1'>
            <div className='flex h-full items-end gap-[2px]'>
              {queueHistory.length === 0 ? (
                <div className='text-[10px] text-gray-500'>No samples</div>
              ) : (
                queueHistory.slice(-30).map((entry: QueueHistoryEntry, index: number) => {
                  const max = Math.max(
                    1,
                    ...queueHistory.slice(-30).map((item: QueueHistoryEntry) => item.queued)
                  );
                  const height = Math.max(8, Math.round((entry.queued / max) * 100));
                  return (
                    <div
                      key={`${entry.ts}-${index}`}
                      className='w-[6px] rounded bg-sky-400/60'
                      style={{ height: `${height}%` }}
                      title={`${entry.queued} queued`}
                    />
                  );
                })
              )}
            </div>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400'>
            <span>Throughput: {queueStatus?.throughputPerMinute ?? 0}/min</span>
            {runtimeAnalyticsEnabled ? (
              <>
                <span>p50: {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)}</span>
                <span>p95: {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}</span>
              </>
            ) : (
              <span>Runtime analytics disabled</span>
            )}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Brain Analytics Queue</div>
          <div className='mt-1 flex items-center gap-2 text-sm text-white'>
            {queueStatus?.brainQueue?.running ? 'Running' : 'Stopped'}
            {queueStatus?.brainQueue?.running ? <RunningIndicator label='Active' /> : null}
          </div>
          <div className='mt-1 flex items-center gap-2 text-[11px] text-gray-400'>
            <span>
              Active {queueStatus?.brainQueue?.activeJobs ?? 0} · Waiting{' '}
              {queueStatus?.brainQueue?.waitingJobs ?? 0}
            </span>
            {(queueStatus?.brainQueue?.activeJobs ?? 0) > 0 ? (
              <RunningIndicator label='Busy' />
            ) : null}
          </div>
          {runtimeAnalyticsEnabled ? (
            <>
              <div className='mt-2 text-[10px] text-gray-400'>
                Reports 24h: {queueStatus?.brainAnalytics24h?.totalReports ?? 0}
              </div>
              <div className='mt-1 text-[10px] text-gray-400'>
                Analytics {queueStatus?.brainAnalytics24h?.analyticsReports ?? 0} · Logs{' '}
                {queueStatus?.brainAnalytics24h?.logReports ?? 0}
              </div>
              <div className='mt-1 text-[10px] text-amber-200/90'>
                Warnings {queueStatus?.brainAnalytics24h?.warningReports ?? 0} · Errors{' '}
                {queueStatus?.brainAnalytics24h?.errorReports ?? 0}
              </div>
            </>
          ) : (
            <div className='mt-2 text-[10px] text-gray-400'>
              Runtime analytics disabled in AI Brain.
            </div>
          )}
        </div>
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
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={onToggleMetricsPanel}
            >
              {showMetricsPanel ? 'Hide' : 'Show'}
            </Button>
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={onClearHistory}
            >
              Clear
            </Button>
          </div>
        </div>
        {showMetricsPanel ? (
          <div className='mt-3 space-y-3'>
            <div className='h-24 w-full rounded bg-foreground/5 px-2 py-2'>
              <div className='flex h-full items-end gap-[2px]'>
                {queueHistory.length === 0 ? (
                  <div className='text-[10px] text-gray-500'>No samples</div>
                ) : (
                  queueHistory.map((entry: QueueHistoryEntry, index: number) => {
                    const max = Math.max(
                      1,
                      ...queueHistory.map((item: QueueHistoryEntry) => item.queued)
                    );
                    const height = Math.max(6, Math.round((entry.queued / max) * 100));
                    return (
                      <div
                        key={`${entry.ts}-${index}`}
                        className='w-[5px] rounded bg-emerald-400/60'
                        style={{ height: `${height}%` }}
                        title={`${entry.queued} queued @ ${formatUtcClockTime(entry.ts)}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className='grid gap-2 md:grid-cols-3'>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Queue Depth</div>
                <div className='mt-1 text-sm text-white'>{queueStatus?.queuedCount ?? 0}</div>
                <div className='mt-1 text-[10px] text-gray-400'>
                  Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Throughput</div>
                <div className='mt-1 text-sm text-white'>
                  {queueStatus?.throughputPerMinute ?? 0}/min
                </div>
                <div className='mt-1 text-[10px] text-gray-400'>
                  Completed: {queueStatus?.completedLastMinute ?? 0} (last min)
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Runtime</div>
                {runtimeAnalyticsEnabled ? (
                  <>
                    <div className='mt-1 text-sm text-white'>
                      avg {formatDurationMs(queueStatus?.avgRuntimeMs ?? null)}
                    </div>
                    <div className='mt-1 text-[10px] text-gray-400'>
                      p50 {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)} · p95{' '}
                      {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}
                    </div>
                  </>
                ) : (
                  <div className='mt-1 text-[10px] text-gray-400'>Runtime analytics disabled.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </InsetPanel>
    </>
  );
}
