import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import {
  type FilemakerEmailCampaignAnalytics,
  type FilemakerEmailCampaignLinkPerformance,
} from '../../types/campaigns';
import {
  getFilemakerEmailCampaignDeliveriesForRun,
  normalizeFilemakerEmailCampaignEventRegistry,
} from '../campaign-factories';
import {
  roundPercentage,
  summarizeUniqueDeliveryEventCount,
} from './utils';
import { resolveFilemakerEmailCampaignAudiencePreview } from './audience';

export const summarizeFilemakerEmailCampaignAnalytics = (input: {
  campaign: FilemakerEmailCampaign;
  database: FilemakerDatabase;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
}): FilemakerEmailCampaignAnalytics => {
  const runs = input.runRegistry.runs.filter(
    (run: FilemakerEmailCampaignRun): boolean => run.campaignId === input.campaign.id
  );
  const campaignEvents = normalizeFilemakerEmailCampaignEventRegistry(
    input.eventRegistry
  ).events.filter((event: FilemakerEmailCampaignEvent): boolean => event.campaignId === input.campaign.id);
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.database,
    input.campaign.audience,
    input.suppressionRegistry
  );
  const unsubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
  );
  const resubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
  );
  const openEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened'
  );
  const clickEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked'
  );
  const uniqueOpenCount = summarizeUniqueDeliveryEventCount(openEvents);
  const uniqueClickCount = summarizeUniqueDeliveryEventCount(clickEvents);
  const rawTopClickedLinks = Array.from(
    clickEvents.reduce<
      Map<
        string,
        {
          targetUrl: string;
          clickCount: number;
          deliveryIds: Set<string>;
          latestClickAt: string | null;
        }
      >
    >((map, event) => {
      const targetUrl = normalizeString(event.targetUrl);
      if (!targetUrl) return map;
      const existing = map.get(targetUrl) ?? {
        targetUrl,
        clickCount: 0,
        deliveryIds: new Set<string>(),
        latestClickAt: null,
      };
      existing.clickCount += 1;
      if (event.deliveryId) {
        existing.deliveryIds.add(event.deliveryId);
      }
      const eventAt = event.createdAt ?? null;
      if (
        eventAt &&
        (!existing.latestClickAt || Date.parse(eventAt) > Date.parse(existing.latestClickAt))
      ) {
        existing.latestClickAt = eventAt;
      }
      map.set(targetUrl, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]) => ({
      targetUrl: entry.targetUrl,
      clickCount: entry.clickCount,
      uniqueDeliveryCount: entry.deliveryIds.size > 0 ? entry.deliveryIds.size : entry.clickCount,
      latestClickAt: entry.latestClickAt,
    }))
    .sort((left, right) => {
      if (right.clickCount !== left.clickCount) {
        return right.clickCount - left.clickCount;
      }
      return Date.parse(right.latestClickAt ?? '') - Date.parse(left.latestClickAt ?? '');
    })
    .slice(0, 5);

  const deliveryTotals = runs.reduce(
    (
      totals: {
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        bouncedCount: number;
        skippedCount: number;
        queuedCount: number;
      },
      run: FilemakerEmailCampaignRun
    ) => {
      const deliveries = getFilemakerEmailCampaignDeliveriesForRun(input.deliveryRegistry, run.id);
      if (deliveries.length === 0) {
        const queuedCount = Math.max(
          0,
          run.recipientCount - run.deliveredCount - run.failedCount - run.skippedCount
        );
        totals.totalRecipients += run.recipientCount;
        totals.sentCount += run.deliveredCount;
        totals.failedCount += run.failedCount;
        totals.skippedCount += run.skippedCount;
        totals.queuedCount += queuedCount;
        return totals;
      }

      totals.totalRecipients += deliveries.length;
      deliveries.forEach((delivery: FilemakerEmailCampaignDelivery): void => {
        if (delivery.status === 'sent') {
          totals.sentCount += 1;
          return;
        }
        if (delivery.status === 'failed') {
          totals.failedCount += 1;
          return;
        }
        if (delivery.status === 'bounced') {
          totals.bouncedCount += 1;
          return;
        }
        if (delivery.status === 'skipped') {
          totals.skippedCount += 1;
          return;
        }
        if (delivery.status === 'queued') {
          totals.queuedCount += 1;
        }
      });
      return totals;
    },
    {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      skippedCount: 0,
      queuedCount: 0,
    }
  );

  const processedCount =
    deliveryTotals.sentCount +
    deliveryTotals.failedCount +
    deliveryTotals.bouncedCount +
    deliveryTotals.skippedCount;
  const topClickedLinks = rawTopClickedLinks.map(
    (entry): FilemakerEmailCampaignLinkPerformance => ({
      ...entry,
      clickRatePercent: roundPercentage(entry.uniqueDeliveryCount, deliveryTotals.sentCount),
    })
  );

  const latestRun =
    [...runs].sort(
      (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    )[0] ?? null;

  const latestActivitySource = [
    latestRun?.updatedAt ?? latestRun?.createdAt ?? null,
    ...campaignEvents.map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null),
  ]
    .filter((value: string | null): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left));
  const latestUnsubscribeAt =
    unsubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestResubscribeAt =
    resubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestOpenAt =
    openEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestClickAt =
    clickEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;

  const netUnsubscribeCount = Math.max(unsubscribeEvents.length - resubscribeEvents.length, 0);

  return {
    totalRuns: runs.length,
    liveRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'live')
      .length,
    dryRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'dry_run')
      .length,
    totalRecipients: deliveryTotals.totalRecipients,
    processedCount,
    queuedCount: deliveryTotals.queuedCount,
    sentCount: deliveryTotals.sentCount,
    failedCount: deliveryTotals.failedCount,
    bouncedCount: deliveryTotals.bouncedCount,
    skippedCount: deliveryTotals.skippedCount,
    completionRatePercent: roundPercentage(processedCount, deliveryTotals.totalRecipients),
    deliveryRatePercent: roundPercentage(deliveryTotals.sentCount, deliveryTotals.totalRecipients),
    failureRatePercent: roundPercentage(
      deliveryTotals.failedCount + deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    bounceRatePercent: roundPercentage(
      deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    suppressionImpactCount: preview.suppressedCount,
    openCount: openEvents.length,
    openRatePercent: roundPercentage(openEvents.length, deliveryTotals.sentCount),
    uniqueOpenCount,
    uniqueOpenRatePercent: roundPercentage(uniqueOpenCount, deliveryTotals.sentCount),
    clickCount: clickEvents.length,
    clickRatePercent: roundPercentage(clickEvents.length, deliveryTotals.sentCount),
    uniqueClickCount,
    uniqueClickRatePercent: roundPercentage(uniqueClickCount, deliveryTotals.sentCount),
    unsubscribeCount: unsubscribeEvents.length,
    unsubscribeRatePercent: roundPercentage(unsubscribeEvents.length, deliveryTotals.sentCount),
    resubscribeCount: resubscribeEvents.length,
    resubscribeRatePercent: roundPercentage(resubscribeEvents.length, deliveryTotals.sentCount),
    netUnsubscribeCount,
    netUnsubscribeRatePercent: roundPercentage(netUnsubscribeCount, deliveryTotals.sentCount),
    latestRunStatus: latestRun?.status ?? null,
    latestRunAt: latestRun?.createdAt ?? null,
    latestActivityAt: latestActivitySource[0] ?? null,
    latestOpenAt,
    latestClickAt,
    latestUnsubscribeAt,
    latestResubscribeAt,
    topClickedLinks,
    eventCount: campaignEvents.length,
  };
};
