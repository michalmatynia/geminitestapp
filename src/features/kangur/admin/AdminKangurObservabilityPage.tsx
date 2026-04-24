'use client';

import { GaugeIcon } from 'lucide-react';
import Link from 'next/link';
import { AdminKangurContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
import { Alert, Button, LoadingState, SegmentedControl, CompactEmptyState } from '@/features/kangur/shared/ui';
import { Breadcrumbs } from '@/features/kangur/shared/ui';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import { useObservabilityController } from './observability/useObservabilityController';
import { SummarySection } from './observability/SummarySection';

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
