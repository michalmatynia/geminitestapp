'use client';

import { Badge } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { formatTimestamp } from '../../filemaker-page-utils';
import type {
  FilemakerEmailCampaignAnalytics,
  FilemakerEmailCampaignLinkPerformance,
} from '../../../types/campaigns';
import { useCampaignEditContext } from '../../AdminFilemakerCampaignEditPage.context';
import { CampaignAnalyticsSegmentSummary } from '../../campaign-edit-sections/CampaignAnalyticsSegmentSummary';
import type { ReactElement } from 'react';

type MetricCardDefinition = {
  title: string;
  value: string;
  detail: string;
};

type ActivityItem = {
  label: string;
  value: string;
};

const formatOptionalTimestamp = (value: string | null, fallback: string): string =>
  value !== null && value.length > 0 ? formatTimestamp(value) : fallback;

const buildMetricCards = (
  analytics: FilemakerEmailCampaignAnalytics
): MetricCardDefinition[] => [
  {
    title: 'Recipients Processed',
    value: `${analytics.processedCount}/${analytics.totalRecipients}`,
    detail: `Completion rate: ${analytics.completionRatePercent}%`,
  },
  {
    title: 'Delivery Outcome',
    value: `${analytics.sentCount} sent`,
    detail: `Delivery rate: ${analytics.deliveryRatePercent}%`,
  },
  {
    title: 'Failures',
    value: `${analytics.failedCount + analytics.bouncedCount}`,
    detail: `Bounce rate: ${analytics.bounceRatePercent}% • Failure rate: ${analytics.failureRatePercent}%`,
  },
  {
    title: 'Suppression Impact',
    value: `${analytics.suppressionImpactCount}`,
    detail: 'Addresses currently filtered from preview',
  },
  {
    title: 'Opens',
    value: `${analytics.openCount}`,
    detail: `Open rate: ${analytics.openRatePercent}% • Unique opens: ${analytics.uniqueOpenCount} (${analytics.uniqueOpenRatePercent}%)`,
  },
  {
    title: 'Clicks',
    value: `${analytics.clickCount}`,
    detail: `Click rate: ${analytics.clickRatePercent}% • Unique clicks: ${analytics.uniqueClickCount} (${analytics.uniqueClickRatePercent}%)`,
  },
  {
    title: 'Replies',
    value: `${analytics.replyCount}`,
    detail: `Reply rate: ${analytics.replyRatePercent}%`,
  },
  {
    title: 'Opt-outs',
    value: `${analytics.unsubscribeCount}`,
    detail: `Unsubscribe rate: ${analytics.unsubscribeRatePercent}%`,
  },
  {
    title: 'Restored',
    value: `${analytics.resubscribeCount}`,
    detail: `Restore rate: ${analytics.resubscribeRatePercent}% • Net opt-outs: ${analytics.netUnsubscribeCount} (${analytics.netUnsubscribeRatePercent}%)`,
  },
  {
    title: 'Translated Fallbacks',
    value: `${analytics.fallbackContentCount}`,
    detail: `Fallback content rate: ${analytics.fallbackContentRatePercent}%`,
  },
];

const buildActivityItems = (analytics: FilemakerEmailCampaignAnalytics): ActivityItem[] => [
  {
    label: 'Latest run',
    value: formatOptionalTimestamp(analytics.latestRunAt, 'No runs yet'),
  },
  {
    label: 'Latest run status',
    value: analytics.latestRunStatus ?? 'No runs yet',
  },
  {
    label: 'Latest activity',
    value: formatOptionalTimestamp(analytics.latestActivityAt, 'No campaign activity yet'),
  },
  {
    label: 'Latest open',
    value: formatOptionalTimestamp(analytics.latestOpenAt, 'No open tracking yet'),
  },
  {
    label: 'Latest click',
    value: formatOptionalTimestamp(analytics.latestClickAt, 'No click tracking yet'),
  },
  {
    label: 'Latest reply',
    value: formatOptionalTimestamp(analytics.latestReplyAt, 'No replies yet'),
  },
  {
    label: 'Latest opt-out',
    value: formatOptionalTimestamp(analytics.latestUnsubscribeAt, 'No unsubscribe activity yet'),
  },
  {
    label: 'Latest restore',
    value: formatOptionalTimestamp(analytics.latestResubscribeAt, 'No restore activity yet'),
  },
];

