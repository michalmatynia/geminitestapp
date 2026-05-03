import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import type { FilemakerCampaignPreferencesPageModel } from './FilemakerCampaignPreferencesPage.types';
import type { FilemakerEmailCampaignRecipientActivityItem } from '../settings';

const RECIPIENT_ACTIVITY_LABELS: Record<FilemakerEmailCampaignRecipientActivityItem['type'], string> = {
  delivery_sent: 'Delivered',
  delivery_failed: 'Delivery failed',
  delivery_bounced: 'Bounced',
  opened: 'Opened',
  clicked: 'Clicked',
  reply_received: 'Reply',
  unsubscribed: 'Unsubscribed',
  resubscribed: 'Restored',
};

const CampaignPreferencesHeader = ({
  isGlobalScope,
}: {
  isGlobalScope: boolean;
}): React.JSX.Element => (
  <div className='space-y-2'>
    <Badge variant='outline' className='text-[10px] uppercase tracking-[0.24em]'>
      Filemaker Campaigns
    </Badge>
    <h1 className='text-3xl font-semibold tracking-tight text-white'>
      {isGlobalScope
        ? 'Manage delivery across all Filemaker campaigns'
        : 'Manage campaign email preferences'}
    </h1>
    <p className='max-w-xl text-sm leading-6 text-gray-300'>
      {isGlobalScope
        ? 'Use this signed preferences center to manage whether this email address should keep receiving Filemaker campaign messages across all campaigns.'
        : 'Use this signed preferences center to manage whether this email address should keep receiving Filemaker campaign messages.'}
    </p>
  </div>
);

const PreferencesBadges = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Badge variant='outline' className='text-[10px]'>
      Scope: {model.isGlobalScope ? 'All campaigns' : 'This campaign'}
    </Badge>
    {model.normalizedCampaignId !== null ? (
      <Badge variant='outline' className='text-[10px]'>
        Campaign: {model.normalizedCampaignId}
      </Badge>
    ) : null}
    {model.initialEmailAddress !== null ? (
      <Badge variant='outline' className='text-[10px]'>
        Address: {model.initialEmailAddress}
      </Badge>
    ) : null}
    <Badge variant='outline' className='text-[10px] capitalize'>
      Status: {model.status}
    </Badge>
    {model.reason !== null ? (
      <Badge variant='outline' className='text-[10px] capitalize'>
        Reason: {model.reason}
      </Badge>
    ) : null}
    <Badge variant='outline' className='text-[10px]'>
      {model.hasValidSignedToken ? 'Signed link verified' : 'Signed link invalid'}
    </Badge>
  </div>
);

const PreferencesStatusCard = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element => (
  <div className='rounded-2xl border border-border/50 bg-background/40 p-4 text-sm leading-6 text-gray-300'>
    <div className='font-medium text-white'>{model.statusCopy.title}</div>
    <div className='mt-1'>{model.statusCopy.body}</div>
    {model.lastResult !== null ? (
      <div className='mt-3 text-[12px] text-gray-400'>
        Latest update applied to <span className='break-all'>{model.lastResult.emailAddress}</span>.
      </div>
    ) : null}
  </div>
);

const resolveCampaignHistoryLabel = (model: FilemakerCampaignPreferencesPageModel): string => {
  const summary = model.recipientSummary;
  if (model.isGlobalScope) return 'All Filemaker campaigns';
  if (summary?.campaignName !== null && summary?.campaignName !== undefined) {
    return summary.campaignName;
  }
  return model.normalizedCampaignId ?? 'This campaign';
};

const RecipientActivityHeader = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element | null => {
  if (model.recipientSummary === null) return null;
  return (
    <div className='space-y-1'>
      <div className='font-medium text-white'>Recipient activity</div>
      <div className='text-xs leading-5 text-gray-400'>
        {resolveCampaignHistoryLabel(model)} history for{' '}
        <span className='break-all'>{model.recipientSummary.emailAddress}</span>.
      </div>
    </div>
  );
};

const RecipientMetricCard = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}): React.JSX.Element => (
  <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
    <div className='text-[11px] text-gray-500'>{label}</div>
    <div className='mt-1 text-lg font-semibold text-white'>{value}</div>
    <div className='text-[11px] text-gray-400'>{detail}</div>
  </div>
);

const RecipientMetricsGrid = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element | null => {
  const summary = model.recipientSummary;
  if (summary === null) return null;
  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <RecipientMetricCard
        label='Deliveries'
        value={summary.deliveryCount}
        detail={`${summary.sentCount} sent • ${summary.skippedCount} skipped`}
      />
      <RecipientMetricCard
        label='Engagement'
        value={`${summary.openCount} opens`}
        detail={`${summary.clickCount} clicks • ${summary.replyCount} replies`}
      />
      <RecipientMetricCard
        label='Opt-outs'
        value={summary.unsubscribeCount}
        detail={`${summary.resubscribeCount} restored later`}
      />
      <RecipientMetricCard
        label='Delivery health'
        value={summary.failedCount + summary.bouncedCount}
        detail={`${summary.bouncedCount} bounced`}
      />
    </div>
  );
};

