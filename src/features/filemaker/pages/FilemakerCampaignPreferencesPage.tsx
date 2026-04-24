'use client';

import React, { useMemo, useState } from 'react';

import {
  filemakerEmailCampaignPreferencesResponseSchema,
  type FilemakerEmailCampaignPreferenceStatus,
} from '@/shared/contracts/filemaker';
import { api, ApiError } from '@/shared/lib/api-client';
import { Badge, Button, useToast } from '@/shared/ui/primitives.public';

import type {
  FilemakerEmailCampaignPreferencesAction,
  FilemakerEmailCampaignPreferencesResponse,
  FilemakerEmailCampaignSuppressionReason,
} from '../types';
import type {
  FilemakerEmailCampaignRecipientActivityItem,
  FilemakerEmailCampaignRecipientActivitySummary,
} from '../settings';

type FilemakerCampaignPreferencesPageProps = {
  initialEmailAddress?: string | null;
  initialCampaignId?: string | null;
  initialScope?: 'campaign' | 'all_campaigns';
  initialToken?: string | null;
  hasValidSignedToken?: boolean;
  initialStatus?: FilemakerEmailCampaignPreferenceStatus;
  initialReason?: FilemakerEmailCampaignSuppressionReason | null;
  canResubscribe?: boolean;
  initialRecipientSummary?: FilemakerEmailCampaignRecipientActivitySummary | null;
};

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

const prependRecipientActivity = (
  summary: FilemakerEmailCampaignRecipientActivitySummary | null,
  item: FilemakerEmailCampaignRecipientActivityItem
): FilemakerEmailCampaignRecipientActivitySummary | null => {
  if (!summary) return summary;
  return {
    ...summary,
    recentActivity: [item].concat(summary.recentActivity).slice(0, 8),
  };
};

const buildStatusCopy = (
  scope: 'campaign' | 'all_campaigns',
  status: FilemakerEmailCampaignPreferenceStatus,
  reason: FilemakerEmailCampaignSuppressionReason | null | undefined
): { title: string; body: string } => {
  const isGlobalScope = scope === 'all_campaigns';
  if (status === 'subscribed') {
    return {
      title: isGlobalScope
        ? 'This address is currently subscribed across all campaigns'
        : 'This address is currently subscribed',
      body: isGlobalScope
        ? 'Campaign emails are currently allowed for this address across all Filemaker campaigns. You can unsubscribe below if you no longer want Filemaker campaign updates.'
        : 'Campaign emails are currently allowed for this address. You can unsubscribe below if you no longer want Filemaker campaign updates.',
    };
  }
  if (status === 'unsubscribed') {
    return {
      title: isGlobalScope
        ? 'This address is currently unsubscribed across all campaigns'
        : 'This address is currently unsubscribed',
      body: isGlobalScope
        ? 'This address is on the campaign suppression list because the recipient opted out of Filemaker campaign delivery. You can restore delivery below if you want to receive future campaigns again.'
        : 'This address is on the campaign suppression list because the recipient opted out. You can restore delivery below if you want to receive future campaigns again.',
    };
  }
  return {
    title: isGlobalScope
      ? 'This address is currently blocked across all campaigns'
      : 'This address is currently blocked',
    body:
      reason === 'bounced'
        ? 'This address is blocked because recent campaign delivery bounced. It cannot be restored from the self-service preferences page.'
        : 'This address is blocked by an administrator and cannot be restored from the self-service preferences page.',
  };
};

