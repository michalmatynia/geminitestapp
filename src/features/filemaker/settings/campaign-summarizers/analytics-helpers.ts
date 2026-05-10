import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRun,
} from '../../types';
import {
  type FilemakerEmailCampaignAnalytics,
  type FilemakerEmailCampaignLinkPerformance,
} from '../../types/campaigns';
import { getFilemakerEmailCampaignDeliveriesForRun } from '../campaign-factories';
import { roundPercentage } from './utils';

type DeliveryTotals = {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  queuedCount: number;
};

type ClickedLinkAccumulator = {
  targetUrl: string;
  clickCount: number;
  deliveryIds: Set<string>;
  latestClickAt: string | null;
};

export type CampaignEventGroups = {
  unsubscribeEvents: FilemakerEmailCampaignEvent[];
  resubscribeEvents: FilemakerEmailCampaignEvent[];
  openEvents: FilemakerEmailCampaignEvent[];
  clickEvents: FilemakerEmailCampaignEvent[];
  replyEvents: FilemakerEmailCampaignEvent[];
};

const EMPTY_DELIVERY_TOTALS: DeliveryTotals = {
  totalRecipients: 0,
  sentCount: 0,
  failedCount: 0,
  bouncedCount: 0,
  skippedCount: 0,
  queuedCount: 0,
};

const filterCampaignEventsByType = (
  events: FilemakerEmailCampaignEvent[],
  type: FilemakerEmailCampaignEvent['type']
): FilemakerEmailCampaignEvent[] =>
  events.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === type);

const resolveLaterTimestamp = (
  current: string | null,
  candidate: string | null | undefined
): string | null => {
  if (candidate === null || candidate === undefined || candidate.length === 0) return current;
  if (current === null) return candidate;
  return Date.parse(candidate) > Date.parse(current) ? candidate : current;
};

const addClickedLinkEvent = (
  map: Map<string, ClickedLinkAccumulator>,
  event: FilemakerEmailCampaignEvent
): Map<string, ClickedLinkAccumulator> => {
  const targetUrl = normalizeString(event.targetUrl);
  if (targetUrl.length === 0) return map;

  const existing = map.get(targetUrl) ?? {
    targetUrl,
    clickCount: 0,
    deliveryIds: new Set<string>(),
    latestClickAt: null,
  };
  const deliveryIds = new Set(existing.deliveryIds);
  if (event.deliveryId !== null && event.deliveryId !== undefined && event.deliveryId.length > 0) {
    deliveryIds.add(event.deliveryId);
  }
  map.set(targetUrl, {
    targetUrl,
    clickCount: existing.clickCount + 1,
    deliveryIds,
    latestClickAt: resolveLaterTimestamp(existing.latestClickAt, event.createdAt),
  });
  return map;
};

export const summarizeTopClickedLinks = (
  clickEvents: FilemakerEmailCampaignEvent[]
): Omit<FilemakerEmailCampaignLinkPerformance, 'clickRatePercent'>[] =>
  Array.from(clickEvents.reduce(addClickedLinkEvent, new Map<string, ClickedLinkAccumulator>()))
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

const addFallbackRunTotals = (
  totals: DeliveryTotals,
  run: FilemakerEmailCampaignRun
): DeliveryTotals => {
  const queuedCount = Math.max(
    0,
    run.recipientCount - run.deliveredCount - run.failedCount - run.skippedCount
  );
  return {
    ...totals,
    totalRecipients: totals.totalRecipients + run.recipientCount,
    sentCount: totals.sentCount + run.deliveredCount,
    failedCount: totals.failedCount + run.failedCount,
    skippedCount: totals.skippedCount + run.skippedCount,
    queuedCount: totals.queuedCount + queuedCount,
  };
};