const TimestampField = ({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null;
  fallback: string;
}): React.JSX.Element => <div>{label}: {value ?? fallback}</div>;

const RecipientTimestampsGrid = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element | null => {
  const summary = model.recipientSummary;
  if (summary === null) return null;
  return (
    <div className='grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2'>
      <TimestampField label='Latest sent' value={summary.latestSentAt} fallback='No sent delivery yet' />
      <TimestampField label='Latest open' value={summary.latestOpenAt} fallback='No opens yet' />
      <TimestampField label='Latest click' value={summary.latestClickAt} fallback='No clicks yet' />
      <TimestampField label='Latest reply' value={summary.latestReplyAt} fallback='No replies yet' />
      <TimestampField
        label='Latest opt-out'
        value={summary.latestUnsubscribeAt}
        fallback='No opt-out activity yet'
      />
      <TimestampField
        label='Latest restore'
        value={summary.latestResubscribeAt}
        fallback='No restore activity yet'
      />
    </div>
  );
};

const RecentActivityItem = ({
  activity,
}: {
  activity: FilemakerEmailCampaignRecipientActivityItem;
}): React.JSX.Element => (
  <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        {RECIPIENT_ACTIVITY_LABELS[activity.type]}
      </Badge>
      {activity.timestamp.length > 0 ? (
        <span className='text-[11px] text-gray-500'>{activity.timestamp}</span>
      ) : null}
    </div>
    {activity.details !== null && activity.details.length > 0 ? (
      <div className='mt-2 text-sm leading-6 text-gray-200'>{activity.details}</div>
    ) : null}
  </div>
);

const RecentActivityList = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element | null => {
  const summary = model.recipientSummary;
  if (summary === null) return null;
  if (summary.recentActivity.length === 0) return <EmptyActivityList />;
  return (
    <div className='space-y-2'>
      <RecentActivityHeading />
      {summary.recentActivity.map((activity) => (
        <RecentActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
};

const EmptyActivityList = (): React.JSX.Element => (
  <div className='space-y-2'>
    <RecentActivityHeading />
    <div className='rounded-xl border border-dashed border-border/40 p-3 text-xs text-gray-500'>
      No delivery or engagement history has been recorded for this recipient yet.
    </div>
  </div>
);

const RecentActivityHeading = (): React.JSX.Element => (
  <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>Recent activity</div>
);

const RecipientActivityPanel = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element | null => {
  if (model.recipientSummary === null) return null;
  return (
    <div className='space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4 text-sm text-gray-300'>
      <RecipientActivityHeader model={model} />
      <RecipientMetricsGrid model={model} />
      <RecipientTimestampsGrid model={model} />
      <RecentActivityList model={model} />
    </div>
  );
};

const resolveUnsubscribeLabel = (model: FilemakerCampaignPreferencesPageModel): string => {
  if (model.isSubmitting) return 'Updating...';
  if (model.isGlobalScope) return 'Unsubscribe this address from all campaigns';
  return 'Unsubscribe this address';
};

const resolveResubscribeLabel = (model: FilemakerCampaignPreferencesPageModel): string => {
  if (model.isSubmitting) return 'Updating...';
  if (model.isGlobalScope) return 'Restore delivery across all campaigns';
  return 'Restore campaign delivery';
};

const PreferencesActions = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-3'>
    {model.hasValidSignedToken && model.status === 'subscribed' ? (
      <Button type='button' disabled={model.isSubmitting} onClick={model.unsubscribe}>
        {resolveUnsubscribeLabel(model)}
      </Button>
    ) : null}
    {model.hasValidSignedToken && model.status === 'unsubscribed' && model.canRestore ? (
      <Button type='button' disabled={model.isSubmitting} onClick={model.resubscribe}>
        {resolveResubscribeLabel(model)}
      </Button>
    ) : null}
    {model.hasValidSignedToken && model.status === 'blocked' ? (
      <Button type='button' variant='outline' disabled>
        Blocked from self-service restore
      </Button>
    ) : null}
  </div>
);

export const FilemakerCampaignPreferencesPageView = ({
  model,
}: {
  model: FilemakerCampaignPreferencesPageModel;
}): React.JSX.Element => (
  <div className='mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center px-4 py-10 sm:px-6'>
    <div className='w-full rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8'>
      <div className='space-y-4'>
        <CampaignPreferencesHeader isGlobalScope={model.isGlobalScope} />
        <PreferencesBadges model={model} />
        <PreferencesStatusCard model={model} />
        <RecipientActivityPanel model={model} />
        <PreferencesActions model={model} />
      </div>
    </div>
  </div>
);
