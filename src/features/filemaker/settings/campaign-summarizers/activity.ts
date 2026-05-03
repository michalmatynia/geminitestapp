import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRegistry,
} from '../../types';
import {
  type FilemakerEmailCampaignRecipientActivityItem,
  type FilemakerEmailCampaignRecipientActivityType,
  type FilemakerEmailCampaignRecipientActivitySummary,
} from '../../types/campaigns';
import {
  normalizeFilemakerEmailCampaignDeliveryRegistry,
  normalizeFilemakerEmailCampaignEventRegistry,
} from '../campaign-factories';
import {
  isRecipientActivityType,
  mapDeliveryStatusToActivityType,
  toSortedLatestTimestamp,
} from './utils';

type RecipientActivityEvent = FilemakerEmailCampaignEvent & {
  type: FilemakerEmailCampaignRecipientActivityType;
};

const normalizeOptionalCampaignId = (campaignId: string | null | undefined): string | null => {
  const normalizedCampaignId = normalizeString(campaignId);
  return normalizedCampaignId.length > 0 ? normalizedCampaignId : null;
};

const resolveCampaignName = (
  campaigns: FilemakerEmailCampaign[],
  campaignId: string | null
): string | null => {
  if (campaignId === null) return null;
  return campaigns.find((campaign: FilemakerEmailCampaign): boolean => campaign.id === campaignId)?.name ?? null;
};

const getRecipientDeliveries = (input: {
  emailAddress: string;
  campaignId: string | null;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
}): FilemakerEmailCampaignDelivery[] =>
  normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.emailAddress === input.emailAddress &&
      (input.campaignId === null || delivery.campaignId === input.campaignId)
  );

const isMatchingRecipientActivityEvent = (
  event: FilemakerEmailCampaignEvent,
  input: {
    emailAddress: string;
    campaignId: string | null;
    deliveryIds: Set<string>;
  }
): event is RecipientActivityEvent => {
  if (!isRecipientActivityType(event.type)) return false;
  if (input.campaignId !== null && event.campaignId !== input.campaignId) return false;
  if (
    event.deliveryId !== null &&
    event.deliveryId !== undefined &&
    input.deliveryIds.has(event.deliveryId)
  ) {
    return true;
  }
  return event.message.toLowerCase().includes(input.emailAddress);
};

const getRecipientActivityEvents = (input: {
  emailAddress: string;
  campaignId: string | null;
  deliveryIds: Set<string>;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
}): RecipientActivityEvent[] =>
  normalizeFilemakerEmailCampaignEventRegistry(input.eventRegistry).events.filter(
    (event: FilemakerEmailCampaignEvent): event is RecipientActivityEvent =>
      isMatchingRecipientActivityEvent(event, input)
  );

const toEventActivityItem = (
  event: RecipientActivityEvent,
  campaignNameById: Map<string, string>
): FilemakerEmailCampaignRecipientActivityItem => ({
  id: event.id,
  type: event.type,
  campaignId: event.campaignId,
  campaignName: campaignNameById.get(event.campaignId) ?? null,
  runId: event.runId ?? null,
  deliveryId: event.deliveryId ?? null,
  mailThreadId: event.mailThreadId ?? null,
  mailMessageId: event.mailMessageId ?? null,
  timestamp: event.createdAt ?? '',
  details: event.message,
});

const resolveDeliveryErrorText = (delivery: FilemakerEmailCampaignDelivery): string | null => {
  const lastError = delivery.lastError?.trim() ?? '';
  if (lastError.length > 0) return lastError;
  const providerMessage = delivery.providerMessage?.trim() ?? '';
  return providerMessage.length > 0 ? providerMessage : null;
};

const resolveDefaultDeliveryMessage = (
  delivery: FilemakerEmailCampaignDelivery,
  type: FilemakerEmailCampaignRecipientActivityType
): string =>
  type === 'delivery_bounced'
    ? `${delivery.emailAddress} delivery bounced.`
    : `${delivery.emailAddress} delivery failed.`;

const resolveDeliveryMessage = (
  delivery: FilemakerEmailCampaignDelivery,
  type: FilemakerEmailCampaignRecipientActivityType
): string => {
  if (type === 'delivery_sent') {
    return `${delivery.emailAddress} received a campaign delivery.`;
  }
  return resolveDeliveryErrorText(delivery) ?? resolveDefaultDeliveryMessage(delivery, type);
};

const isDeliveryActivityTracked = (
  activityEvents: RecipientActivityEvent[],
  delivery: FilemakerEmailCampaignDelivery,
  type: FilemakerEmailCampaignRecipientActivityType
): boolean =>
  activityEvents.some(
    (event: RecipientActivityEvent): boolean =>
      event.deliveryId === delivery.id && event.type === type
  );

