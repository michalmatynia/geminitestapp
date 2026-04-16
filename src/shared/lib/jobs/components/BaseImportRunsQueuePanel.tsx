'use client';

import React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import type { BaseImportRunRecord, BaseImportRunStatus } from '@/shared/contracts/integrations/base-com';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { useBaseImportQueueHealth, useBaseImportRuns } from '@/shared/lib/jobs/hooks/useJobQueries';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Input } from '@/shared/ui/primitives.public';
import { PanelStats, StandardDataTablePanel } from '@/shared/ui/templates.public';

const STATUS_OPTIONS: Array<LabeledOptionDto<'all' | BaseImportRunStatus>> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial_success', label: 'Partial Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
];

const toDateLabel = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const getRunStatusVariant = (
  status: BaseImportRunStatus
): 'processing' | 'warning' | 'success' | 'error' => {
  if (status === 'running') return 'processing';
  if (status === 'queued') return 'warning';
  if (status === 'completed' || status === 'partial_success') return 'success';
  return 'error';
};

const getRuntimeBadge = (
  dispatchMode: BaseImportRunRecord['dispatchMode']
): { status: string; variant: 'warning' | 'success' | 'error' } => {
  if (dispatchMode === 'queued') return { status: 'BullMQ', variant: 'success' };
  if (dispatchMode === 'inline') return { status: 'Inline', variant: 'warning' };
  return { status: 'Not Dispatched', variant: 'error' };
};

export type BaseImportRunsQueuePanelProps = {
  initialSearchQuery?: string;
  limit?: number;
};

