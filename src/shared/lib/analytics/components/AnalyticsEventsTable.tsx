'use client';

import React from 'react';

import type { AnalyticsEvent } from '@/shared/contracts/analytics';
import {
  AppModal,
  Button,
  CompactEmptyState,
  StandardDataTablePanel,
  UI_GRID_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

type AnalyticsDetailItem = {
  label: string;
  value: string;
  preformatted?: boolean;
};

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const readString = (record: Record<string, unknown> | undefined, key: string): string | null => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

const readNumber = (record: Record<string, unknown> | undefined, key: string): number | null => {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readBoolean = (
  record: Record<string, unknown> | undefined,
  key: string
): boolean | null => {
  const value = record?.[key];
  return typeof value === 'boolean' ? value : null;
};

const formatValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  const trimmed = value.trim();
  return trimmed ? trimmed : '—';
};

function AnalyticsDetailSection({
  title,
  items,
}: {
  title: string;
  items: AnalyticsDetailItem[];
}): React.JSX.Element {
  return (
    <section className='space-y-3'>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{title}</div>
      <div
        className={`${UI_GRID_RELAXED_CLASSNAME} text-xs text-gray-300 md:grid-cols-2 lg:grid-cols-3`}
      >
        {items.map((detail) => (
          <div
            key={`${title}-${detail.label}`}
            className='flex flex-col gap-1 rounded border border-white/5 bg-white/5 p-2'
          >
            <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
              {detail.label}
            </span>
            {detail.preformatted ? (
              <pre className='overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-gray-200'>
                {detail.value}
              </pre>
            ) : (
              <span className='break-all font-mono text-[11px] text-gray-200'>{detail.value}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalyticsEventDetails({ event }: { event: AnalyticsEvent }): React.JSX.Element {
  const meta = toRecord(event.meta);
  const clientMeta = toRecord(meta?.['client']);
  const documentMeta = toRecord(meta?.['document']);
  const windowMeta = toRecord(meta?.['window']);
  const preferencesMeta = toRecord(meta?.['preferences']);
  const performanceMeta = toRecord(meta?.['performance']);
  const requestMeta = toRecord(meta?.['request']);
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
  const rawMeta = event.meta ? JSON.stringify(event.meta, null, 2) : '—';
  const timestampValue = (() => {
    try {
      return new Date(event.ts).toLocaleString();
    } catch (error) {
      logClientCatch(error, {
        source: 'analytics.events-table',
        action: 'formatDetailTimestamp',
        eventTs: event.ts,
        eventType: event.type,
      });
      return event.ts;
    }
  })();
  const sections: Array<{ title: string; items: AnalyticsDetailItem[] }> = [
    {
      title: 'Visit',
      items: [
        { label: 'Timestamp', value: timestampValue },
        { label: 'Client Timestamp', value: event.clientTs ?? '—' },
        { label: 'Type', value: event.type },
        { label: 'Scope', value: event.scope },
        { label: 'Path', value: event.path },
        { label: 'Search', value: event.search ?? '—' },
        { label: 'URL', value: event.url ?? '—' },
        { label: 'Title', value: event.title ?? '—' },
        { label: 'Referrer', value: event.referrer ?? '—' },
        { label: 'Referrer Host', value: event.referrerHost ?? '—' },
      ],
    },
    {
      title: 'Identity',
      items: [
        { label: 'Visitor ID', value: event.visitorId },
        { label: 'Session ID', value: event.sessionId },
        { label: 'User ID', value: event.userId ?? '—' },
        { label: 'IP Address', value: ipDisplay },
        { label: 'Bot Traffic', value: formatValue(event.ua?.isBot ?? null) },
      ],
    },
    {
      title: 'Browser',
      items: [
        { label: 'User Agent', value: event.userAgent ?? '—' },
        { label: 'Browser', value: event.ua?.browser ?? '—' },
        { label: 'OS', value: event.ua?.os ?? '—' },
        { label: 'Device', value: event.ua?.device ?? '—' },
        { label: 'Timezone', value: event.timeZone ?? '—' },
        { label: 'Languages', value: languageValue },
        { label: 'Platform', value: readString(clientMeta, 'platform') ?? '—' },
        { label: 'Vendor', value: readString(clientMeta, 'vendor') ?? '—' },
        { label: 'Do Not Track', value: readString(clientMeta, 'doNotTrack') ?? '—' },
        { label: 'Webdriver', value: formatValue(readBoolean(clientMeta, 'webdriver')) },
      ],
    },
    {
      title: 'Device & Network',
      items: [
        { label: 'Viewport', value: viewportValue },
        { label: 'Screen', value: screenValue },
        { label: 'Connection', value: connectionValue },
        { label: 'Save Data', value: formatValue(event.connection?.saveData ?? null) },
        { label: 'Online', value: formatValue(readBoolean(clientMeta, 'onLine')) },
        { label: 'Cookies Enabled', value: formatValue(readBoolean(clientMeta, 'cookieEnabled')) },
        {
          label: 'Hardware Threads',
          value: formatValue(readNumber(clientMeta, 'hardwareConcurrency')),
        },
        {
          label: 'Device Memory',
          value:
            readNumber(clientMeta, 'deviceMemory') !== null
              ? `${readNumber(clientMeta, 'deviceMemory')} GB`
              : '—',
        },
        { label: 'Touch Points', value: formatValue(readNumber(clientMeta, 'maxTouchPoints')) },
        { label: 'Outer Window', value: `${formatValue(readNumber(windowMeta, 'outerWidth'))} x ${formatValue(readNumber(windowMeta, 'outerHeight'))}` },
        { label: 'Orientation', value: readString(windowMeta, 'screenOrientation') ?? '—' },
      ],
    },
    {
      title: 'Location & Request',
      items: [
        { label: 'Country', value: event.country ?? '—' },
        { label: 'Region', value: event.region ?? '—' },
        { label: 'City', value: event.city ?? '—' },
        { label: 'Request Host', value: readString(requestMeta, 'host') ?? '—' },
        { label: 'Forwarded Host', value: readString(requestMeta, 'forwardedHost') ?? '—' },
        { label: 'Forwarded Proto', value: readString(requestMeta, 'forwardedProto') ?? '—' },
        { label: 'Forwarded Port', value: readString(requestMeta, 'forwardedPort') ?? '—' },
        {
          label: 'History Length',
          value: formatValue(readNumber(clientMeta, 'historyLength')),
        },
      ],
    },
    {
      title: 'Page State & Timing',
      items: [
        {
          label: 'Visibility',
          value: readString(documentMeta, 'visibilityState') ?? '—',
        },
        { label: 'Ready State', value: readString(documentMeta, 'readyState') ?? '—' },
        { label: 'Hidden', value: formatValue(readBoolean(documentMeta, 'hidden')) },
        {
          label: 'Color Scheme',
          value: readString(preferencesMeta, 'colorScheme') ?? '—',
        },
        {
          label: 'Reduced Motion',
          value: formatValue(readBoolean(preferencesMeta, 'reducedMotion')),
        },
        { label: 'Contrast', value: readString(preferencesMeta, 'contrast') ?? '—' },
        { label: 'Pointer', value: readString(preferencesMeta, 'pointer') ?? '—' },
        {
          label: 'Navigation Type',
          value: readString(performanceMeta, 'navigationType') ?? '—',
        },
        {
          label: 'Redirect Count',
          value: formatValue(readNumber(performanceMeta, 'redirectCount')),
        },
        {
          label: 'Response End',
          value:
            readNumber(performanceMeta, 'responseEndMs') !== null
              ? `${readNumber(performanceMeta, 'responseEndMs')} ms`
              : '—',
        },
        {
          label: 'DOMContentLoaded',
          value:
            readNumber(performanceMeta, 'domContentLoadedMs') !== null
              ? `${readNumber(performanceMeta, 'domContentLoadedMs')} ms`
              : '—',
        },
        {
          label: 'Load Event',
          value:
            readNumber(performanceMeta, 'loadEventMs') !== null
              ? `${readNumber(performanceMeta, 'loadEventMs')} ms`
              : '—',
        },
        {
          label: 'Duration',
          value:
            readNumber(performanceMeta, 'durationMs') !== null
              ? `${readNumber(performanceMeta, 'durationMs')} ms`
              : '—',
        },
        {
          label: 'Transfer Size',
          value:
            readNumber(performanceMeta, 'transferSize') !== null
              ? `${readNumber(performanceMeta, 'transferSize')} B`
              : '—',
        },
        {
          label: 'Encoded Body',
          value:
            readNumber(performanceMeta, 'encodedBodySize') !== null
              ? `${readNumber(performanceMeta, 'encodedBodySize')} B`
              : '—',
        },
        {
          label: 'Decoded Body',
          value:
            readNumber(performanceMeta, 'decodedBodySize') !== null
              ? `${readNumber(performanceMeta, 'decodedBodySize')} B`
              : '—',
        },
      ],
    },
    {
      title: 'Campaign & Raw Data',
      items: [
        {
          label: 'UTM Parameters',
          value: event.utm ? JSON.stringify(event.utm, null, 2) : '—',
          preformatted: true,
        },
        {
          label: 'Raw Meta',
          value: rawMeta,
          preformatted: true,
        },
      ],
    },
  ];

  return (
    <div className='space-y-5'>
      {sections.map((section) => (
        <AnalyticsDetailSection key={section.title} title={section.title} items={section.items} />
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

const renderAnalyticsEventsTable = ({
  columns,
  emptyDescription,
  emptyTitle,
  events,
  footer,
  isLoading,
  maxHeight,
  selectedEvent,
  setSelectedEvent,
  showTypeColumn,
  title,
}: AnalyticsEventsTableProps & {
  columns: ColumnDef<AnalyticsEvent>[];
  emptyDescription: string;
  emptyTitle: string;
  selectedEvent: AnalyticsEvent | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<AnalyticsEvent | null>>;
  showTypeColumn: boolean;
  title: string;
}): React.JSX.Element => (
  <>
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
    />
    <AppModal
      open={Boolean(selectedEvent)}
      onClose={() => setSelectedEvent(null)}
      title={showTypeColumn ? 'Analytics Event Details' : 'Website Connection Details'}
      subtitle={selectedEvent?.path ?? selectedEvent?.url ?? undefined}
      size='lg'
    >
      {selectedEvent ? <AnalyticsEventDetails event={selectedEvent} /> : null}
    </AppModal>
  </>
);

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
  const [selectedEvent, setSelectedEvent] = React.useState<AnalyticsEvent | null>(null);

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
              logClientCatch(error, {
                source: 'analytics.events-table',
                action: 'formatTableTimestamp',
                eventTs: row.original.ts,
                eventType: row.original.type,
              });
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
              <Button variant='ghost' size='xs' onClick={() => setSelectedEvent(row.original)}>
                View
              </Button>
            </div>
          ),
        }
      );

      return baseColumns;
    },
    [showTypeColumn]
  );

  return renderAnalyticsEventsTable({
    columns,
    emptyDescription,
    emptyTitle,
    events,
    footer,
    isLoading,
    maxHeight,
    selectedEvent,
    setSelectedEvent,
    showTypeColumn,
    title,
  });
}

export default AnalyticsEventsTable;
