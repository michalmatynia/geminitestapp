'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PauseIcon, PlayIcon, RefreshCwIcon } from 'lucide-react';

import { Badge, Button, Card, ListPanel, LoadingState } from '@/features/kangur/shared/ui';
import { api } from '@/shared/lib/api-client';
import type { QueueHealthStatus } from '@/shared/contracts/jobs';
import { safeClearTimeout, safeSetInterval, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';

const REFRESH_INTERVAL_MS = 10_000;
const QUEUE_PANEL_REQUEST_TIMEOUT_MS = 60_000;

type PipelineStatus = QueueHealthStatus & {
  isPaused?: boolean;
  repeatEveryMs?: number;
};

type PipelineJobRecord = {
  id: string;
  status: string;
  data:
    | {
        type?: string;
        input?: {
          postId?: string | null;
          docReferenceCount?: number;
          imageAddonCount?: number;
        };
      }
    | unknown;
  progress: {
    captureMode?: 'existing_assets' | 'fresh_capture';
    requestedPresetCount?: number | null;
    usedPresetCount?: number | null;
  } | null;
  result: {
    type?: string;
    postId?: string | null;
    captureMode?: 'existing_assets' | 'fresh_capture';
    skipped?: boolean;
    reason?: string;
    addonsCreated?: number;
    failures?: number;
    runId?: string;
  } | null;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  timestamp: number;
  duration: number | null;
};

type PanelVariant = 'full' | 'compact';

export function KangurSocialPipelineQueuePanel({
  variant = 'full',
}: {
  variant?: PanelVariant;
}): React.JSX.Element {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [jobs, setJobs] = useState<PipelineJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<SafeTimerId | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (variant === 'compact') {
        const statusData = await api.get<PipelineStatus>(
          '/api/kangur/social-pipeline/status',
          { timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS }
        );
        setStatus(statusData);
      } else {
        const [statusData, jobsData] = await Promise.all([
          api.get<PipelineStatus>('/api/kangur/social-pipeline/status', {
            timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS,
          }),
          api.get<PipelineJobRecord[]>('/api/kangur/social-pipeline/jobs', {
            timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS,
          }),
        ]);
        setStatus(statusData);
        setJobs(jobsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue data.');
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    void fetchData();
    const interval = safeSetInterval(() => void fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    return () => {
      safeClearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    };
  }, []);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    try {
      await api.post('/api/kangur/social-pipeline/trigger', undefined, {
        timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS,
      });
      safeClearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = safeSetTimeout(() => {
        refreshTimeoutRef.current = null;
        void fetchData();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline.');
    } finally {
      setTriggering(false);
    }
  }, [fetchData]);

  const handleTogglePause = useCallback(async () => {
    setTogglingPause(true);
    try {
      const endpoint = status?.isPaused
        ? '/api/kangur/social-pipeline/resume'
        : '/api/kangur/social-pipeline/pause';
      await api.post(endpoint, undefined, {
        timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS,
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pause.');
    } finally {
      setTogglingPause(false);
    }
  }, [status?.isPaused, fetchData]);

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      if (
        !window.confirm(
          'Delete this StudiQ Social pipeline job from the queue history? This cannot be undone.'
        )
      ) {
        return;
      }

      setDeletingJobId(jobId);
      setError(null);
      try {
        await api.delete('/api/kangur/social-pipeline/jobs', {
          params: { id: jobId },
          timeout: QUEUE_PANEL_REQUEST_TIMEOUT_MS,
        });
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete pipeline job.');
      } finally {
        setDeletingJobId(null);
      }
    },
    [fetchData]
  );

  const isHealthy = status?.healthy ?? false;
  const isRunning = status?.running ?? false;
  const isPaused = status?.isPaused ?? false;
  const hasActiveServerRun =
    isRunning &&
    ((status?.processing ?? false) || (status?.activeCount ?? 0) > 0);
  const isLoadingStatus = loading && !status;

  const lastPollLabel = useMemo(() => {
    if (!status?.lastPollTime) return 'Never';
    return new Date(status.lastPollTime).toLocaleString();
  }, [status?.lastPollTime]);

  const timeSinceLastPollLabel = useMemo(() => {
    const ms = status?.timeSinceLastPoll;
    if (!ms || ms <= 0) return null;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
    return `${Math.round(ms / 60_000)}m ago`;
  }, [status?.timeSinceLastPoll]);

  if (variant === 'compact') {
    return (
      <Card
        variant='subtle'
        padding='md'
        className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-semibold text-foreground'>
              Pipeline Queue
            </span>
            {status ? (
              <Badge
                variant={!isRunning ? 'outline' : isHealthy ? 'secondary' : 'outline'}
                className='text-[10px]'
              >
                {!isRunning ? 'Offline' : isPaused ? 'Paused' : 'Running'}
              </Badge>
            ) : null}
            {status && isRunning ? (
              <span className='text-[10px] text-muted-foreground'>
                {status.activeCount} active / {status.completedCount} done / {status.failedCount} failed
              </span>
            ) : null}
          </div>
          <div className='flex items-center gap-1.5'>
            {!isPaused && !hasActiveServerRun ? (
              <Button
                size='xs'
                variant='outline'
                onClick={() => void handleTrigger()}
                disabled={triggering}
                aria-label='Run pipeline now'
                className='gap-1 text-[10px]'
              >
                <PlayIcon className='size-2.5' />
                {triggering ? 'Running...' : 'Run Now'}
              </Button>
            ) : null}
            <Button
              size='xs'
              variant='ghost'
              onClick={() => void fetchData()}
              disabled={loading}
              aria-label='Refresh'
            >
              <RefreshCwIcon className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {error ? (
          <div className='mt-2 text-[11px] text-destructive'>{error}</div>
        ) : null}
        {isLoadingStatus ? <LoadingState message='Loading queue status...' className='py-6' /> : null}
      </Card>
    );
  }

  return (
    <ListPanel
      header={
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-sm font-semibold text-foreground'>
              StudiQ Social Pipeline
            </div>
            <div className='text-xs text-muted-foreground'>
              Automated batch capture of social media screenshots via Redis queue.
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {status ? (
              <Badge variant={isHealthy ? 'secondary' : 'outline'}>
                {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
              </Badge>
            ) : null}
            {isRunning ? (
              <Button
                size='xs'
                variant='ghost'
                onClick={() => void handleTogglePause()}
                disabled={togglingPause}
                aria-label={isPaused ? 'Resume pipeline' : 'Pause pipeline'}
                className='gap-1'
              >
                {isPaused ? (
                  <>
                    <PlayIcon className='size-3' />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseIcon className='size-3' />
                    Pause
                  </>
                )}
              </Button>
            ) : null}
            {!isPaused && !hasActiveServerRun ? (
              <Button
                size='xs'
                variant='outline'
                onClick={() => void handleTrigger()}
                disabled={triggering}
                aria-label='Run pipeline now'
                className='gap-1.5'
              >
                <PlayIcon className='size-3' />
                {triggering ? 'Triggering...' : 'Run Now'}
              </Button>
            ) : null}
            <Button
              size='xs'
              variant='ghost'
              onClick={() => void fetchData()}
              disabled={loading}
              aria-label='Refresh queue status'
            >
              <RefreshCwIcon className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      }
      className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
      contentClassName='space-y-3'
    >
      {error ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-xl border-destructive/40 bg-destructive/5 text-sm text-destructive'
        >
          {error}
        </Card>
      ) : null}

      {isLoadingStatus ? <LoadingState message='Loading queue status...' className='py-8' /> : null}

      {status ? (
        <>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <StatusCard label='Active' value={status.activeCount} />
            <StatusCard label='Waiting' value={status.waitingCount} />
            <StatusCard label='Completed' value={status.completedCount} />
            <StatusCard label='Failed' value={status.failedCount} />
          </div>
          <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
            <span>
              Last run: {lastPollLabel}
              {timeSinceLastPollLabel ? ` (${timeSinceLastPollLabel})` : ''}
            </span>
            {status.delayedCount != null && status.delayedCount > 0 ? (
              <span>Delayed: {status.delayedCount}</span>
            ) : null}
          </div>
        </>
      ) : null}

      {status && !isRunning ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-xl border-amber-500/30 bg-amber-500/5 text-sm text-amber-600'
        >
          Pipeline worker is not running. Ensure Redis is available and REDIS_URL is configured.
        </Card>
      ) : null}

      {loading && status && jobs.length === 0 ? (
        <LoadingState message='Loading recent jobs...' className='py-6' size='sm' />
      ) : null}

      {jobs.length > 0 ? (
        <div className='space-y-1.5'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Recent Jobs
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-border/40 text-left text-muted-foreground'>
                  <th className='pb-1.5 pr-3 font-medium'>Status</th>
                  <th className='pb-1.5 pr-3 font-medium'>Job</th>
                  <th className='pb-1.5 pr-3 font-medium'>Addons</th>
                  <th className='pb-1.5 pr-3 font-medium'>Failures</th>
                  <th className='pb-1.5 pr-3 font-medium'>Duration</th>
                  <th className='pb-1.5 font-medium'>Finished</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 20).map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    deleting={deletingJobId === job.id}
                    onDeleteJob={handleDeleteJob}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ListPanel>
  );
}

function StatusCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <Card
      variant='subtle'
      padding='md'
      className='rounded-xl border-border/40 bg-background/30'
    >
      <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </div>
      <div className='mt-1 text-2xl font-bold tabular-nums text-foreground'>{value}</div>
    </Card>
  );
}

