'use client';

import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { formatTimestamp } from '../filemaker-page-utils';
import {
  getRunActions,
} from '../AdminFilemakerCampaignEditPage.utils';
import type {
  FilemakerEmailCampaignLinkPerformance,
} from '../../types/campaigns';
import type {
  FilemakerEmailCampaignRun,
} from '@/shared/contracts/filemaker';
import {
  getFilemakerEmailCampaignDeliveriesForRun,
  summarizeFilemakerEmailCampaignRunDeliveries,
} from '../../settings';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import { startTransition } from 'react';

export const CampaignAnalyticsSection = () => {
  const { analytics } = useCampaignEditContext();

  return (
    <FormSection title='Campaign Analytics' className='space-y-4 p-4'>
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
      <div className='grid gap-3 text-sm text-gray-300 md:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Recipients Processed</div>
          <div className='mt-1 text-lg font-semibold text-white'>
            {analytics.processedCount}/{analytics.totalRecipients}
          </div>
          <div className='text-[11px] text-gray-500'>
            Completion rate: {analytics.completionRatePercent}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Delivery Outcome</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.sentCount} sent</div>
          <div className='text-[11px] text-gray-500'>
            Delivery rate: {analytics.deliveryRatePercent}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Failures</div>
          <div className='mt-1 text-lg font-semibold text-white'>
            {analytics.failedCount + analytics.bouncedCount}
          </div>
          <div className='text-[11px] text-gray-500'>
            Bounce rate: {analytics.bounceRatePercent}% • Failure rate: {analytics.failureRatePercent}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Suppression Impact</div>
          <div className='mt-1 text-lg font-semibold text-white'>
            {analytics.suppressionImpactCount}
          </div>
          <div className='text-[11px] text-gray-500'>Addresses currently filtered from preview</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Opens</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.openCount}</div>
          <div className='text-[11px] text-gray-500'>
            Open rate: {analytics.openRatePercent}% • Unique opens: {analytics.uniqueOpenCount} ({analytics.uniqueOpenRatePercent}%)
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Clicks</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.clickCount}</div>
          <div className='text-[11px] text-gray-500'>
            Click rate: {analytics.clickRatePercent}% • Unique clicks: {analytics.uniqueClickCount} ({analytics.uniqueClickRatePercent}%)
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Replies</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.replyCount}</div>
          <div className='text-[11px] text-gray-500'>
            Reply rate: {analytics.replyRatePercent}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Opt-outs</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.unsubscribeCount}</div>
          <div className='text-[11px] text-gray-500'>
            Unsubscribe rate: {analytics.unsubscribeRatePercent}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Restored</div>
          <div className='mt-1 text-lg font-semibold text-white'>{analytics.resubscribeCount}</div>
          <div className='text-[11px] text-gray-500'>
            Restore rate: {analytics.resubscribeRatePercent}% • Net opt-outs:{' '}
            {analytics.netUnsubscribeCount} ({analytics.netUnsubscribeRatePercent}%)
          </div>
        </div>
      </div>
      <div className='grid gap-3 text-[11px] text-gray-500 md:grid-cols-3'>
        <div>
          Latest run: {analytics.latestRunAt ? formatTimestamp(analytics.latestRunAt) : 'No runs yet'}
        </div>
        <div>Latest run status: {analytics.latestRunStatus ?? 'No runs yet'}</div>
        <div>
          Latest activity:{' '}
          {analytics.latestActivityAt
            ? formatTimestamp(analytics.latestActivityAt)
            : 'No campaign activity yet'}
        </div>
        <div>
          Latest open:{' '}
          {analytics.latestOpenAt ? formatTimestamp(analytics.latestOpenAt) : 'No open tracking yet'}
        </div>
        <div>
          Latest click:{' '}
          {analytics.latestClickAt ? formatTimestamp(analytics.latestClickAt) : 'No click tracking yet'}
        </div>
        <div>
          Latest reply:{' '}
          {analytics.latestReplyAt ? formatTimestamp(analytics.latestReplyAt) : 'No replies yet'}
        </div>
        <div>
          Latest opt-out:{' '}
          {analytics.latestUnsubscribeAt
            ? formatTimestamp(analytics.latestUnsubscribeAt)
            : 'No unsubscribe activity yet'}
        </div>
        <div>
          Latest restore:{' '}
          {analytics.latestResubscribeAt
            ? formatTimestamp(analytics.latestResubscribeAt)
            : 'No restore activity yet'}
        </div>
      </div>
      <div className='space-y-3'>
        <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>Top clicked links</div>
        {analytics.topClickedLinks.length === 0 ? (
          <div className='text-sm text-gray-500'>
            No tracked click activity has been recorded for this campaign yet.
          </div>
        ) : (
          analytics.topClickedLinks.map((link: FilemakerEmailCampaignLinkPerformance) => (
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
    </FormSection>
  );
};

export const RecentRunsSection = () => {
  const {
    recentRuns,
    deliveryRegistry,
    attemptRegistry,
    handleRunAction,
    isRunActionPending,
    isUpdatePending,
    router,
  } = useCampaignEditContext();

  return (
    <FormSection title='Recent Runs' className='space-y-4 p-4'>
      {recentRuns.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No runs yet. Create a dry run or launch the campaign to start monitoring progress.
        </div>
      ) : (
        recentRuns.map((run: FilemakerEmailCampaignRun) => {
          const runDeliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id);
          const metrics =
            runDeliveries.length > 0
              ? summarizeFilemakerEmailCampaignRunDeliveries(runDeliveries)
              : {
                  recipientCount: run.recipientCount,
                  deliveredCount: run.deliveredCount,
                  failedCount: run.failedCount,
                  skippedCount: run.skippedCount,
                };
          const progressBase = metrics.recipientCount || 1;
          const progressPercent = Math.round(
            ((metrics.deliveredCount + metrics.failedCount + metrics.skippedCount) / progressBase) * 100
          );
          return (
            <div key={run.id} className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-1'>
                  <div className='text-sm font-medium text-white'>{run.id}</div>
                  <div className='text-[11px] text-gray-400'>
                    {run.mode === 'dry_run' ? 'Dry run' : 'Live run'} • {formatTimestamp(run.createdAt)}
                  </div>
                </div>
                <Badge variant='outline' className='text-[10px] capitalize'>
                  {run.status}
                </Badge>
              </div>
              <div className='grid gap-2 text-[11px] text-gray-500 md:grid-cols-4'>
                <div>Recipients: {metrics.recipientCount}</div>
                <div>Delivered: {metrics.deliveredCount}</div>
                <div>Failed: {metrics.failedCount}</div>
                <div>Skipped: {metrics.skippedCount}</div>
              </div>
              <div className='text-[11px] text-gray-500'>Progress: {progressPercent}%</div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={(): void => {
                    startTransition(() => { router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(run.id)}`); });
                  }}
                >
                  Open Run Monitor
                </Button>
                {getRunActions({
                  run,
                  deliveries: runDeliveries,
                  attemptRegistry,
                }).map((action) => (
                  <Button
                    key={`${run.id}-${action.action}`}
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={isUpdatePending || isRunActionPending(run.id, action.action)}
                    onClick={(): void => {
                      void handleRunAction(run.id, action.action);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </FormSection>
  );
};
