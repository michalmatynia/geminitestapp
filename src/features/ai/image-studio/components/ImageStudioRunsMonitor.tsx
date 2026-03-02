'use client';

import React from 'react';

import { useImageStudioRuns } from '@/features/ai/ai-paths/hooks/useImageStudioRuns';
import { Card, Badge, LoadingState } from '@/shared/ui';

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDuration = (startedAt: string | null, finishedAt: string | null): string => {
  if (!startedAt || !finishedAt) return 'n/a';
  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return 'n/a';
  const ms = finished - started;
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

export function ImageStudioRunsMonitor(): React.JSX.Element {
  const { runs, stats, statusFilter, setStatusFilter, autoRefreshEnabled, setAutoRefreshEnabled, isLoading } =
    useImageStudioRuns();

  if (isLoading) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='flex items-center gap-2 border-border/60 bg-card/40 text-sm text-muted-foreground'
      >
        <LoadingState message='Loading Image Studio runs...' />
      </Card>
    );
  }

  if (!runs.length) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='border-border/60 bg-card/40 text-sm text-muted-foreground'
      >
        No Image Studio runs found for the current filter.
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='flex flex-wrap items-center justify-between gap-3 border-border/60 bg-card/40 text-xs text-muted-foreground'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <span className='whitespace-nowrap'>
            Runs: {stats.total} (Queued {stats.queuedCount}, Running {stats.runningCount})
          </span>
          <label className='flex items-center gap-1'>
            <span className='text-[11px]'>Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className='h-7 rounded border border-border/60 bg-background px-1 text-[11px] text-foreground'
            >
              <option value='all'>All</option>
              <option value='queued'>Queued</option>
              <option value='running'>Running</option>
              <option value='completed'>Completed</option>
              <option value='failed'>Failed</option>
            </select>
          </label>
        </div>
        <label className='flex items-center gap-1'>
          <input
            type='checkbox'
            className='h-3.5 w-3.5 rounded border-border/60'
            checked={autoRefreshEnabled}
            onChange={(event) => setAutoRefreshEnabled(event.target.checked)}
          />
          <span className='text-[11px]'>Auto-refresh</span>
        </label>
      </Card>

      <Card variant='subtle' padding='sm' className='border-border/60 bg-card/40'>
        <div className='max-h-[480px] overflow-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='border-b border-border/60 text-[11px] uppercase text-muted-foreground'>
              <tr>
                <th className='py-1 pr-2'>Status</th>
                <th className='py-1 pr-2'>Run ID</th>
                <th className='py-1 pr-2'>Project</th>
                <th className='py-1 pr-2'>Dispatch</th>
                <th className='py-1 pr-2'>Created</th>
                <th className='py-1 pr-2'>Duration</th>
                <th className='py-1 pr-2'>Outputs</th>
                <th className='py-1 pr-2'>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className='border-b border-border/40 last:border-b-0'>
                  <td className='py-1 pr-2 align-top'>
                    <Badge
                      variant={
                        run.status === 'completed'
                          ? 'success'
                          : run.status === 'failed'
                            ? 'error'
                            : run.status === 'running'
                              ? 'info'
                              : 'warning'
                      }
                      className='text-[10px] uppercase'
                    >
                      {run.status}
                    </Badge>
                  </td>
                  <td className='py-1 pr-2 align-top font-mono text-[11px] text-foreground'>
                    {run.id}
                  </td>
                  <td className='py-1 pr-2 align-top font-mono text-[11px]'>
                    {run.projectId}
                  </td>
                  <td className='py-1 pr-2 align-top text-[11px]'>
                    {run.dispatchMode ?? 'n/a'}
                  </td>
                  <td className='py-1 pr-2 align-top text-[11px]'>
                    {formatDateTime(run.createdAt)}
                  </td>
                  <td className='py-1 pr-2 align-top text-[11px]'>
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </td>
                  <td className='py-1 pr-2 align-top text-[11px]'>
                    {run.outputs.length}/{run.expectedOutputs}
                  </td>
                  <td className='py-1 pr-2 align-top text-[11px] text-red-400 max-w-xs'>
                    {run.errorMessage ? (
                      <span className='line-clamp-2'>{run.errorMessage}</span>
                    ) : (
                      <span className='text-muted-foreground/70'>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default ImageStudioRunsMonitor;

