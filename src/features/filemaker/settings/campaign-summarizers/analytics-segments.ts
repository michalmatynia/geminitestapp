import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
} from '../../types';
import type {
  FilemakerEmailCampaignAnalytics,
  FilemakerEmailCampaignSegmentAnalytics,
} from '../../types/campaigns';
import { groupCampaignEvents } from './analytics-helpers';
import {
  resolveEmailDomain,
  roundPercentage,
  summarizeUniqueDeliveryEventCount,
  toSortedLatestTimestamp,
} from './utils';

type SegmentKey = {
  key: string;
  label: string;
};

type SegmentDeliveryTotals = {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  queuedCount: number;
};

type CampaignSegmentAccumulator = SegmentKey & {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
};

type CampaignSegmentResolver = (delivery: FilemakerEmailCampaignDelivery) => SegmentKey;

const EMPTY_SEGMENT_DELIVERY_TOTALS: SegmentDeliveryTotals = {
  totalRecipients: 0,
  sentCount: 0,
  failedCount: 0,
  bouncedCount: 0,
  skippedCount: 0,
  queuedCount: 0,
};

const addSegmentDeliveryTotals = (
  totals: SegmentDeliveryTotals,
  delivery: FilemakerEmailCampaignDelivery
): SegmentDeliveryTotals => {
  if (delivery.status === 'sent') return { ...totals, sentCount: totals.sentCount + 1 };
  if (delivery.status === 'failed') return { ...totals, failedCount: totals.failedCount + 1 };
  if (delivery.status === 'bounced') return { ...totals, bouncedCount: totals.bouncedCount + 1 };
  if (delivery.status === 'skipped') return { ...totals, skippedCount: totals.skippedCount + 1 };
  return { ...totals, queuedCount: totals.queuedCount + 1 };
};

const summarizeSegmentDeliveries = (
  deliveries: FilemakerEmailCampaignDelivery[]
): SegmentDeliveryTotals =>
  deliveries.reduce(
    (totals: SegmentDeliveryTotals, delivery: FilemakerEmailCampaignDelivery) =>
      addSegmentDeliveryTotals(
        {
          ...totals,
          totalRecipients: totals.totalRecipients + 1,
        },
        delivery
      ),
    EMPTY_SEGMENT_DELIVERY_TOTALS
  );

const countFallbackContent = (deliveries: FilemakerEmailCampaignDelivery[]): number =>
  deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.usedFallbackContent === true
  ).length;

const resolveLatestSegmentActivityAt = (segment: CampaignSegmentAccumulator): string | null =>
  toSortedLatestTimestamp(
    segment.events
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .concat(
        segment.deliveries.map(
          (delivery: FilemakerEmailCampaignDelivery) =>
            delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null
        )
      )
  );