const toFallbackDeliveryActivityItem = (
  delivery: FilemakerEmailCampaignDelivery,
  activityEvents: RecipientActivityEvent[],
  campaignNameById: Map<string, string>
): FilemakerEmailCampaignRecipientActivityItem | null => {
  const type = mapDeliveryStatusToActivityType(delivery.status);
  if (type === null) return null;
  if (isDeliveryActivityTracked(activityEvents, delivery, type)) return null;

  return {
    id: `recipient-activity-${delivery.id}-${type}`,
    type,
    campaignId: delivery.campaignId,
    campaignName: campaignNameById.get(delivery.campaignId) ?? null,
    runId: delivery.runId,
    deliveryId: delivery.id,
    timestamp: delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? '',
    details: resolveDeliveryMessage(delivery, type),
  };
};

const buildFallbackDeliveryActivity = (
  deliveries: FilemakerEmailCampaignDelivery[],
  activityEvents: RecipientActivityEvent[],
  campaignNameById: Map<string, string>
): FilemakerEmailCampaignRecipientActivityItem[] =>
  deliveries.flatMap((delivery: FilemakerEmailCampaignDelivery) => {
    const item = toFallbackDeliveryActivityItem(delivery, activityEvents, campaignNameById);
    return item === null ? [] : [item];
  });

const countDeliveriesByStatus = (
  deliveries: FilemakerEmailCampaignDelivery[],
  status: FilemakerEmailCampaignDelivery['status']
): number =>
  deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === status)
    .length;

const countEventsByType = (
  events: RecipientActivityEvent[],
  type: FilemakerEmailCampaignRecipientActivityType
): number => events.filter((event: RecipientActivityEvent): boolean => event.type === type).length;

const latestEventAt = (
  events: RecipientActivityEvent[],
  type: FilemakerEmailCampaignRecipientActivityType
): string | null =>
  toSortedLatestTimestamp(
    events
      .filter((event: RecipientActivityEvent): boolean => event.type === type)
      .map((event: RecipientActivityEvent) => event.createdAt ?? null)
  );

const resolveLatestSentAt = (deliveries: FilemakerEmailCampaignDelivery[]): string | null =>
  toSortedLatestTimestamp(
    deliveries
      .filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
      .map((delivery: FilemakerEmailCampaignDelivery) => delivery.sentAt ?? delivery.updatedAt ?? null)
  );

const buildRecentActivity = (
  campaigns: FilemakerEmailCampaign[],
  deliveries: FilemakerEmailCampaignDelivery[],
  activityEvents: RecipientActivityEvent[]
): FilemakerEmailCampaignRecipientActivityItem[] => {
  const campaignNameById = new Map(
    campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );
  const eventActivity = activityEvents.map(
    (event: RecipientActivityEvent): FilemakerEmailCampaignRecipientActivityItem =>
      toEventActivityItem(event, campaignNameById)
  );
  const fallbackDeliveryActivity = buildFallbackDeliveryActivity(
    deliveries,
    activityEvents,
    campaignNameById
  );

  return eventActivity
    .concat(fallbackDeliveryActivity)
    .sort(
      (
        left: FilemakerEmailCampaignRecipientActivityItem,
        right: FilemakerEmailCampaignRecipientActivityItem
      ): number => Date.parse(right.timestamp) - Date.parse(left.timestamp)
    )
    .slice(0, 8);
};

export const summarizeFilemakerEmailCampaignRecipientActivity = (input: {
  emailAddress: string;
  campaignId?: string | null;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
}): FilemakerEmailCampaignRecipientActivitySummary => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  const normalizedCampaignId = normalizeOptionalCampaignId(input.campaignId);
  const campaignName = resolveCampaignName(input.campaignRegistry.campaigns, normalizedCampaignId);
  const deliveries = getRecipientDeliveries({
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    deliveryRegistry: input.deliveryRegistry,
  });
  const deliveryIds = new Set(deliveries.map((delivery: FilemakerEmailCampaignDelivery) => delivery.id));
  const activityEvents = getRecipientActivityEvents({
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    deliveryIds,
    eventRegistry: input.eventRegistry,
  });

  return {
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    campaignName,
    deliveryCount: deliveries.length,
    sentCount: countDeliveriesByStatus(deliveries, 'sent'),
    failedCount: countDeliveriesByStatus(deliveries, 'failed'),
    bouncedCount: countDeliveriesByStatus(deliveries, 'bounced'),
    skippedCount: countDeliveriesByStatus(deliveries, 'skipped'),
    openCount: countEventsByType(activityEvents, 'opened'),
    clickCount: countEventsByType(activityEvents, 'clicked'),
    replyCount: countEventsByType(activityEvents, 'reply_received'),
    unsubscribeCount: countEventsByType(activityEvents, 'unsubscribed'),
    resubscribeCount: countEventsByType(activityEvents, 'resubscribed'),
    latestSentAt: resolveLatestSentAt(deliveries),
    latestOpenAt: latestEventAt(activityEvents, 'opened'),
    latestClickAt: latestEventAt(activityEvents, 'clicked'),
    latestReplyAt: latestEventAt(activityEvents, 'reply_received'),
    latestUnsubscribeAt: latestEventAt(activityEvents, 'unsubscribed'),
    latestResubscribeAt: latestEventAt(activityEvents, 'resubscribed'),
    recentActivity: buildRecentActivity(input.campaignRegistry.campaigns, deliveries, activityEvents),
  };
};
