'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button, StandardDataTablePanel, MetadataItem } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

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

const getPanelLabel = (
  sourceFilter?: string | null | undefined,
  sourceMode?: 'include' | 'exclude' | undefined
): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Local Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Local Runs';
  return 'Local Runs';
};

export function LocalRunsPanel({
  sourceFilter,
  sourceMode,
}: LocalRunsPanelProps): React.JSX.Element {
  const { runs, metrics, isLoading, isFetching, isUpdating, refetch, clearRuns } = useLocalRuns({
    sourceFilter,
    sourceMode,
  });

  const tableProps = useLocalRunsTableProps(runs, isLoading);
  const [clearScope, setClearScope] = React.useState<LocalRunsScope | null>(null);

  const panelLabel = getPanelLabel(sourceFilter, sourceMode);

  return (
    <div className='space-y-4'>
      <StandardDataTablePanel
        title={panelLabel}
        description='Recent local execution history and performance metrics.'
        variant='flat'
        refresh={{
          onRefresh: refetch,
          isRefreshing: isFetching,
        }}
        headerActions={
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='destructive'
              size='xs'
              onClick={() => setClearScope('terminal')}
              disabled={isLoading || isUpdating}
            >
              <Trash2 className='mr-1 size-3' />
              Clear Finished
            </Button>
            <Button
              type='button'
              variant='destructive'
              size='xs'
              onClick={() => setClearScope('all')}
              disabled={isLoading || isUpdating}
            >
              <Trash2 className='mr-1 size-3' />
              Clear All
            </Button>
          </div>
        }
        alerts={
          <div className='grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4'>
            <MetadataItem
              label='Runs'
              value={metrics.total}
              variant='minimal'
              hint='Visible in this tab'
            />
            <MetadataItem
              label='Success'
              value={metrics.success}
              variant='minimal'
              valueClassName='text-emerald-200'
              hint={`${metrics.successRate}% success rate`}
            />
            <MetadataItem
              label='Errors'
              value={metrics.error}
              variant='minimal'
              valueClassName='text-rose-200'
              hint='Failures in this list'
            />
            <MetadataItem
              label='Avg Duration'
              value={formatDuration(metrics.avgDuration)}
              variant='minimal'
              hint={`p95 ${formatDuration(metrics.p95Duration)}`}
            />
            <MetadataItem
              label='Last Run'
              value={formatDate(metrics.lastRunAt)}
              variant='minimal'
              hint='Newest execution'
            />
          </div>
        }
        {...tableProps}
      />

      <ConfirmModal
        isOpen={clearScope === 'terminal'}
        onClose={() => setClearScope(null)}
        onConfirm={() => clearRuns('terminal')}
        title='Clear finished local runs'
        message='Delete completed local run history for this tab.'
        confirmText='Clear Finished'
        isDangerous={true}
        loading={isUpdating}
      />

      <ConfirmModal
        isOpen={clearScope === 'all'}
        onClose={() => setClearScope(null)}
        onConfirm={() => clearRuns('all')}
        title='Clear all local runs'
        message='Delete all local run records for this tab.'
        confirmText='Clear All'
        isDangerous={true}
        loading={isUpdating}
      />
    </div>
  );
}
