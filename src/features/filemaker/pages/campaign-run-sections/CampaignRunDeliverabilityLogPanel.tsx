'use client';

import { ShieldAlert } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/shared/ui/primitives.public';

import type { FilemakerEmailCampaignEvent, FilemakerEmailCampaignEventType } from '../../types';
import { formatTimestamp } from '../filemaker-page-utils';

interface CampaignRunDeliverabilityLogPanelProps {
  events: FilemakerEmailCampaignEvent[];
}

const DELIVERABILITY_EVENT_TYPES: ReadonlySet<FilemakerEmailCampaignEventType> = new Set([
  'delivery_deferred_domain',
  'delivery_deferred_warmup',
  'run_paused_circuit_breaker',
  'paused',
]);

const EVENT_LABEL: Partial<Record<FilemakerEmailCampaignEventType, string>> = {
  delivery_deferred_domain: 'Domain throttle',
  delivery_deferred_warmup: 'Warm-up cap',
  run_paused_circuit_breaker: 'Circuit breaker',
  paused: 'Campaign paused',
};

const EVENT_BADGE_VARIANT: Partial<
  Record<FilemakerEmailCampaignEventType, 'destructive' | 'outline' | 'default'>
> = {
  delivery_deferred_domain: 'outline',
  delivery_deferred_warmup: 'outline',
  run_paused_circuit_breaker: 'destructive',
  paused: 'destructive',
};

export function CampaignRunDeliverabilityLogPanel({
  events,
}: CampaignRunDeliverabilityLogPanelProps): React.JSX.Element {
  const deliverabilityEvents = useMemo(
    () =>
      events
        .filter((event) =>
          DELIVERABILITY_EVENT_TYPES.has(event.type as FilemakerEmailCampaignEventType)
        )
        .slice()
        .sort((left, right) => {
          const leftAt = Date.parse(left.createdAt ?? '');
          const rightAt = Date.parse(right.createdAt ?? '');
          const safeLeft = Number.isFinite(leftAt) ? leftAt : 0;
          const safeRight = Number.isFinite(rightAt) ? rightAt : 0;
          return safeRight - safeLeft;
        }),
    [events]
  );

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
      <h2 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
        <ShieldAlert className='h-4 w-4 text-amber-500' aria-hidden='true' />
        Deliverability decisions
      </h2>
      <p className='mt-1 text-xs text-gray-500'>
        When the runtime defers, throttles, or pauses delivery to protect sender reputation, the
        decision lands here.
      </p>
      <div className='mt-4 space-y-2'>
        {deliverabilityEvents.length === 0 ? (
          <p className='text-sm text-gray-500'>
            No deliverability decisions logged for this run.
          </p>
        ) : (
          deliverabilityEvents.map((event) => (
            <div
              key={event.id}
              className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant={EVENT_BADGE_VARIANT[event.type] ?? 'outline'}
                  className='text-[10px]'
                >
                  {EVENT_LABEL[event.type] ?? event.type}
                </Badge>
                <span className='text-xs text-gray-500'>
                  {formatTimestamp(event.createdAt)}
                </span>
              </div>
              <p className='mt-2 text-sm text-gray-700'>{event.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
