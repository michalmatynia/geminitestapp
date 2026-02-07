'use client';

import { Fragment, useState } from 'react';

import type { AnalyticsSummaryDto } from '@/shared/types';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAnalytics } from '../context/AnalyticsContext';

export function RecentEventsTable(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const events = summary?.recent ?? [];
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No events yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-2">Time</TableHead>
          <TableHead className="px-2">Type</TableHead>
          <TableHead className="px-2">Scope</TableHead>
          <TableHead className="px-2">Path</TableHead>
          <TableHead className="px-2">Referrer</TableHead>
          <TableHead className="px-2">Country</TableHead>
          <TableHead className="px-2">IP</TableHead>
          <TableHead className="px-2 text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const isExpanded = expandedId === event.id;
          const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? '—';
          return (
            <Fragment key={event.id}>
              <TableRow>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {((): string => {
                    try {
                      return new Date(event.ts).toLocaleString();
                    } catch {
                      return event.ts;
                    }
                  })()}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {event.type}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {event.scope}
                </TableCell>
                <TableCell className={cn('px-2 py-2 text-xs text-gray-200')}>
                  {event.path}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {event.referrer ?? '—'}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {event.country ?? '—'}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {ipDisplay}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => {
                      setExpandedId(isExpanded ? null : event.id);
                    }}
                  >
                    {isExpanded ? 'Hide' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded ? (
                <TableRow>
                  <TableCell colSpan={8} className="bg-gray-950/40 px-3 py-4">
                    <EventDetails event={event} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EventDetails(props: { event: NonNullable<AnalyticsSummaryDto['recent']>[number] }): React.JSX.Element {
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
    <div className="grid gap-3 text-xs text-gray-300 md:grid-cols-2">
      <DetailItem label="IP" value={ipDisplay} />
      <DetailItem label="User Agent" value={event.userAgent ?? '—'} />
      <DetailItem label="Visitor ID" value={event.visitorId} />
      <DetailItem label="Session ID" value={event.sessionId} />
      <DetailItem label="Client Time" value={event.clientTs ?? '—'} />
      <DetailItem label="Timezone" value={event.timeZone ?? '—'} />
      <DetailItem label="Languages" value={languageValue} />
      <DetailItem label="Viewport" value={viewportValue} />
      <DetailItem label="Screen" value={screenValue} />
      <DetailItem label="Connection" value={connectionValue} />
      <DetailItem label="Region" value={event.region ?? '—'} />
      <DetailItem label="City" value={event.city ?? '—'} />
      <DetailItem label="UTM" value={event.utm ? JSON.stringify(event.utm) : '—'} />
      <DetailItem label="Meta" value={event.meta ? JSON.stringify(event.meta) : '—'} />
    </div>
  );
}

function DetailItem(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      <span className="break-all text-gray-200">{props.value}</span>
    </div>
  );
}
