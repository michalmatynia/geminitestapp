'use client';

import { Badge } from '@/shared/ui/primitives.public';
import { formatTimestamp } from '../filemaker-page-utils';
import type { FilemakerEmailCampaignSegmentAnalytics } from '../../types/campaigns';
import type { ReactElement } from 'react';

type CampaignAnalyticsSegmentSummaryProps = {
  title: string;
  segments: FilemakerEmailCampaignSegmentAnalytics[];
  emptyMessage: string;
};

const formatPercent = (value: number): string => `${value}%`;

const formatLatestActivity = (value: string | null): string =>
  value !== null && value.length > 0 ? formatTimestamp(value) : 'No activity';

const CampaignAnalyticsSegmentCard = ({
  segment,
}: {
  segment: FilemakerEmailCampaignSegmentAnalytics;
}): ReactElement => (
  <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='min-w-0 font-medium text-white'>
        <span className='break-words'>{segment.label}</span>
      </div>
      <Badge variant='outline' className='text-[10px]'>
        {segment.totalRecipients} recipients
      </Badge>
    </div>
    <div className='mt-2 grid gap-2 text-[11px] text-gray-500 md:grid-cols-4'>
      <div>Sent: {segment.sentCount}</div>
      <div>Delivery: {formatPercent(segment.deliveryRatePercent)}</div>
      <div>Failure: {formatPercent(segment.failureRatePercent)}</div>
      <div>Fallback: {segment.fallbackContentCount}</div>
      <div>Unique opens: {segment.uniqueOpenCount}</div>
      <div>Unique clicks: {segment.uniqueClickCount}</div>
      <div>Replies: {segment.replyCount}</div>
      <div>Opt-outs: {segment.unsubscribeCount}</div>
    </div>
    <div className='mt-2 text-[11px] text-gray-500'>
      Latest activity: {formatLatestActivity(segment.latestActivityAt)}
    </div>
  </div>
);

export const CampaignAnalyticsSegmentSummary = ({
  title,
  segments,
  emptyMessage,
}: CampaignAnalyticsSegmentSummaryProps): ReactElement => (
  <div className='space-y-3'>
    <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>{title}</div>
    {segments.length === 0 ? (
      <div className='rounded-md border border-border/60 bg-card/20 p-3 text-sm text-gray-500'>
        {emptyMessage}
      </div>
    ) : (
      <div className='space-y-2'>
        {segments.slice(0, 6).map((segment: FilemakerEmailCampaignSegmentAnalytics) => (
          <CampaignAnalyticsSegmentCard key={segment.key} segment={segment} />
        ))}
      </div>
    )}
  </div>
);
