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
  FilemakerEmailCampaignRecipientActivityItem,
  FilemakerEmailCampaignRecipientActivityType,
  FilemakerEmailCampaignRecipientActivitySummary,
} from '../../types/campaigns';
import {
  normalizeFilemakerEmailCampaignDeliveryRegistry,
  normalizeFilemakerEmailCampaignEventRegistry,
} from '../campaign-factories';
import { isRecipientActivityType, toSortedLatestTimestamp } from './utils';

export const summarizeFilemakerEmailCampaignRecipientActivity = (input: {
  emailAddress: string;
  campaignId?: string | null;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
}): FilemakerEmailCampaignRecipientActivitySummary => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  const normalizedCampaignId = normalizeString(input.campaignId) || null;
  const campaignName =
    normalizedCampaignId
      ? input.campaignRegistry.campaigns.find(
          (campaign: FilemakerEmailCampaign): boolean => campaign.id === normalizedCampaignId
        )?.name ?? null
      : null;

  const deliveries = normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.emailAddress === normalizedEmailAddress &&
      (!normalizedCampaignId || delivery.campaignId === normalizedCampaignId)
  );
  const deliveryIds = new Set(deliveries.map((delivery: FilemakerEmailCampaignDelivery) => delivery.id));
  const deliveryEventRegistry = normalizeFilemakerEmailCampaignEventRegistry(input.eventRegistry);
  const activityEvents = deliveryEventRegistry.events.filter(
    (
      event: FilemakerEmailCampaignEvent
    ): event is FilemakerEmailCampaignEvent & {
      type: import('../../types/campaigns').FilemakerEmailCampaignRecipientActivityType;
    } => {
      if (!isRecipientActivityType(event.type)) return false;
      if (normalizedCampaignId && event.campaignId !== normalizedCampaignId) return false;
      if (event.deliveryId && deliveryIds.has(event.deliveryId)) return true;
      if (event.message.toLowerCase().includes(normalizedEmailAddress)) return true;
      return false;
    }
  );
  const campaignNameById = new Map(
    input.campaignRegistry.campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );

  const eventActivity = activityEvents.map(
    (
      event: FilemakerEmailCampaignEvent & {
        type: import('../../types/campaigns').FilemakerEmailCampaignRecipientActivityType;
      }
    ): FilemakerEmailCampaignRecipientActivityItem => ({
      id: event.id,
      type: event.type,
      campaignId: event.campaignId ?? null,
      campaignName: campaignNameById.get(event.campaignId) ?? null,
      runId: event.runId ?? null,
      deliveryId: event.deliveryId ?? null,
      timestamp: event.createdAt ?? '',
      details: event.message,
    })
  );

  const fallbackDeliveryActivity = deliveries.flatMap(
    (delivery: FilemakerEmailCampaignDelivery): FilemakerEmailCampaignRecipientActivityItem[] => {
      const type: FilemakerEmailCampaignRecipientActivityType | null =
        delivery.status === 'sent'
          ? 'delivery_sent'
          : delivery.status === 'bounced'
            ? 'delivery_bounced'
            : delivery.status === 'failed'
              ? 'delivery_failed'
              : null;
      if (!type) return [];
      const alreadyTracked = activityEvents.some(
        (event: FilemakerEmailCampaignEvent): boolean =>
          event.deliveryId === delivery.id && event.type === type
      );
      if (alreadyTracked) return [];

      const details =
        type === 'delivery_sent'
          ? `${delivery.emailAddress} received a campaign delivery.`
          : type === 'delivery_bounced'
            ? delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery bounced.`
            : delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery failed.`;

      return [
        {
          id: `recipient-activity-${delivery.id}-${type}`,
          type,
          campaignId: delivery.campaignId,
          campaignName: campaignNameById.get(delivery.campaignId) ?? null,
          runId: delivery.runId,
          deliveryId: delivery.id,
          timestamp: delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? '',
          details,
        },
      ];
    }
  );

  return {
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    campaignName,
    deliveryCount: deliveries.length,
    sentCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
      .length,
    failedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed')
      .length,
    bouncedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced')
      .length,
    skippedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'skipped')
      .length,
    openCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
      .length,
    clickCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
      .length,
    unsubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
    ).length,
    resubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
    ).length,
    latestSentAt: toSortedLatestTimestamp(
      deliveries
        .filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
        .map((delivery: FilemakerEmailCampaignDelivery) => delivery.sentAt ?? delivery.updatedAt ?? null)
    ),
    latestOpenAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestClickAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestUnsubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestResubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    recentActivity: eventActivity
      .concat(fallbackDeliveryActivity)
      .sort(
        (
          left: FilemakerEmailCampaignRecipientActivityItem,
          right: FilemakerEmailCampaignRecipientActivityItem
        ): number => Date.parse(right.timestamp ?? '') - Date.parse(left.timestamp ?? '')
      )
      .slice(0, 8),
  };
};
