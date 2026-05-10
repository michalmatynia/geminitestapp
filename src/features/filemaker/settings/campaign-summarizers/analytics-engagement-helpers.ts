import type {
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRun,
} from '../../types';
import { type FilemakerEmailCampaignAnalytics } from '../../types/campaigns';
import type { CampaignEventGroups } from './analytics-helpers';
import {
  roundPercentage,
  summarizeUniqueDeliveryEventCount,
  toSortedLatestTimestamp,
} from './utils';

export const buildEngagementMetrics = (
  groups: CampaignEventGroups,
  sentCount: number
): Pick<
  FilemakerEmailCampaignAnalytics,
  | 'openCount'
  | 'openRatePercent'
  | 'uniqueOpenCount'
  | 'uniqueOpenRatePercent'
  | 'clickCount'
  | 'clickRatePercent'
  | 'uniqueClickCount'
  | 'uniqueClickRatePercent'
  | 'unsubscribeCount'
  | 'unsubscribeRatePercent'
  | 'resubscribeCount'
  | 'resubscribeRatePercent'
  | 'netUnsubscribeCount'
  | 'netUnsubscribeRatePercent'
  | 'replyCount'
  | 'replyRatePercent'
> => {
  const uniqueOpenCount = summarizeUniqueDeliveryEventCount(groups.openEvents);
  const uniqueClickCount = summarizeUniqueDeliveryEventCount(groups.clickEvents);
  const netUnsubscribeCount = Math.max(
    groups.unsubscribeEvents.length - groups.resubscribeEvents.length,
    0
  );

  return {
    openCount: groups.openEvents.length,
    openRatePercent: roundPercentage(groups.openEvents.length, sentCount),
    uniqueOpenCount,
    uniqueOpenRatePercent: roundPercentage(uniqueOpenCount, sentCount),
    clickCount: groups.clickEvents.length,
    clickRatePercent: roundPercentage(groups.clickEvents.length, sentCount),
    uniqueClickCount,
    uniqueClickRatePercent: roundPercentage(uniqueClickCount, sentCount),
    unsubscribeCount: groups.unsubscribeEvents.length,
    unsubscribeRatePercent: roundPercentage(groups.unsubscribeEvents.length, sentCount),
    resubscribeCount: groups.resubscribeEvents.length,
    resubscribeRatePercent: roundPercentage(groups.resubscribeEvents.length, sentCount),
    netUnsubscribeCount,
    netUnsubscribeRatePercent: roundPercentage(netUnsubscribeCount, sentCount),
    replyCount: groups.replyEvents.length,
    replyRatePercent: roundPercentage(groups.replyEvents.length, sentCount),
  };
};

const resolveLatestRunStatus = (
  latestRun: FilemakerEmailCampaignRun | null
): FilemakerEmailCampaignAnalytics['latestRunStatus'] => {
  const status = latestRun?.status ?? null;
  const knownStatuses = new Set<FilemakerEmailCampaignRun['status']>([
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled',
  ]);
  return status !== null && knownStatuses.has(status) ? status : null;
};

const resolveLatestRunAt = (latestRun: FilemakerEmailCampaignRun | null): string | null =>
  latestRun === null ? null : latestRun.createdAt ?? null;

const resolveLatestEventTimestamp = (events: FilemakerEmailCampaignEvent[]): string | null =>
  toSortedLatestTimestamp(
    events.map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
  );

const resolveLatestActivityAt = (
  latestRun: FilemakerEmailCampaignRun | null,
  campaignEvents: FilemakerEmailCampaignEvent[]
): string | null =>
  toSortedLatestTimestamp([
    latestRun?.updatedAt ?? latestRun?.createdAt ?? null,
    ...campaignEvents.map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null),
  ]);

export const buildLatestActivityMetrics = (
  latestRun: FilemakerEmailCampaignRun | null,
  campaignEvents: FilemakerEmailCampaignEvent[],
  groups: CampaignEventGroups
): Pick<
  FilemakerEmailCampaignAnalytics,
  | 'latestRunStatus'
  | 'latestRunAt'
  | 'latestActivityAt'
  | 'latestOpenAt'
  | 'latestClickAt'
  | 'latestReplyAt'
  | 'latestUnsubscribeAt'
  | 'latestResubscribeAt'
> => ({
  latestRunStatus: resolveLatestRunStatus(latestRun),
  latestRunAt: resolveLatestRunAt(latestRun),
  latestActivityAt: resolveLatestActivityAt(latestRun, campaignEvents),
  latestOpenAt: resolveLatestEventTimestamp(groups.openEvents),
  latestClickAt: resolveLatestEventTimestamp(groups.clickEvents),
  latestReplyAt: resolveLatestEventTimestamp(groups.replyEvents),
  latestUnsubscribeAt: resolveLatestEventTimestamp(groups.unsubscribeEvents),
  latestResubscribeAt: resolveLatestEventTimestamp(groups.resubscribeEvents),
});
