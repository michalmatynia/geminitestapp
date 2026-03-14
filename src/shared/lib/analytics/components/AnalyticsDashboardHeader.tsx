'use client';

import type { AnalyticsScope } from '@/shared/contracts';
import { Button, SectionHeader, SelectSimple } from '@/shared/ui';

import { type AnalyticsRange } from '../api';
import { useAnalyticsFilters, useAnalyticsSummaryData } from '../context/AnalyticsContext';

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const scopes: Array<{ value: AnalyticsScope | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'public', label: 'Public' },
  { value: 'admin', label: 'Admin' },
];

export function AnalyticsDashboardHeader(): React.JSX.Element {
  const { range, setRange, scope, setScope } = useAnalyticsFilters();
  const { summaryQuery, fromToLabel } = useAnalyticsSummaryData();

  return (
    <>
      <SectionHeader
        title='Page Analytics'
        description='Traffic, referrers, languages, and recent activity.'
        className='mb-6'
        actions={
          <>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-400'>Scope</span>
              <SelectSimple
                size='sm'
                value={scope}
                onValueChange={(val: string): void => setScope(val as AnalyticsScope | 'all')}
                options={scopes}
                triggerClassName='h-9 w-25 border-border bg-gray-900/40 text-sm text-white'
               ariaLabel="Select option" title="Select option"/>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-400'>Range</span>
              <SelectSimple
                size='sm'
                value={range}
                onValueChange={(val: string): void => setRange(val as AnalyticsRange)}
                options={ranges}
                triggerClassName='h-9 w-32.5 border-border bg-gray-900/40 text-sm text-white'
               ariaLabel="Select option" title="Select option"/>
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                void summaryQuery.refetch();
              }}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        }
      />

      <div className='mb-6'>
        {summaryQuery.isLoading ? (
          <p className='text-sm text-gray-500'>Loading analytics…</p>
        ) : summaryQuery.error ? (
          <p className='text-sm text-red-400'>{summaryQuery.error.message}</p>
        ) : fromToLabel ? (
          <p className='text-xs text-gray-500'>Window: {fromToLabel}</p>
        ) : null}
      </div>
    </>
  );
}
