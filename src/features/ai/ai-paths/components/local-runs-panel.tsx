'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
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

type LocalRunsClearActionConfig = {
  key: LocalRunsScope;
  label: string;
};

type LocalRunsMetricConfig = {
  key: string;
  label: string;
  value: React.ReactNode;
  hint: string;
  valueClassName?: string;
};

type LocalRunsConfirmModalConfig = {
  key: LocalRunsScope;
  title: string;
  message: string;
  confirmText: string;
};

const getPanelLabel = (
  sourceFilter?: string | null | undefined,
  sourceMode?: 'include' | 'exclude' | undefined
): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Local Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Local Runs';
  return 'Local Runs';
};

const localRunsClearActionConfigs: LocalRunsClearActionConfig[] = [
  { key: 'terminal', label: 'Clear Finished' },
  { key: 'all', label: 'Clear All' },
];

const localRunsConfirmModalConfigs: LocalRunsConfirmModalConfig[] = [
  {
    key: 'terminal',
    title: 'Clear finished local runs',
    message: 'Delete completed local run history for this tab.',
    confirmText: 'Clear Finished',
  },
  {
    key: 'all',
    title: 'Clear all local runs',
    message: 'Delete all local run records for this tab.',
    confirmText: 'Clear All',
  },
];

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
  const metricConfigs: LocalRunsMetricConfig[] = [
    {
      key: 'runs',
      label: 'Runs',
      value: metrics.total,
      hint: 'Visible in this tab',
    },
    {
      key: 'success',
      label: 'Success',
      value: metrics.success,
      hint: `${metrics.successRate}% success rate`,
      valueClassName: 'text-emerald-200',
    },
    {
      key: 'errors',
      label: 'Errors',
      value: metrics.error,
      hint: 'Failures in this list',
      valueClassName: 'text-rose-200',
    },
    {
      key: 'avg-duration',
      label: 'Avg Duration',
      value: formatDuration(metrics.avgDuration),
      hint: `p95 ${formatDuration(metrics.p95Duration)}`,
    },
    {
      key: 'last-run',
      label: 'Last Run',
      value: formatDate(metrics.lastRunAt),
      hint: 'Newest execution',
    },
  ];

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
            {localRunsClearActionConfigs.map((action) => (
              <Button
                key={action.key}
                type='button'
                variant='destructive'
                size='xs'
                onClick={() => setClearScope(action.key)}
                disabled={isLoading || isUpdating}
              >
                <Trash2 className='mr-1 size-3' />
                {action.label}
              </Button>
            ))}
          </div>
        }
        alerts={
          <div className='grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4'>
            {metricConfigs.map((item) => (
              <MetadataItem
                key={item.key}
                label={item.label}
                value={item.value}
                variant='minimal'
                hint={item.hint}
                valueClassName={item.valueClassName}
              />
            ))}
          </div>
        }
        {...tableProps}
      />

      {localRunsConfirmModalConfigs.map((modalConfig) => (
        <ConfirmModal
          key={modalConfig.key}
          isOpen={clearScope === modalConfig.key}
          onClose={() => setClearScope(null)}
          onConfirm={() => clearRuns(modalConfig.key)}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          isDangerous={true}
          loading={isUpdating}
        />
      ))}
    </div>
  );
}
