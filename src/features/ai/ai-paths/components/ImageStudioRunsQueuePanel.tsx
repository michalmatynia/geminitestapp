'use client';

import React, { useMemo } from 'react';

import { 
  Button, 
  DataTable, 
  SelectSimple,
  SectionHeader,
  PanelStats,
} from '@/shared/ui';

import { useImageStudioRuns, type ImageStudioRunRecord, type ImageStudioRunStatus } from '../hooks/useImageStudioRuns';

import type { ColumnDef } from '@tanstack/react-table';

const STATUS_OPTIONS: Array<{ value: 'all' | ImageStudioRunStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const toDateLabel = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getStatusClassName = (status: ImageStudioRunStatus): string => {
  if (status === 'running') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  if (status === 'queued') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
};

export function ImageStudioRunsQueuePanel(): React.JSX.Element {
  const {
    runs,
    stats,
    statusFilter,
    setStatusFilter,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    isLoading,
    isFetching,
    refetch,
  } = useImageStudioRuns();

  const columns = useMemo<ColumnDef<ImageStudioRunRecord>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Run',
      cell: ({ row }) => <span className='font-mono text-[11px]'>{row.original.id.slice(0, 12)}...</span>,
    },
    {
      accessorKey: 'projectId',
      header: 'Project',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full border px-2 py-[1px] text-[10px] ${getStatusClassName(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'outputs',
      header: 'Outputs',
      cell: ({ row }) => `${row.original.outputs.length}/${row.original.expectedOutputs}`,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => toDateLabel(row.original.createdAt),
    },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ row }) => toDateLabel(row.original.startedAt),
    },
    {
      accessorKey: 'finishedAt',
      header: 'Finished',
      cell: ({ row }) => toDateLabel(row.original.finishedAt),
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error',
      cell: ({ row }) => <span className='text-rose-200'>{row.original.errorMessage ?? '—'}</span>,
    },
  ], []);

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Image Studio Runs'
        description='Queue-backed generation runs persisted from Image Studio.'
        size='xs'
        actions={(
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() => setAutoRefreshEnabled((prev) => !prev)}
            >
              {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={refetch}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        )}
      />

      <PanelStats
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Queued', value: stats.queuedCount, valueClassName: 'text-amber-200' },
          { label: 'Running', value: stats.runningCount, valueClassName: 'text-sky-200' },
          {
            label: 'Filter',
            value: (
              <SelectSimple
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as 'all' | ImageStudioRunStatus)}
                options={STATUS_OPTIONS}
                size='xs'
                className='w-28'
              />
            ),
          },
        ]}
      />

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <DataTable
          columns={columns}
          data={runs}
          isLoading={isLoading}
          initialSorting={[{ id: 'createdAt', desc: true }]}
        />
      </div>
    </div>
  );
}
