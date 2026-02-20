'use client';

import { useMemo, useState } from 'react';

import type { AnalyticsSummaryDto } from '@/shared/types';
import { Button, StandardDataTablePanel, EmptyState } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAnalytics } from '../context/AnalyticsContext';

import type { ColumnDef } from '@tanstack/react-table';

type AnalyticsEvent = NonNullable<AnalyticsSummaryDto['recent']>[number];

export function RecentEventsTable(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const events = useMemo(() => summary?.recent ?? [], [summary]);

  const columns = useMemo<ColumnDef<AnalyticsEvent>[]>(() => [
    {
      accessorKey: 'ts',
      header: 'Time',
      cell: ({ row }) => {
        try {
          return <span className='text-xs text-gray-300'>{new Date(row.original.ts).toLocaleString()}</span>;
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
      cell: ({ row }) => <span className='text-xs text-gray-400 max-w-[150px] truncate block' title={row.original.referrer || ''}>{row.original.referrer ?? '—'}</span>,
    },
    {
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }) => <span className='text-xs text-gray-400'>{row.original.country ?? '—'}</span>,
    },
    {
      accessorKey: 'ip',
      header: 'IP',
      cell: ({ row }) => {
        const ipDisplay = row.original.ip ?? row.original.ipMasked ?? row.original.ipHash ?? '—';
        return <span className='text-xs text-gray-400 font-mono'>{ipDisplay}</span>;
      }
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
  ], [expandedId]);

  return (
    <StandardDataTablePanel
      title='Recent Events'
      columns={columns}
      data={events}
      isLoading={summaryQuery.isLoading}
      variant='flat'
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
            <EventDetails event={row.original} />
          </div>
        );
      }}
    />
  );
}

function EventDetails(props: { event: AnalyticsEvent }): React.JSX.Element {
  const { event } = props;
  const screenValue = event.screen
    ? `${event.screen.width}×${event.screen.height} @ ${event.screen.dpr}x`
    : '—';
  const viewportValue = event.viewport
    ? `${event.viewport.width}×${event.viewport.height}`
    : '—';
  const languageValue = event.languages?.length
    ? event.languages.join(', ')
    : event.language ?? '—';
  const connectionValue = event.connection
    ? `${event.connection.effectiveType ?? 'n/a'} • ${event.connection.downlink ?? '?'} Mbps • ${event.connection.rtt ?? '?'} ms`
    : '—';
  const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? '—';

  return (
    <div className='grid gap-4 text-xs text-gray-300 md:grid-cols-2 lg:grid-cols-3'>
      <DetailItem label='IP Address' value={ipDisplay} />
      <DetailItem label='User Agent' value={event.userAgent ?? '—'} />
      <DetailItem label='Visitor ID' value={event.visitorId} />
      <DetailItem label='Session ID' value={event.sessionId} />
      <DetailItem label='Client Timestamp' value={event.clientTs ?? '—'} />
      <DetailItem label='Timezone' value={event.timeZone ?? '—'} />
      <DetailItem label='Languages' value={languageValue} />
      <DetailItem label='Viewport' value={viewportValue} />
      <DetailItem label='Screen' value={screenValue} />
      <DetailItem label='Connection' value={connectionValue} />
      <DetailItem label='Region' value={event.region ?? '—'} />
      <DetailItem label='City' value={event.city ?? '—'} />
      <DetailItem label='UTM Parameters' value={event.utm ? JSON.stringify(event.utm, null, 2) : '—'} />
      <DetailItem label='Metadata' value={event.meta ? JSON.stringify(event.meta, null, 2) : '—'} />
    </div>
  );
}

function DetailItem(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1 p-2 rounded bg-white/5 border border-white/5'>
      <span className='text-[10px] uppercase tracking-wide text-gray-500 font-semibold'>
        {props.label}
      </span>
      <span className='break-all text-gray-200 font-mono text-[11px]'>{props.value}</span>
    </div>
  );
}
