'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button, ConfirmDialog, DataTable } from '@/shared/ui';

import { useLocalRuns, type LocalRunsScope } from '../hooks/useLocalRuns';
import { useLocalRunsTableProps } from '../hooks/useLocalRunsTableProps';

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatDuration = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.max(0, Math.round(value))}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

type LocalRunsPanelProps = {
  sourceFilter?: string | null | undefined;
  sourceMode?: 'include' | 'exclude' | undefined;
};

const getPanelLabel = (sourceFilter?: string | null | undefined, sourceMode?: 'include' | 'exclude' | undefined): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Local Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Local Runs';
  return 'Local Runs';
};

export function LocalRunsPanel({
  sourceFilter,
  sourceMode,
}: LocalRunsPanelProps): React.JSX.Element {
  const {
    runs,
    metrics,
    isLoading,
    isFetching,
    isUpdating,
    refetch,
    clearRuns,
  } = useLocalRuns({ sourceFilter, sourceMode });

  const tableProps = useLocalRunsTableProps(runs, isLoading);
  const [clearScope, setClearScope] = React.useState<LocalRunsScope | null>(null);

  const panelLabel = getPanelLabel(sourceFilter, sourceMode);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>{panelLabel}</div>
          <div className='text-xs text-gray-400'>Recent local execution history and performance metrics.</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={refetch}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('terminal')}
            disabled={isLoading || isUpdating}
          >
            <Trash2 className='mr-1 size-3' />
            Clear Finished
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('all')}
            disabled={isLoading || isUpdating}
          >
            <Trash2 className='mr-1 size-3' />
            Clear All
          </Button>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Runs</div>
          <div className='mt-1 text-sm text-white'>{metrics.total}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Visible in this tab</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Success</div>
          <div className='mt-1 text-sm text-emerald-200'>{metrics.success}</div>
          <div className='mt-1 text-[11px] text-gray-400'>{metrics.successRate}% success rate</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Errors</div>
          <div className='mt-1 text-sm text-rose-200'>{metrics.error}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Failures in this list</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Avg Duration</div>
          <div className='mt-1 text-sm text-white'>{formatDuration(metrics.avgDuration)}</div>
          <div className='mt-1 text-[11px] text-gray-400'>p95 {formatDuration(metrics.p95Duration)}</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Last Run</div>
          <div className='mt-1 text-sm text-white'>{formatDate(metrics.lastRunAt)}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Newest execution</div>
        </div>
      </div>

      <div className='overflow-hidden rounded-md border border-border/60 bg-card/40'>
        <DataTable {...tableProps} />
      </div>

      <ConfirmDialog
        open={clearScope === 'terminal'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'terminal' : null)}
        onConfirm={() => { void clearRuns('terminal'); }}
        title='Clear finished local runs'
        description='Delete completed local run history for this tab.'
        confirmText='Clear Finished'
        variant='destructive'
        loading={isUpdating}
      />

      <ConfirmDialog
        open={clearScope === 'all'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'all' : null)}
        onConfirm={() => { void clearRuns('all'); }}
        title='Clear all local runs'
        description='Delete all local run records for this tab.'
        confirmText='Clear All'
        variant='destructive'
        loading={isUpdating}
      />
    </div>
  );
}
