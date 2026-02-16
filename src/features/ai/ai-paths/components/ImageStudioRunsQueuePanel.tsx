'use client';

import React, { useMemo } from 'react';

import { 
  Button, 
  DataTable, 
  SelectSimple,
  SectionHeader,
  PanelStats,
  StatusBadge,
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
        <StatusBadge 
          status={row.original.status} 
          variant={
            row.original.status === 'running' ? 'processing' :
            row.original.status === 'queued' ? 'warning' :
            row.original.status === 'completed' ? 'success' : 'error'
          }
          size='sm'
          className='font-bold'
        />
      ),
    },
    {
      accessorKey: 'dispatchMode',
      header: 'Runtime',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.dispatchMode === 'inline' ? 'Inline' : 'Redis'}
          variant={row.original.dispatchMode === 'inline' ? 'error' : 'success'}
          size='sm'
          className='font-medium'
        />
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
          { key: 'total', label: 'Total', value: stats.total },
          { key: 'queued', label: 'Queued', value: stats.queuedCount, color: 'warning' },
          { key: 'running', label: 'Running', value: stats.runningCount, color: 'info' },
          {
            key: 'filter',
            label: 'Filter',
            value: (
              <SelectSimple
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as 'all' | ImageStudioRunStatus)}
                options={STATUS_OPTIONS}
                size='xs'
                className='w-28 mt-[-2px]'
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
