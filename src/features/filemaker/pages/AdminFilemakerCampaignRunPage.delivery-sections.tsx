'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback } from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import { buildFilemakerMailThreadHref } from '../components/FilemakerMailSidebar.helpers';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
  FilemakerMailThread,
} from '../types';
import { formatTimestamp } from './filemaker-page-utils';

const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const DELIVERY_CSV_HEADERS = ['emailAddress', 'status', 'failureCategory', 'provider', 'sentAt', 'nextRetryAt', 'updatedAt', 'lastError'];

const buildDeliveriesCsv = (deliveries: FilemakerEmailCampaignDelivery[]): string => {
  const rows = deliveries.map((d) =>
    [d.emailAddress, d.status, d.failureCategory, d.provider, d.sentAt, d.nextRetryAt, d.updatedAt, d.lastError]
      .map((v) => escapeCsvCell(String(v ?? '')))
      .join(',')
  );
  return [DELIVERY_CSV_HEADERS.join(','), ...rows].join('\n');
};

const downloadDeliveriesCsv = (deliveries: FilemakerEmailCampaignDelivery[], filename: string): void => {
  const csv = buildDeliveriesCsv(deliveries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const campaignHasAssignedMailAccount = (campaign: FilemakerEmailCampaign): boolean =>
  typeof campaign.mailAccountId === 'string' && campaign.mailAccountId.length > 0;

const hasNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const getMailFilingBadge = ({
  expectsMailThread,
  linkedThread,
}: {
  expectsMailThread: boolean;
  linkedThread: FilemakerMailThread | null;
}): React.ReactNode => {
  if (linkedThread !== null) {
    return (
      <Badge variant='success' className='text-[10px]'>
        Mail filed
      </Badge>
    );
  }
  if (expectsMailThread) {
    return (
      <Badge variant='warning' className='text-[10px]'>
        Mail filing pending
      </Badge>
    );
  }
  return null;
};

function DeliveryHeader({
  delivery,
  mailFilingBadge,
}: {
  delivery: FilemakerEmailCampaignDelivery;
  mailFilingBadge: React.ReactNode;
}): React.JSX.Element {
  const hasFailureCategory = hasNonEmptyString(delivery.failureCategory);
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='font-medium text-gray-900'>{delivery.emailAddress}</span>
      <Badge variant='outline' className='text-[10px] capitalize'>
        {delivery.status}
      </Badge>
      {hasFailureCategory ? (
        <Badge variant='outline' className='text-[10px] capitalize'>
          {delivery.failureCategory}
        </Badge>
      ) : null}
      {mailFilingBadge}
    </div>
  );
}

function DeliveryMeta({
  delivery,
}: {
  delivery: FilemakerEmailCampaignDelivery;
}): React.JSX.Element {
  return (
    <div className='mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2'>
      <span>Provider: {delivery.provider ?? 'n/a'}</span>
      <span>Sent: {formatTimestamp(delivery.sentAt)}</span>
      <span>Next retry: {formatTimestamp(delivery.nextRetryAt)}</span>
      <span>Updated: {formatTimestamp(delivery.updatedAt)}</span>
    </div>
  );
}

function DeliveryMailThreadAction({
  linkedThread,
}: {
  linkedThread: FilemakerMailThread | null;
}): React.JSX.Element | null {
  if (linkedThread === null) return null;
  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      <Button asChild variant='outline' size='sm'>
        <Link
          href={buildFilemakerMailThreadHref({
            threadId: linkedThread.id,
            accountId: linkedThread.accountId,
            mailboxPath: linkedThread.mailboxPath,
          })}
        >
          Open Mail Thread
        </Link>
      </Button>
    </div>
  );
}

function DeliveryError({
  lastError,
}: {
  lastError: string | null | undefined;
}): React.JSX.Element | null {
  if (!hasNonEmptyString(lastError)) return null;
  return <p className='mt-2 text-xs text-rose-600'>{lastError}</p>;
}

function DeliveryCard({
  campaign,
  delivery,
  linkedThread,
}: {
  campaign: FilemakerEmailCampaign;
  delivery: FilemakerEmailCampaignDelivery;
  linkedThread: FilemakerMailThread | null;
}): React.JSX.Element {
  const expectsMailThread = campaignHasAssignedMailAccount(campaign) && delivery.status === 'sent';
  const mailFilingBadge = getMailFilingBadge({ expectsMailThread, linkedThread });
  return (
    <div className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'>
      <DeliveryHeader delivery={delivery} mailFilingBadge={mailFilingBadge} />
      <DeliveryMeta delivery={delivery} />
      <DeliveryMailThreadAction linkedThread={linkedThread} />
      <DeliveryError lastError={delivery.lastError} />
    </div>
  );
}

export function DeliveriesSection({
  campaign,
  deliveries,
  linkedMailThreadByDeliveryId,
}: {
  campaign: FilemakerEmailCampaign;
  deliveries: FilemakerEmailCampaignDelivery[];
  linkedMailThreadByDeliveryId: Map<string, FilemakerMailThread>;
}): React.JSX.Element {
  const handleExport = useCallback((): void => {
    const filename = `deliveries-${campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'campaign'}.csv`;
    downloadDeliveriesCsv(deliveries, filename);
  }, [campaign.name, deliveries]);

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h2 className='text-sm font-semibold text-gray-900'>Deliveries</h2>
        {deliveries.length > 0 ? (
          <Button type='button' size='sm' variant='outline' onClick={handleExport}>
            <Download className='mr-2 size-3.5' />
            Export CSV ({deliveries.length})
          </Button>
        ) : null}
      </div>
      <div className='mt-4 space-y-3'>
        {deliveries.length === 0 ? (
          <p className='text-sm text-gray-500'>No deliveries were created for this run.</p>
        ) : (
          deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              campaign={campaign}
              delivery={delivery}
              linkedThread={linkedMailThreadByDeliveryId.get(delivery.id) ?? null}
            />
          ))
        )}
      </div>
    </section>
  );
}

const resolveMailThreadId = (event: FilemakerEmailCampaignEvent): string | null =>
  hasNonEmptyString(event.mailThreadId) ? event.mailThreadId : null;

function EventTimelineItem({
  event,
}: {
  event: FilemakerEmailCampaignEvent;
}): React.JSX.Element {
  const mailThreadId = resolveMailThreadId(event);
  const mailThreadLabel = event.type === 'reply_received' ? 'Open Reply Thread' : 'Open Mail Thread';
  return (
    <div className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline' className='text-[10px] capitalize'>
          {event.type}
        </Badge>
        <span className='text-xs text-gray-500'>{formatTimestamp(event.createdAt)}</span>
        {mailThreadId !== null ? (
          <Button asChild variant='outline' size='sm'>
            <Link href={buildFilemakerMailThreadHref({ threadId: mailThreadId })}>
              {mailThreadLabel}
            </Link>
          </Button>
        ) : null}
      </div>
      <p className='mt-2 text-sm text-gray-700'>{event.message}</p>
    </div>
  );
}

export function EventTimelineSection({
  events,
}: {
  events: FilemakerEmailCampaignEvent[];
}): React.JSX.Element {
  return (
    <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
      <h2 className='text-sm font-semibold text-gray-900'>Event Timeline</h2>
      <div className='mt-4 space-y-3'>
        {events.length === 0 ? (
          <p className='text-sm text-gray-500'>No events recorded yet.</p>
        ) : (
          events.slice(0, 24).map((event) => <EventTimelineItem key={event.id} event={event} />)
        )}
      </div>
    </section>
  );
}
