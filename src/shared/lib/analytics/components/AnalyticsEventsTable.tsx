'use client';

import React from 'react';

import type { AnalyticsEvent } from '@/shared/contracts/analytics';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  Button,
  CompactEmptyState,
  StandardDataTablePanel,
  UI_GRID_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

function AnalyticsEventDetails({ event }: { event: AnalyticsEvent }): React.JSX.Element {
  const screenValue = event.screen
    ? `${event.screen.width}x${event.screen.height} @ ${event.screen.dpr}x`
    : '—';
  const viewportValue = event.viewport ? `${event.viewport.width}x${event.viewport.height}` : '—';
  const languageValue = event.languages?.length
    ? event.languages.join(', ')
    : (event.language ?? '—');
  const connectionValue = event.connection
    ? `${event.connection.effectiveType ?? 'n/a'} • ${event.connection.downlink ?? '?'} Mbps • ${event.connection.rtt ?? '?'} ms`
    : '—';
  const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? '—';
  const detailItems: Array<LabeledOptionDto<string>> = [
    { label: 'IP Address', value: ipDisplay },
    { label: 'User Agent', value: event.userAgent ?? '—' },
    { label: 'Visitor ID', value: event.visitorId },
    { label: 'Session ID', value: event.sessionId },
    { label: 'Client Timestamp', value: event.clientTs ?? '—' },
    { label: 'Timezone', value: event.timeZone ?? '—' },
    { label: 'Languages', value: languageValue },
    { label: 'Viewport', value: viewportValue },
    { label: 'Screen', value: screenValue },
    { label: 'Connection', value: connectionValue },
    { label: 'Region', value: event.region ?? '—' },
    { label: 'City', value: event.city ?? '—' },
    { label: 'UTM Parameters', value: event.utm ? JSON.stringify(event.utm, null, 2) : '—' },
    { label: 'Metadata', value: event.meta ? JSON.stringify(event.meta, null, 2) : '—' },
  ];

  return (
    <div
      className={`${UI_GRID_RELAXED_CLASSNAME} text-xs text-gray-300 md:grid-cols-2 lg:grid-cols-3`}
    >
      {detailItems.map((detail) => (
        <div
          key={detail.label}
          className='flex flex-col gap-1 rounded border border-white/5 bg-white/5 p-2'
        >
          <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
            {detail.label}
          </span>
          <span className='break-all font-mono text-[11px] text-gray-200'>{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

export type AnalyticsEventsTableProps = {
  events: AnalyticsEvent[];
  isLoading?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: React.ReactNode;
  maxHeight?: string | number;
  showTypeColumn?: boolean;
};

export function AnalyticsEventsTable({
  events,
  isLoading = false,
  title = 'Recent Events',
  emptyTitle = 'No events yet',
  emptyDescription = 'Visitor activity will appear here once tracked.',
  footer,
  maxHeight = '60vh',
  showTypeColumn = true,
}: AnalyticsEventsTableProps): React.JSX.Element {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const columns = React.useMemo<ColumnDef<AnalyticsEvent>[]>(
    () => {
      const baseColumns: ColumnDef<AnalyticsEvent>[] = [
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
            } catch (error) {
              logClientError(error);
              return <span className='text-xs text-gray-300'>{row.original.ts}</span>;
            }
          },
        },
      ];

      if (showTypeColumn) {
        baseColumns.push({
          accessorKey: 'type',
          header: 'Type',
          cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.type}</span>,
        });
      }

      baseColumns.push(
        {
          accessorKey: 'scope',
          header: 'Scope',
          cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.scope}</span>,
        },
        {
          accessorKey: 'path',
          header: 'Path',
          cell: ({ row }) => (
            <span className={cn('text-xs text-gray-200')}>{row.original.path}</span>
          ),
        },
        {
          accessorKey: 'referrer',
          header: 'Referrer',
          cell: ({ row }) => (
            <span
              className='block max-w-[150px] truncate text-xs text-gray-400'
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
            return <span className='font-mono text-xs text-gray-400'>{ipDisplay}</span>;
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
        }
      );

      return baseColumns;
    },
    [expandedId, showTypeColumn]
  );

  return (
    <StandardDataTablePanel
      title={title}
      columns={columns}
      data={events}
      isLoading={isLoading}
      variant='flat'
      maxHeight={maxHeight}
      enableVirtualization={true}
      footer={footer}
      emptyState={
        <CompactEmptyState title={emptyTitle} description={emptyDescription} />
      }
      renderRowDetails={({ row }) => {
        if (expandedId !== row.original.id) return null;
        return (
          <div className='border-t border-white/5 bg-black/40 px-4 py-4'>
            <AnalyticsEventDetails event={row.original} />
          </div>
        );
      }}
    />
  );
}

export default AnalyticsEventsTable;
