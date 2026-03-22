'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button, StandardDataTablePanel, SelectSimple, PanelStats, StatusBadge } from '@/shared/ui';

import {
  useImageStudioRuns,
  type ImageStudioRunRecord,
  type ImageStudioRunStatus,
} from '../hooks/useImageStudioRuns';

import type { ColumnDef } from '@tanstack/react-table';

const STATUS_OPTIONS: Array<LabeledOptionDto<'all' | ImageStudioRunStatus>> = [
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

const getRunStatusVariant = (
  status: ImageStudioRunStatus
): 'processing' | 'warning' | 'success' | 'error' => {
  if (status === 'running') return 'processing';
  if (status === 'queued') return 'warning';
  if (status === 'completed') return 'success';
  return 'error';
};

const getDispatchModeBadge = (
  dispatchMode: ImageStudioRunRecord['dispatchMode']
): {
  status: 'Inline' | 'Redis';
  variant: 'error' | 'success';
} =>
  dispatchMode === 'inline'
    ? { status: 'Inline', variant: 'error' }
    : { status: 'Redis', variant: 'success' };

type ImageStudioRunsHeaderActionButtonProps = Pick<
  React.ComponentProps<typeof Button>,
  'children' | 'disabled' | 'onClick'
>;

function ImageStudioRunsStatusCell({
  run,
}: {
  run: ImageStudioRunRecord;
}): React.JSX.Element {
  return (
    <StatusBadge
      status={run.status}
      variant={getRunStatusVariant(run.status)}
      size='sm'
      className='font-bold'
    />
  );
}

function ImageStudioRunsRuntimeCell({
  run,
}: {
  run: ImageStudioRunRecord;
}): React.JSX.Element {
  const badge = getDispatchModeBadge(run.dispatchMode);
  return (
    <StatusBadge
      status={badge.status}
      variant={badge.variant}
      size='sm'
      className='font-medium'
    />
  );
}

function ImageStudioRunsHeaderActionButton({
  children,
  disabled,
  onClick,
}: ImageStudioRunsHeaderActionButtonProps): React.JSX.Element {
  return (
    <Button type='button' variant='outline' size='xs' disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

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

  const columns = useMemo<ColumnDef<ImageStudioRunRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Run',
        cell: ({ row }) => (
          <span className='font-mono text-[11px]'>{row.original.id.slice(0, 12)}...</span>
        ),
      },
      {
        accessorKey: 'projectId',
        header: 'Project',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <ImageStudioRunsStatusCell run={row.original} />,
      },
      {
        accessorKey: 'dispatchMode',
        header: 'Runtime',
        cell: ({ row }) => <ImageStudioRunsRuntimeCell run={row.original} />,
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
        cell: ({ row }) => (
          <span className='text-rose-200'>{row.original.errorMessage ?? '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className='space-y-4'>
      <StandardDataTablePanel
        title='Image Studio Runs'
        description='Queue-backed generation runs persisted from Image Studio.'
        headerActions={
          <div className='flex items-center gap-2'>
            <ImageStudioRunsHeaderActionButton
              onClick={() => setAutoRefreshEnabled((prev) => !prev)}
            >
              {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
            </ImageStudioRunsHeaderActionButton>
            <ImageStudioRunsHeaderActionButton onClick={refetch} disabled={isFetching}>
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </ImageStudioRunsHeaderActionButton>
          </div>
        }
        columns={columns}
        data={runs}
        isLoading={isLoading}
        initialSorting={[{ id: 'createdAt', desc: true }]}
        variant='flat'
        alerts={
          <PanelStats
            className='mb-0 border-none bg-transparent p-0'
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
                    ariaLabel='Filter by status'
                    size='xs'
                    className='w-44 mt-[-2px]'
                   title='Select option'/>
                ),
              },
            ]}
          />
        }
      />
    </div>
  );
}