const addDeliveryTotals = (
  totals: DeliveryTotals,
  delivery: FilemakerEmailCampaignDelivery
): DeliveryTotals => {
  if (delivery.status === 'sent') return { ...totals, sentCount: totals.sentCount + 1 };
  if (delivery.status === 'failed') return { ...totals, failedCount: totals.failedCount + 1 };
  if (delivery.status === 'bounced') return { ...totals, bouncedCount: totals.bouncedCount + 1 };
  if (delivery.status === 'skipped') return { ...totals, skippedCount: totals.skippedCount + 1 };
  return { ...totals, queuedCount: totals.queuedCount + 1 };
};

const addRunDeliveryTotals = (
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry,
  totals: DeliveryTotals,
  run: FilemakerEmailCampaignRun
): DeliveryTotals => {
  const deliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id);
  if (deliveries.length === 0) return addFallbackRunTotals(totals, run);

  const totalsWithRecipients = {
    ...totals,
    totalRecipients: totals.totalRecipients + deliveries.length,
  };
  return deliveries.reduce(addDeliveryTotals, totalsWithRecipients);
};

export const summarizeDeliveryTotals = (
  runs: FilemakerEmailCampaignRun[],
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry
): DeliveryTotals =>
  runs.reduce(
    (totals: DeliveryTotals, run: FilemakerEmailCampaignRun): DeliveryTotals =>
      addRunDeliveryTotals(deliveryRegistry, totals, run),
    EMPTY_DELIVERY_TOTALS
  );

export const getFilemakerEmailCampaignDeliveriesForRuns = (
  runs: FilemakerEmailCampaignRun[],
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry
): FilemakerEmailCampaignDelivery[] =>
  runs.flatMap((run: FilemakerEmailCampaignRun): FilemakerEmailCampaignDelivery[] =>
    getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id)
  );

export const resolveLatestRun = (
  runs: FilemakerEmailCampaignRun[]
): FilemakerEmailCampaignRun | null =>
  [...runs].sort(
    (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
      Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
  )[0] ?? null;

const countRunsByMode = (
  runs: FilemakerEmailCampaignRun[],
  mode: FilemakerEmailCampaignRun['mode']
): number => runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === mode).length;

export const groupCampaignEvents = (
  events: FilemakerEmailCampaignEvent[]
): CampaignEventGroups => ({
  unsubscribeEvents: filterCampaignEventsByType(events, 'unsubscribed'),
  resubscribeEvents: filterCampaignEventsByType(events, 'resubscribed'),
  openEvents: filterCampaignEventsByType(events, 'opened'),
  clickEvents: filterCampaignEventsByType(events, 'clicked'),
  replyEvents: filterCampaignEventsByType(events, 'reply_received'),
});

export const applyClickRates = (
  entries: Omit<FilemakerEmailCampaignLinkPerformance, 'clickRatePercent'>[],
  sentCount: number
): FilemakerEmailCampaignLinkPerformance[] =>
  entries.map(
    (entry): FilemakerEmailCampaignLinkPerformance => ({
      ...entry,
      clickRatePercent: roundPercentage(entry.uniqueDeliveryCount, sentCount),
    })
  );

export const buildRunCountMetrics = (
  runs: FilemakerEmailCampaignRun[]
): Pick<FilemakerEmailCampaignAnalytics, 'totalRuns' | 'liveRunCount' | 'dryRunCount'> => ({
  totalRuns: runs.length,
  liveRunCount: countRunsByMode(runs, 'live'),
  dryRunCount: countRunsByMode(runs, 'dry_run'),
});

export const buildDeliveryMetrics = (
  deliveryTotals: DeliveryTotals,
  processedCount: number
): Pick<
  FilemakerEmailCampaignAnalytics,
  | 'totalRecipients'
  | 'processedCount'
  | 'queuedCount'
  | 'sentCount'
  | 'failedCount'
  | 'bouncedCount'
  | 'skippedCount'
  | 'completionRatePercent'
  | 'deliveryRatePercent'
  | 'failureRatePercent'
  | 'bounceRatePercent'
> => ({
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
  bounceRatePercent: roundPercentage(deliveryTotals.bouncedCount, deliveryTotals.totalRecipients),
});