function JobRow({
  job,
  deleting,
  onDeleteJob,
}: {
  job: PipelineJobRecord;
  deleting: boolean;
  onDeleteJob: (jobId: string) => Promise<void>;
}): React.JSX.Element {
  const statusVariant =
    job.status === 'completed'
      ? 'secondary'
      : job.status === 'failed'
        ? 'destructive'
        : job.status === 'active'
          ? 'default'
          : 'outline';

  const statusLabel = job.result?.skipped
    ? `skipped (${job.result.reason ?? '?'})`
    : job.status;
  const isManualRun = (job.data as { type?: string } | null)?.type === 'manual-post-pipeline';
  const postId =
    (job.data as { input?: { postId?: string | null } } | null)?.input?.postId ??
    job.result?.postId ??
    null;
  const jobLabel = isManualRun ? 'Manual post pipeline' : 'Scheduled pipeline tick';
  const captureMode = job.progress?.captureMode ?? job.result?.captureMode ?? null;
  const captureModeLabel =
    captureMode === 'fresh_capture'
      ? 'Fresh Playwright capture'
      : captureMode === 'existing_assets'
        ? 'Use attached visuals'
        : null;
  const presetUsageLabel =
    captureMode === 'fresh_capture' &&
    job.progress?.usedPresetCount != null &&
    job.progress?.requestedPresetCount != null
      ? `${job.progress.usedPresetCount}/${job.progress.requestedPresetCount} presets used`
      : null;
  const jobMeta = [isManualRun && postId ? `Post ${postId}` : null, captureModeLabel, presetUsageLabel]
    .filter((value): value is string => Boolean(value));

  const durationLabel =
    job.duration != null ? `${(job.duration / 1000).toFixed(1)}s` : '---';

  const finishedLabel = job.finishedOn
    ? new Date(job.finishedOn).toLocaleString()
    : job.status === 'active'
      ? 'Running...'
      : '---';
  const canDelete = job.status === 'completed' || job.status === 'failed';

  return (
    <tr className='border-b border-border/20'>
      <td className='py-1.5 pr-3'>
        <Badge variant={statusVariant} className='text-[10px]'>
          {statusLabel}
        </Badge>
      </td>
      <td className='py-1.5 pr-3'>
        <div className='font-medium text-foreground'>{jobLabel}</div>
        {jobMeta.length > 0 ? (
          <div className='space-y-0.5 text-[10px] text-muted-foreground'>
            {jobMeta.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        ) : null}
      </td>
      <td className='py-1.5 pr-3 tabular-nums'>
        {job.result?.addonsCreated ?? '---'}
      </td>
      <td className='py-1.5 pr-3 tabular-nums'>
        {job.result?.failures != null ? job.result.failures : '---'}
      </td>
      <td className='py-1.5 pr-3 tabular-nums'>{durationLabel}</td>
      <td className='py-1.5 text-muted-foreground'>
        {finishedLabel}
        {job.failedReason ? (
          <span className='ml-2 text-destructive' title={job.failedReason}>
            {job.failedReason.slice(0, 60)}
          </span>
        ) : null}
        {canDelete ? (
          <div className='mt-2'>
            <Button
              size='xs'
              variant='ghost'
              onClick={() => {
                void onDeleteJob(job.id);
              }}
              disabled={deleting}
              aria-label={`Delete pipeline job ${job.id}`}
              className='h-auto px-0 text-[10px] text-destructive hover:text-destructive'
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