export function BaseImportRunsQueuePanel({
  initialSearchQuery = '',
  limit = 100,
}: BaseImportRunsQueuePanelProps): React.JSX.Element {
  const [query, setQuery] = React.useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = React.useState<'all' | BaseImportRunStatus>('all');
  const baseImportRunsQuery = useBaseImportRuns(limit);
  const baseImportQueueHealthQuery = useBaseImportQueueHealth();
  const runs = baseImportRunsQuery.data ?? [];
  const queueHealth = baseImportQueueHealthQuery.data ?? null;
  const baseImportQueue = queueHealth?.queues.baseImport ?? null;

  const filteredRuns = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return runs.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = [
        run.id,
        run.queueJobId ?? '',
        run.summaryMessage ?? '',
        run.error ?? '',
        run.params.connectionId,
        run.params.inventoryId,
        run.params.catalogId,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [query, runs, statusFilter]);

  const stats = React.useMemo(() => {
    const queuedCount = filteredRuns.filter((run) => run.status === 'queued').length;
    const runningCount = filteredRuns.filter((run) => run.status === 'running').length;
    const failedCount = filteredRuns.filter((run) => run.status === 'failed').length;
    return [
      { key: 'total', label: 'Visible Runs', value: filteredRuns.length },
      { key: 'queued', label: 'Queued', value: queuedCount, color: 'warning' as const },
      { key: 'running', label: 'Running', value: runningCount, color: 'info' as const },
      { key: 'failed', label: 'Failed', value: failedCount, color: 'error' as const },
      {
        key: 'runtime',
        label: 'Runtime',
        value: queueHealth?.mode ?? 'Unknown',
        color: queueHealth?.mode === 'inline' ? ('warning' as const) : ('success' as const),
      },
      {
        key: 'worker',
        label: 'Worker',
        value: baseImportQueue?.running ? 'Running' : queueHealth?.mode === 'inline' ? 'Inline' : 'Offline',
        color: baseImportQueue?.running
          ? ('success' as const)
          : queueHealth?.mode === 'inline'
            ? ('warning' as const)
            : ('error' as const),
      },
    ];
  }, [baseImportQueue?.running, filteredRuns, queueHealth?.mode]);

  const columns = React.useMemo<ColumnDef<BaseImportRunRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Run',
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='font-mono text-[11px] text-white' title={row.original.id}>
              {row.original.id}
            </div>
            <div className='text-[10px] text-gray-500' title={row.original.queueJobId ?? 'No queue job id'}>
              Queue {row.original.queueJobId ?? '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            variant={getRunStatusVariant(row.original.status)}
            size='sm'
            className='font-bold'
          />
        ),
      },
      {
        id: 'runtime',
        header: 'Runtime',
        cell: ({ row }) => {
          const badge = getRuntimeBadge(row.original.dispatchMode);
          return <StatusBadge status={badge.status} variant={badge.variant} size='sm' />;
        },
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row }) => {
          const run = row.original;
          const summary = run.stats;
          if (!summary) return <span className='text-gray-500'>—</span>;
          return (
            <div className='text-[11px] text-gray-300'>
              <div>Total {summary.total}</div>
              <div>
                Imported {summary.imported} | Updated {summary.updated}
              </div>
              <div>
                Skipped {summary.skipped} | Failed {summary.failed}
              </div>
            </div>
          );
        },
      },
      {
        id: 'summary',
        header: 'Summary',
        cell: ({ row }) => {
          const run = row.original;
          const preflightIssues = run.preflight?.issues ?? [];
          return (
            <div className='min-w-0 text-[11px]'>
              <div className='truncate text-gray-200' title={run.summaryMessage ?? run.error ?? '—'}>
                {run.summaryMessage ?? run.error ?? '—'}
              </div>
              {run.errorCode || run.error ? (
                <div
                  className='truncate text-rose-200'
                  title={
                    run.errorCode && run.error
                      ? `${run.errorCode}: ${run.error}`
                      : run.errorCode ?? run.error ?? ''
                  }
                >
                  {run.errorCode ? `${run.errorCode}` : 'ERROR'}
                  {run.error ? ` · ${run.error}` : ''}
                </div>
              ) : null}
              {preflightIssues.length > 0 ? (
                <div className='text-amber-300'>
                  Preflight: {preflightIssues.map((issue) => issue.code).join(', ')}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => toDateLabel(row.original.createdAt),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => toDateLabel(row.original.finishedAt ?? row.original.updatedAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex flex-col items-start gap-1 text-[11px]'>
            <Link
              href={`/admin/products/import?runId=${encodeURIComponent(row.original.id)}`}
              className='text-cyan-300 hover:text-cyan-200'
            >
              Open import page
            </Link>
            <Link
              href={`/api/v2/integrations/imports/base/runs/${encodeURIComponent(row.original.id)}/report?format=csv`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-300 hover:text-white'
            >
              Download CSV report
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className='space-y-4'>
      <StandardDataTablePanel
        title='Product Import Runs'
        description='Base import runtime runs and dispatch state.'
        columns={columns}
        data={filteredRuns}
        isLoading={baseImportRunsQuery.isLoading}
        initialSorting={[{ id: 'createdAt', desc: true }]}
        variant='flat'
        headerActions={
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search run id, queue job, summary...'
              className='h-8 w-72'
              aria-label='Search import runs'
            />
            <SelectSimple
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | BaseImportRunStatus)}
              options={STATUS_OPTIONS}
              ariaLabel='Filter import runs by status'
              size='xs'
              className='w-40'
            />
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() => {
                void baseImportRunsQuery.refetch();
                void baseImportQueueHealthQuery.refetch();
              }}
              disabled={baseImportRunsQuery.isFetching || baseImportQueueHealthQuery.isFetching}
            >
              {baseImportRunsQuery.isFetching || baseImportQueueHealthQuery.isFetching
                ? 'Refreshing...'
                : 'Refresh'}
            </Button>
            <Link href='/admin/products/import'>
              <Button type='button' variant='outline' size='xs'>
                Open Product Import
              </Button>
            </Link>
          </div>
        }
        alerts={
          <div className='space-y-3'>
            <PanelStats
              className='mb-0 border-none bg-transparent p-0'
              stats={stats}
              isLoading={baseImportRunsQuery.isLoading || baseImportQueueHealthQuery.isLoading}
            />
            <div className='text-xs text-gray-400'>
              Queue health: waiting {baseImportQueue?.waitingCount ?? 0}, active {baseImportQueue?.activeCount ?? 0}, completed {baseImportQueue?.completedCount ?? 0}, failed {baseImportQueue?.failedCount ?? 0}.
            </div>
          </div>
        }
      />
    </div>
  );
}