const toCampaignSegmentAnalytics = (
  segment: CampaignSegmentAccumulator
): FilemakerEmailCampaignSegmentAnalytics => {
  const deliveryTotals = summarizeSegmentDeliveries(segment.deliveries);
  const eventGroups = groupCampaignEvents(segment.events);
  const uniqueOpenCount = summarizeUniqueDeliveryEventCount(eventGroups.openEvents);
  const uniqueClickCount = summarizeUniqueDeliveryEventCount(eventGroups.clickEvents);
  const failedAndBouncedCount = deliveryTotals.failedCount + deliveryTotals.bouncedCount;

  return {
    key: segment.key,
    label: segment.label,
    totalRecipients: deliveryTotals.totalRecipients,
    sentCount: deliveryTotals.sentCount,
    failedCount: deliveryTotals.failedCount,
    bouncedCount: deliveryTotals.bouncedCount,
    skippedCount: deliveryTotals.skippedCount,
    queuedCount: deliveryTotals.queuedCount,
    deliveryRatePercent: roundPercentage(
      deliveryTotals.sentCount,
      deliveryTotals.totalRecipients
    ),
    failureRatePercent: roundPercentage(
      failedAndBouncedCount,
      deliveryTotals.totalRecipients
    ),
    bounceRatePercent: roundPercentage(
      deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    openCount: eventGroups.openEvents.length,
    uniqueOpenCount,
    uniqueOpenRatePercent: roundPercentage(uniqueOpenCount, deliveryTotals.sentCount),
    clickCount: eventGroups.clickEvents.length,
    uniqueClickCount,
    uniqueClickRatePercent: roundPercentage(uniqueClickCount, deliveryTotals.sentCount),
    replyCount: eventGroups.replyEvents.length,
    replyRatePercent: roundPercentage(eventGroups.replyEvents.length, deliveryTotals.sentCount),
    unsubscribeCount: eventGroups.unsubscribeEvents.length,
    unsubscribeRatePercent: roundPercentage(
      eventGroups.unsubscribeEvents.length,
      deliveryTotals.sentCount
    ),
    fallbackContentCount: countFallbackContent(segment.deliveries),
    latestActivityAt: resolveLatestSegmentActivityAt(segment),
  };
};

const buildEventsByDeliveryId = (
  events: FilemakerEmailCampaignEvent[]
): Map<string, FilemakerEmailCampaignEvent[]> => {
  const eventsByDeliveryId = new Map<string, FilemakerEmailCampaignEvent[]>();
  events.forEach((event: FilemakerEmailCampaignEvent): void => {
    const deliveryId = normalizeString(event.deliveryId);
    if (deliveryId.length === 0) return;
    const list = eventsByDeliveryId.get(deliveryId) ?? [];
    list.push(event);
    eventsByDeliveryId.set(deliveryId, list);
  });
  return eventsByDeliveryId;
};

const addDeliveryToSegment = (
  map: Map<string, CampaignSegmentAccumulator>,
  delivery: FilemakerEmailCampaignDelivery,
  eventsByDeliveryId: Map<string, FilemakerEmailCampaignEvent[]>,
  resolveSegment: CampaignSegmentResolver
): Map<string, CampaignSegmentAccumulator> => {
  const resolved = resolveSegment(delivery);
  const existing = map.get(resolved.key) ?? {
    key: resolved.key,
    label: resolved.label,
    deliveries: [],
    events: [],
  };
  existing.deliveries.push(delivery);
  existing.events.push(...(eventsByDeliveryId.get(delivery.id) ?? []));
  map.set(resolved.key, existing);
  return map;
};

const summarizeCampaignSegments = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
  resolveSegment: CampaignSegmentResolver;
  limit?: number;
}): FilemakerEmailCampaignSegmentAnalytics[] => {
  const eventsByDeliveryId = buildEventsByDeliveryId(input.events);
  const segments = input.deliveries.reduce<Map<string, CampaignSegmentAccumulator>>(
    (map, delivery): Map<string, CampaignSegmentAccumulator> =>
      addDeliveryToSegment(map, delivery, eventsByDeliveryId, input.resolveSegment),
    new Map()
  );

  return Array.from(segments.values())
    .map(toCampaignSegmentAnalytics)
    .sort((left, right) => {
      if (right.totalRecipients !== left.totalRecipients) {
        return right.totalRecipients - left.totalRecipients;
      }
      if (right.sentCount !== left.sentCount) return right.sentCount - left.sentCount;
      return left.label.localeCompare(right.label);
    })
    .slice(0, input.limit ?? 12);
};

const resolveLanguageSegment = (delivery: FilemakerEmailCampaignDelivery): SegmentKey => {
  const languageCode = normalizeString(delivery.languageCode).toLowerCase();
  if (languageCode.length === 0) {
    return { key: 'legacy-direct', label: 'Direct campaign content' };
  }
  return { key: languageCode, label: languageCode.toUpperCase() };
};

const resolveContentVariantSegment = (
  delivery: FilemakerEmailCampaignDelivery
): SegmentKey => {
  const variantId = normalizeString(delivery.contentVariantId);
  if (variantId.length === 0) {
    return { key: 'legacy-direct', label: 'Direct campaign content' };
  }
  const languageCode = normalizeString(delivery.languageCode).toUpperCase();
  return {
    key: variantId,
    label: languageCode.length > 0 ? `${languageCode} • ${variantId}` : variantId,
  };
};

const resolveCountrySegment = (delivery: FilemakerEmailCampaignDelivery): SegmentKey => {
  const countryId = normalizeString(delivery.resolvedCountryId);
  const countryName = normalizeString(delivery.resolvedCountryName);
  if (countryId.length === 0 && countryName.length === 0) {
    return { key: 'unknown-country', label: 'Unknown country' };
  }
  return {
    key: countryId.length > 0 ? countryId : countryName,
    label: countryName.length > 0 ? countryName : countryId,
  };
};

const resolveDomainSegment = (delivery: FilemakerEmailCampaignDelivery): SegmentKey => {
  const domain = resolveEmailDomain(delivery.emailAddress);
  return { key: domain, label: domain };
};

export const summarizeAdvancedCampaignSegments = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
}): Pick<
  FilemakerEmailCampaignAnalytics,
  | 'languageSummaries'
  | 'contentVariantSummaries'
  | 'countrySummaries'
  | 'domainSummaries'
  | 'fallbackContentCount'
  | 'fallbackContentRatePercent'
> => {
  const fallbackContentCount = countFallbackContent(input.deliveries);
  return {
    languageSummaries: summarizeCampaignSegments({
      ...input,
      resolveSegment: resolveLanguageSegment,
    }),
    contentVariantSummaries: summarizeCampaignSegments({
      ...input,
      resolveSegment: resolveContentVariantSegment,
    }),
    countrySummaries: summarizeCampaignSegments({
      ...input,
      resolveSegment: resolveCountrySegment,
    }),
    domainSummaries: summarizeCampaignSegments({
      ...input,
      resolveSegment: resolveDomainSegment,
    }),
    fallbackContentCount,
    fallbackContentRatePercent: roundPercentage(fallbackContentCount, input.deliveries.length),
  };
};
