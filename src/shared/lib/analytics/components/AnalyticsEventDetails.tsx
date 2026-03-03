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
      <DetailItem
        label='UTM Parameters'
        value={event.utm ? JSON.stringify(event.utm, null, 2) : '—'}
      />
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