export function FilemakerCampaignPreferencesPage({
  initialEmailAddress,
  initialCampaignId,
  initialScope = 'campaign',
  initialToken,
  hasValidSignedToken = false,
  initialStatus = 'subscribed',
  initialReason = null,
  canResubscribe = false,
  initialRecipientSummary = null,
}: FilemakerCampaignPreferencesPageProps): React.JSX.Element {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FilemakerEmailCampaignPreferenceStatus>(initialStatus);
  const [reason, setReason] = useState<FilemakerEmailCampaignSuppressionReason | null>(
    initialReason
  );
  const [canRestore, setCanRestore] = useState<boolean>(canResubscribe);
  const [lastResult, setLastResult] = useState<FilemakerEmailCampaignPreferencesResponse | null>(
    null
  );
  const [recipientSummary, setRecipientSummary] =
    useState<FilemakerEmailCampaignRecipientActivitySummary | null>(initialRecipientSummary);

  const normalizedCampaignId = useMemo(
    () => initialCampaignId?.trim() || null,
    [initialCampaignId]
  );
  const isGlobalScope = initialScope === 'all_campaigns';
  const normalizedToken = useMemo(() => initialToken?.trim() || null, [initialToken]);
  const statusCopy = useMemo(
    () => buildStatusCopy(initialScope, status, reason),
    [initialScope, reason, status]
  );

  const handleAction = async (
    action: FilemakerEmailCampaignPreferencesAction
  ): Promise<void> => {
    if (!normalizedToken) {
      toast('This preferences link is no longer valid.', { variant: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post<FilemakerEmailCampaignPreferencesResponse>(
        '/api/filemaker/campaigns/preferences',
        {
          token: normalizedToken,
          action,
          source: 'public-preferences-page',
        },
        { logError: false }
      );
      const parsed = filemakerEmailCampaignPreferencesResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new Error('Invalid preferences response.');
      }
      setLastResult(parsed.data);
      setStatus(parsed.data.status);
      setReason(parsed.data.reason ?? null);
      setCanRestore(parsed.data.canResubscribe);
      const eventAt = new Date().toISOString();
      setRecipientSummary((current: FilemakerEmailCampaignRecipientActivitySummary | null) => {
        if (!current) return current;
        if (action === 'unsubscribe' && parsed.data.status === 'unsubscribed') {
          return {
            ...prependRecipientActivity(current, {
              id: `recipient-activity-local-unsubscribe-${eventAt}`,
              type: 'unsubscribed',
              campaignId: current.campaignId,
              campaignName: current.campaignName,
              runId: null,
              deliveryId: null,
              timestamp: eventAt,
              details: isGlobalScope
                ? `${parsed.data.emailAddress} unsubscribed across all Filemaker campaigns from the preferences center.`
                : `${parsed.data.emailAddress} unsubscribed from the preferences center.`,
            })!,
            unsubscribeCount: current.unsubscribeCount + 1,
            latestUnsubscribeAt: eventAt,
          };
        }
        if (action === 'resubscribe' && parsed.data.status === 'subscribed') {
          return {
            ...prependRecipientActivity(current, {
              id: `recipient-activity-local-resubscribe-${eventAt}`,
              type: 'resubscribed',
              campaignId: current.campaignId,
              campaignName: current.campaignName,
              runId: null,
              deliveryId: null,
              timestamp: eventAt,
              details: isGlobalScope
                ? `${parsed.data.emailAddress} restored delivery across all Filemaker campaigns from the preferences center.`
                : `${parsed.data.emailAddress} restored campaign delivery from the preferences center.`,
            })!,
            resubscribeCount: current.resubscribeCount + 1,
            latestResubscribeAt: eventAt,
          };
        }
        return current;
      });
      toast(
        action === 'unsubscribe'
          ? parsed.data.status === 'unsubscribed'
            ? isGlobalScope
              ? 'This address has been unsubscribed across all Filemaker campaigns.'
              : 'This address has been unsubscribed.'
            : 'This address remains blocked.'
          : parsed.data.status === 'subscribed'
            ? isGlobalScope
              ? 'Campaign delivery has been restored across all Filemaker campaigns for this address.'
              : 'Campaign delivery has been restored for this address.'
            : 'This address cannot be restored from this page.',
        { variant: 'success' }
      );
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Failed to update campaign preferences.';
      toast(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center px-4 py-10 sm:px-6'>
      <div className='w-full rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8'>
        <div className='space-y-4'>
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

          <div className='flex flex-wrap gap-2'>
            <Badge variant='outline' className='text-[10px]'>
              Scope: {isGlobalScope ? 'All campaigns' : 'This campaign'}
            </Badge>
            {normalizedCampaignId ? (
              <Badge variant='outline' className='text-[10px]'>
                Campaign: {normalizedCampaignId}
              </Badge>
            ) : null}
            {initialEmailAddress ? (
              <Badge variant='outline' className='text-[10px]'>
                Address: {initialEmailAddress}
              </Badge>
            ) : null}
            <Badge variant='outline' className='text-[10px] capitalize'>
              Status: {status}
            </Badge>
            {reason ? (
              <Badge variant='outline' className='text-[10px] capitalize'>
                Reason: {reason}
              </Badge>
            ) : null}
            {hasValidSignedToken ? (
              <Badge variant='outline' className='text-[10px]'>
                Signed link verified
              </Badge>
            ) : (
              <Badge variant='outline' className='text-[10px]'>
                Signed link invalid
              </Badge>
            )}
          </div>

          <div className='rounded-2xl border border-border/50 bg-background/40 p-4 text-sm leading-6 text-gray-300'>
            <div className='font-medium text-white'>{statusCopy.title}</div>
            <div className='mt-1'>{statusCopy.body}</div>
            {lastResult ? (
              <div className='mt-3 text-[12px] text-gray-400'>
                Latest update applied to <span className='break-all'>{lastResult.emailAddress}</span>.
              </div>
            ) : null}
          </div>

          {recipientSummary ? (
            <div className='space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4 text-sm text-gray-300'>
              <div className='space-y-1'>
                <div className='font-medium text-white'>Recipient activity</div>
                <div className='text-xs leading-5 text-gray-400'>
                  {isGlobalScope
                    ? 'All Filemaker campaigns'
                    : recipientSummary.campaignName ?? normalizedCampaignId ?? 'This campaign'} history for{' '}
                  <span className='break-all'>{recipientSummary.emailAddress}</span>.
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
                  <div className='text-[11px] text-gray-500'>Deliveries</div>
                  <div className='mt-1 text-lg font-semibold text-white'>
                    {recipientSummary.deliveryCount}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {recipientSummary.sentCount} sent • {recipientSummary.skippedCount} skipped
                  </div>
                </div>
                <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
                  <div className='text-[11px] text-gray-500'>Engagement</div>
                  <div className='mt-1 text-lg font-semibold text-white'>
                    {recipientSummary.openCount} opens
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {recipientSummary.clickCount} clicks • {recipientSummary.replyCount} replies
                  </div>
                </div>
                <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
                  <div className='text-[11px] text-gray-500'>Opt-outs</div>
                  <div className='mt-1 text-lg font-semibold text-white'>
                    {recipientSummary.unsubscribeCount}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {recipientSummary.resubscribeCount} restored later
                  </div>
                </div>
                <div className='rounded-xl border border-border/40 bg-background/40 p-3'>
                  <div className='text-[11px] text-gray-500'>Delivery health</div>
                  <div className='mt-1 text-lg font-semibold text-white'>
                    {recipientSummary.failedCount + recipientSummary.bouncedCount}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {recipientSummary.bouncedCount} bounced
                  </div>
                </div>
              </div>

              <div className='grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2'>
                <div>
                  Latest sent:{' '}
                  {recipientSummary.latestSentAt ? recipientSummary.latestSentAt : 'No sent delivery yet'}
                </div>
                <div>
                  Latest open:{' '}
                  {recipientSummary.latestOpenAt ? recipientSummary.latestOpenAt : 'No opens yet'}
                </div>
                <div>
                  Latest click:{' '}
                  {recipientSummary.latestClickAt ? recipientSummary.latestClickAt : 'No clicks yet'}
                </div>
                <div>
                  Latest reply:{' '}
                  {recipientSummary.latestReplyAt !== null
                    ? recipientSummary.latestReplyAt
                    : 'No replies yet'}
                </div>
                <div>
                  Latest opt-out:{' '}
                  {recipientSummary.latestUnsubscribeAt
                    ? recipientSummary.latestUnsubscribeAt
                    : 'No opt-out activity yet'}
                </div>
                <div>
                  Latest restore:{' '}
                  {recipientSummary.latestResubscribeAt
                    ? recipientSummary.latestResubscribeAt
                    : 'No restore activity yet'}
                </div>
              </div>

              <div className='space-y-2'>
                <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>
                  Recent activity
                </div>
                {recipientSummary.recentActivity.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-border/40 p-3 text-xs text-gray-500'>
                    No delivery or engagement history has been recorded for this recipient yet.
                  </div>
                ) : (
                  recipientSummary.recentActivity.map(
                    (activity: FilemakerEmailCampaignRecipientActivityItem) => (
                    <div
                      key={activity.id}
                      className='rounded-xl border border-border/40 bg-background/40 p-3'
                    >
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='outline' className='text-[10px]'>
                          {RECIPIENT_ACTIVITY_LABELS[activity.type]}
                        </Badge>
                        {activity.timestamp ? (
                          <span className='text-[11px] text-gray-500'>{activity.timestamp}</span>
                        ) : null}
                      </div>
                      {activity.details ? (
                        <div className='mt-2 text-sm leading-6 text-gray-200'>
                          {activity.details}
                        </div>
                      ) : null}
                    </div>
                    )
                  )
                )}
              </div>
            </div>
          ) : null}

          <div className='flex flex-wrap gap-3'>
            {hasValidSignedToken && status === 'subscribed' ? (
              <Button
                type='button'
                disabled={isSubmitting}
                onClick={(): void => {
                  void handleAction('unsubscribe');
                }}
              >
                {isSubmitting
                  ? 'Updating...'
                  : isGlobalScope
                    ? 'Unsubscribe this address from all campaigns'
                    : 'Unsubscribe this address'}
              </Button>
            ) : null}
            {hasValidSignedToken && status === 'unsubscribed' && canRestore ? (
              <Button
                type='button'
                disabled={isSubmitting}
                onClick={(): void => {
                  void handleAction('resubscribe');
                }}
              >
                {isSubmitting
                  ? 'Updating...'
                  : isGlobalScope
                    ? 'Restore delivery across all campaigns'
                    : 'Restore campaign delivery'}
              </Button>
            ) : null}
            {hasValidSignedToken && status === 'blocked' ? (
              <Button type='button' variant='outline' disabled>
                Blocked from self-service restore
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
