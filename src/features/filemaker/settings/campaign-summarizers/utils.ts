import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRecipientActivityType,
} from '../../types';
import type { FilemakerEmailCampaignDeliverabilityHealthLevel } from '../../types/campaigns';

export const roundPercentage = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
};

export const summarizeUniqueDeliveryEventCount = (
  events: FilemakerEmailCampaignEvent[]
): number => {
  if (events.length === 0) return 0;
  const keys = new Set(
    events.map((event: FilemakerEmailCampaignEvent): string => {
      const deliveryId = normalizeString(event.deliveryId);
      if (deliveryId) return `delivery:${deliveryId}`;
      const runId = normalizeString(event.runId) || 'runless';
      const targetUrl = normalizeString(event.targetUrl) || 'targetless';
      return `event:${runId}:${targetUrl}:${event.id}`;
    })
  );
  return keys.size;
};

export const toSortedLatestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
  null;

export const toSortedOldestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(left) - Date.parse(right))[0] ??
  null;

export const resolveEmailDomain = (emailAddress: string | null | undefined): string => {
  const normalized = normalizeString(emailAddress).toLowerCase();
  if (!normalized) return 'unknown';
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalized.length - 1) return 'unknown';
  return normalized.slice(atIndex + 1);
};

export const resolveDeliverabilityAlertLevel = (input: {
  bounceRatePercent: number;
  failureRatePercent: number;
  queuedCount: number;
  oldestQueuedAgeMinutes?: number | null;
}): FilemakerEmailCampaignDeliverabilityHealthLevel => {
  const oldestQueuedAgeMinutes = input.oldestQueuedAgeMinutes ?? null;

  if (
    input.bounceRatePercent >= 10 ||
    input.failureRatePercent >= 25 ||
    (input.queuedCount > 0 && oldestQueuedAgeMinutes != null && oldestQueuedAgeMinutes >= 180)
  ) {
    return 'critical';
  }

  if (
    input.bounceRatePercent >= 3 ||
    input.failureRatePercent >= 10 ||
    input.queuedCount > 0 ||
    (input.queuedCount > 0 && oldestQueuedAgeMinutes != null && oldestQueuedAgeMinutes >= 30)
  ) {
    return 'warning';
  }

  return 'healthy';
};

export const mapDeliveryStatusToActivityType = (
  status: FilemakerEmailCampaignDelivery['status']
): FilemakerEmailCampaignRecipientActivityType | null => {
  if (status === 'sent') return 'delivery_sent';
  if (status === 'failed') return 'delivery_failed';
  if (status === 'bounced') return 'delivery_bounced';
  return null;
};

export const isRecipientActivityType = (
  type: FilemakerEmailCampaignEvent['type']
): type is FilemakerEmailCampaignRecipientActivityType =>
  type === 'delivery_sent' ||
  type === 'delivery_failed' ||
  type === 'delivery_bounced' ||
  type === 'opened' ||
  type === 'clicked' ||
  type === 'unsubscribed' ||
  type === 'resubscribed';
