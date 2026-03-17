'use client';

import React, { useMemo } from 'react';

import { useImageStudioRuns } from '@/features/ai/ai-paths/hooks/useImageStudioRuns';
import { IMAGE_STUDIO_RUN_STATUS_OPTIONS } from '@/features/ai/image-studio/utils/run-status-options';
import type { FilterField } from '@/shared/contracts/ui';
import {
  Card,
  Badge,
  LoadingState,
  StandardDataTablePanel,
  Checkbox,
  PanelFilters,
  UI_CENTER_ROW_RELAXED_CLASSNAME,
} from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

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

type ImageStudioRun = ReturnType<typeof useImageStudioRuns>['runs'][0];

export function ImageStudioRunsMonitor(): React.JSX.Element {
  const {
    runs,
    stats,
    statusFilter,
    setStatusFilter,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    isLoading,
  } = useImageStudioRuns();

  const columns = useMemo<ColumnDef<ImageStudioRun>[]>(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === 'completed'
                ? 'success'
                : row.original.status === 'failed'
                  ? 'error'
                  : row.original.status === 'running'
                    ? 'info'
                    : 'warning'
            }
            className='text-[10px] uppercase'
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'id',
        header: 'Run ID',
        cell: ({ row }) => (
          <span className='font-mono text-[11px] text-foreground'>{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'projectId',
        header: 'Project',
        cell: ({ row }) => <span className='font-mono text-[11px]'>{row.original.projectId}</span>,
      },
      {
        accessorKey: 'dispatchMode',
        header: 'Dispatch',
        cell: ({ row }) => <span>{row.original.dispatchMode ?? 'n/a'}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => <span>{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => (
          <span>{formatDuration(row.original.startedAt, row.original.finishedAt)}</span>
        ),
      },
      {
        id: 'outputs',
        header: 'Outputs',
        cell: ({ row }) => (
          <span>
            {row.original.outputs.length}/{row.original.expectedOutputs}
          </span>
        ),
      },
      {
        accessorKey: 'errorMessage',
        header: 'Error',
        cell: ({ row }) =>
          row.original.errorMessage ? (
            <span className='line-clamp-2 text-red-400 max-w-xs' title={row.original.errorMessage}>
              {row.original.errorMessage}
            </span>
          ) : (
            <span className='text-muted-foreground/70'>—</span>
          ),
      },
    ],
    []
  );

  const filters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: IMAGE_STUDIO_RUN_STATUS_OPTIONS,
    },
  ];

  if (isLoading && !runs.length) {
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

  return (
    <div className='space-y-3'>
      <PanelFilters
        filters={filters}
        values={{ status: statusFilter }}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value as typeof statusFilter);
        }}
        actions={
          <div className={`${UI_CENTER_ROW_RELAXED_CLASSNAME} text-xs text-muted-foreground`}>
            <span className='whitespace-nowrap'>
              Runs: {stats.total} (Queued {stats.queuedCount}, Running {stats.runningCount})
            </span>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='auto-refresh'
                checked={autoRefreshEnabled}
                onCheckedChange={(checked) => setAutoRefreshEnabled(Boolean(checked))}
              />
              <label htmlFor='auto-refresh' className='text-[11px] cursor-pointer'>
                Auto-refresh
              </label>
            </div>
          </div>
        }
        compact
        className='rounded-lg border border-border/60 bg-card/40 p-3'
      />

      <StandardDataTablePanel
        columns={columns}
        data={runs}
        variant='flat'
        maxHeight='480px'
        isLoading={isLoading}
        loadingVariant='table'
        emptyState={
          <div className='py-8 text-center text-sm text-muted-foreground'>
            No Image Studio runs found for the current filter.
          </div>
        }
      />
    </div>
  );
}

export default ImageStudioRunsMonitor;
