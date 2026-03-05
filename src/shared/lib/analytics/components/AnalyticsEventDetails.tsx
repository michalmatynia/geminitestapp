'use client';

import React from 'react';
import type { AnalyticsSummary } from '@/shared/contracts';

type AnalyticsEvent = NonNullable<AnalyticsSummary['recent']>[number];

export type AnalyticsEventDetailsProps = {
  event: AnalyticsEvent;
};

export function AnalyticsEventDetails({ event }: AnalyticsEventDetailsProps): React.JSX.Element {
  const screenValue = event.screen
    ? `${event.screen.width}×${event.screen.height} @ ${event.screen.dpr}x`
    : '—';
  const viewportValue = event.viewport ? `${event.viewport.width}×${event.viewport.height}` : '—';
  const languageValue = event.languages?.length
    ? event.languages.join(', ')
    : (event.language ?? '—');
  const connectionValue = event.connection
    ? `${event.connection.effectiveType ?? 'n/a'} • ${event.connection.downlink ?? '?'} Mbps • ${event.connection.rtt ?? '?'} ms`
    : '—';
  const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? '—';
  const detailItems: Array<{ label: string; value: string }> = [
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
    <div className='grid gap-4 text-xs text-gray-300 md:grid-cols-2 lg:grid-cols-3'>
      {detailItems.map((detail) => (
        <DetailItem key={detail.label} label={detail.label} value={detail.value} />
      ))}
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