const CampaignMetricCards = ({
  analytics,
}: {
  analytics: FilemakerEmailCampaignAnalytics;
}): ReactElement => (
  <div className='grid gap-3 text-sm text-gray-300 md:grid-cols-2 xl:grid-cols-4'>
    {buildMetricCards(analytics).map((card: MetricCardDefinition) => (
      <div key={card.title} className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>{card.title}</div>
        <div className='mt-1 text-lg font-semibold text-white'>{card.value}</div>
        <div className='text-[11px] text-gray-500'>{card.detail}</div>
      </div>
    ))}
  </div>
);

const CampaignActivityGrid = ({
  analytics,
}: {
  analytics: FilemakerEmailCampaignAnalytics;
}): ReactElement => (
  <div className='grid gap-3 text-[11px] text-gray-500 md:grid-cols-3'>
    {buildActivityItems(analytics).map((item: ActivityItem) => (
      <div key={item.label}>
        {item.label}: {item.value}
      </div>
    ))}
  </div>
);

const CampaignAnalyticsBadges = ({
  analytics,
}: {
  analytics: FilemakerEmailCampaignAnalytics;
}): ReactElement => (
  <div className='flex flex-wrap gap-2'>
    <Badge variant='outline' className='text-[10px]'>
      Total Runs: {analytics.totalRuns}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Live Runs: {analytics.liveRunCount}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Dry Runs: {analytics.dryRunCount}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Event Count: {analytics.eventCount}
    </Badge>
  </div>
);

const CampaignSegmentGrid = ({
  analytics,
}: {
  analytics: FilemakerEmailCampaignAnalytics;
}): ReactElement => (
  <div className='grid gap-4 xl:grid-cols-2'>
    <CampaignAnalyticsSegmentSummary
      title='Language performance'
      segments={analytics.languageSummaries}
      emptyMessage='No language metadata has been recorded for this campaign yet.'
    />
    <CampaignAnalyticsSegmentSummary
      title='Country performance'
      segments={analytics.countrySummaries}
      emptyMessage='No country routing metadata has been recorded for this campaign yet.'
    />
    <CampaignAnalyticsSegmentSummary
      title='Content variant performance'
      segments={analytics.contentVariantSummaries}
      emptyMessage='No content variant metadata has been recorded for this campaign yet.'
    />
    <CampaignAnalyticsSegmentSummary
      title='Domain performance'
      segments={analytics.domainSummaries}
      emptyMessage='No recipient domain delivery data has been recorded for this campaign yet.'
    />
  </div>
);

const CampaignTopClickedLinks = ({
  links,
}: {
  links: FilemakerEmailCampaignLinkPerformance[];
}): ReactElement => (
  <div className='space-y-3'>
    <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>Top clicked links</div>
    {links.length === 0 ? (
      <div className='text-sm text-gray-500'>
        No tracked click activity has been recorded for this campaign yet.
      </div>
    ) : (
      links.map((link: FilemakerEmailCampaignLinkPerformance) => (
        <div
          key={link.targetUrl}
          className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'
        >
          <div className='break-all font-medium text-sky-300'>{link.targetUrl}</div>
          <div className='mt-1 text-[11px] text-gray-500'>
            {link.clickCount} clicks • {link.uniqueDeliveryCount} unique deliveries • rate{' '}
            {link.clickRatePercent}%
          </div>
          <div className='text-[11px] text-gray-500'>
            Latest click: {formatTimestamp(link.latestClickAt)}
          </div>
        </div>
      ))
    )}
  </div>
);

export const CampaignAnalyticsSection = (): ReactElement => {
  const { analytics } = useCampaignEditContext();

  return (
    <FormSection title='Campaign Analytics' className='space-y-4 p-4'>
      <CampaignAnalyticsBadges analytics={analytics} />
      <CampaignMetricCards analytics={analytics} />
      <CampaignActivityGrid analytics={analytics} />
      <CampaignSegmentGrid analytics={analytics} />
      <CampaignTopClickedLinks links={analytics.topClickedLinks} />
    </FormSection>
  );
};
