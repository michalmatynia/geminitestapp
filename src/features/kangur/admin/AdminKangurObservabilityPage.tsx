'use client';

import { GaugeIcon } from 'lucide-react';
import Link from 'next/link';
import { createContext, useContext } from 'react';
import { AdminKangurContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
import { Alert, Button, LoadingState, SegmentedControl, CompactEmptyState } from '@/features/kangur/shared/ui';
import { Breadcrumbs } from '@/features/kangur/shared/ui';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import type {
  KangurObservabilityRange,
  KangurObservabilitySummary,
} from '@/shared/contracts/kangur-observability';
import { useObservabilityController } from './observability/useObservabilityController';
import { SummarySection } from './observability/SummarySection';

type ObservabilitySummaryContextValue = {
  range: KangurObservabilityRange;
  summary: KangurObservabilitySummary;
};

export const ObservabilitySummaryContext =
  createContext<ObservabilitySummaryContextValue | null>(null);

export function useObservabilitySummaryContext(): ObservabilitySummaryContextValue {
  const context = useContext(ObservabilitySummaryContext);
  if (!context) {
    throw new Error('useObservabilitySummaryContext must be used within SummarySection');
  }
  return context;
}

export const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  level?: 'info' | 'warn' | 'error';
  minDurationMs?: number;
  from: Date | string;
  to: Date | string;
}): string => {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.level) params.set('level', input.level);
  if (typeof input.minDurationMs === 'number' && Number.isFinite(input.minDurationMs)) {
    params.set('minDurationMs', String(Math.max(0, Math.round(input.minDurationMs))));
  }
  params.set('from', input.from instanceof Date ? input.from.toISOString() : input.from);
  params.set('to', input.to instanceof Date ? input.to.toISOString() : input.to);
  return `/admin/system/logs?${params.toString()}`;
};

const RANGE_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export function AdminKangurObservabilityPage(): React.JSX.Element {
  const ctrl = useObservabilityController();
  const breadcrumbs = [{ label: 'Admin', href: '/admin' }, { label: 'Kangur', href: '/admin/kangur' }, { label: 'Observability' }];

  return (
    <KangurAdminContentShell
      title='Kangur Observability'
      headerLayout='stacked'
      refresh={{ onRefresh: () => {}, isRefreshing: ctrl.summaryQuery.isFetching }}
      headerActions={
        <>
          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <GaugeIcon className='size-3.5' />
            <span>Range</span>
          </div>
          <SegmentedControl options={RANGE_OPTIONS} value={ctrl.range} onChange={ctrl.handleRangeChange} size='sm' />
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/system/logs'>Logs</Link>
          </Button>
        </>
      }
    >
      <div className='space-y-8'>
        {ctrl.summaryQuery.error ? <Alert variant='error'>{ctrl.summaryQuery.error.message}</Alert> : null}

        {ctrl.summaryQuery.isLoading ? (
          <LoadingState message='Loading observability...' className='min-h-[320px]' />
        ) : !ctrl.summaryQuery.data ? (
          <CompactEmptyState title='No summary' description='No data available.' />
        ) : (
          <SummarySection range={ctrl.range} summary={ctrl.summaryQuery.data} />
        )}
      </div>
    </KangurAdminContentShell>
  );
}
