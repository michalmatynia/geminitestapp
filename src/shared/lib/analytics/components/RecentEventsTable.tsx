'use client';

import { useMemo, useState } from 'react';

import type { AnalyticsSummaryDto } from '@/shared/contracts';
import { Button, StandardDataTablePanel, EmptyState } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAnalytics } from '../context/AnalyticsContext';
import { AnalyticsEventDetails } from './AnalyticsEventDetails';

import type { ColumnDef } from '@tanstack/react-table';

type AnalyticsEvent = NonNullable<AnalyticsSummaryDto['recent']>[number];

export function RecentEventsTable(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const events = useMemo(() => summary?.recent ?? [], [summary]);

  const columns = useMemo<ColumnDef<AnalyticsEvent>[]>(
    () => [
      {
        accessorKey: 'ts',
        header: 'Time',
        cell: ({ row }) => {
          try {
            return (
              <span className='text-xs text-gray-300'>
                {new Date(row.original.ts).toLocaleString()}
              </span>
            );
          } catch {
            return <span className='text-xs text-gray-300'>{row.original.ts}</span>;
          }
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.type}</span>,
      },
      {
        accessorKey: 'scope',
        header: 'Scope',
        cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.scope}</span>,
      },
      {
        accessorKey: 'path',
        header: 'Path',
        cell: ({ row }) => <span className={cn('text-xs text-gray-200')}>{row.original.path}</span>,
      },
      {
        accessorKey: 'referrer',
        header: 'Referrer',
        cell: ({ row }) => (
          <span
            className='text-xs text-gray-400 max-w-[150px] truncate block'
            title={row.original.referrer || ''}
          >
            {row.original.referrer ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'country',
        header: 'Country',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{row.original.country ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'ip',
        header: 'IP',
        cell: ({ row }) => {
          const ipDisplay = row.original.ip ?? row.original.ipMasked ?? row.original.ipHash ?? '—';
          return <span className='text-xs text-gray-400 font-mono'>{ipDisplay}</span>;
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Details</div>,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button
              variant='ghost'
              size='xs'
              onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}
            >
              {expandedId === row.original.id ? 'Hide' : 'View'}
            </Button>
          </div>
        ),
      },
    ],
    [expandedId]
  );

  return (
    <StandardDataTablePanel
      title='Recent Events'
      columns={columns}
      data={events}
      isLoading={summaryQuery.isLoading}
      variant='flat'
      maxHeight='60vh'
      enableVirtualization={true}
      emptyState={
        <EmptyState
          title='No events yet'
          description='Visitor activity will appear here once tracked.'
          variant='compact'
        />
      }
      renderRowDetails={({ row }) => {
        if (expandedId !== row.original.id) return null;
        return (
          <div className='bg-black/40 px-4 py-4 border-t border-white/5'>
            <AnalyticsEventDetails event={row.original} />
          </div>
        );
      }}
    />
  );
}
