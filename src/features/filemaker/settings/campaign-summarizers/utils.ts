import { normalizeString } from '../../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
} from '../../types';
import type {
  FilemakerEmailCampaignDeliverabilityHealthLevel,
  FilemakerEmailCampaignRecipientActivityType,
} from '../../types/campaigns';

export const roundPercentage = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
};

const hasTextValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.length > 0;

const withFallback = (value: string, fallback: string): string =>
  value.length > 0 ? value : fallback;

export const summarizeUniqueDeliveryEventCount = (
  events: FilemakerEmailCampaignEvent[]
): number => {
  if (events.length === 0) return 0;
  const keys = new Set(
    events.map((event: FilemakerEmailCampaignEvent): string => {
      const deliveryId = normalizeString(event.deliveryId);
      if (deliveryId.length > 0) return `delivery:${deliveryId}`;
      const runId = withFallback(normalizeString(event.runId), 'runless');
      const targetUrl = withFallback(normalizeString(event.targetUrl), 'targetless');
      return `event:${runId}:${targetUrl}:${event.id}`;
    })
  );
  return keys.size;
};

export const toSortedLatestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter(hasTextValue)
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
  null;

export const toSortedOldestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter(hasTextValue)
    .sort((left: string, right: string): number => Date.parse(left) - Date.parse(right))[0] ??
  null;

export const resolveEmailDomain = (emailAddress: string | null | undefined): string => {
  const normalized = normalizeString(emailAddress).toLowerCase();
  if (normalized.length === 0) return 'unknown';
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalized.length - 1) return 'unknown';
  return normalized.slice(atIndex + 1);
};

const hasQueueOlderThan = (
  queuedCount: number,
  oldestQueuedAgeMinutes: number | null,
  thresholdMinutes: number
): boolean =>
  queuedCount > 0 &&
  oldestQueuedAgeMinutes !== null &&
  oldestQueuedAgeMinutes >= thresholdMinutes;

const hasCriticalDeliverabilityAlert = (
  input: {
    bounceRatePercent: number;
    failureRatePercent: number;
    queuedCount: number;
  },
  oldestQueuedAgeMinutes: number | null
): boolean => {
  if (input.bounceRatePercent >= 10) return true;
  if (input.failureRatePercent >= 25) return true;
  return hasQueueOlderThan(input.queuedCount, oldestQueuedAgeMinutes, 180);
};

const hasWarningDeliverabilityAlert = (input: {
  bounceRatePercent: number;
  failureRatePercent: number;
  queuedCount: number;
}): boolean => {
  if (input.bounceRatePercent >= 3) return true;
  if (input.failureRatePercent >= 10) return true;
  return input.queuedCount > 0;
};

export const resolveDeliverabilityAlertLevel = (input: {
  bounceRatePercent: number;
  failureRatePercent: number;
  queuedCount: number;
  oldestQueuedAgeMinutes?: number | null;
}): FilemakerEmailCampaignDeliverabilityHealthLevel => {
  const oldestQueuedAgeMinutes = input.oldestQueuedAgeMinutes ?? null;

  if (hasCriticalDeliverabilityAlert(input, oldestQueuedAgeMinutes)) {
    return 'critical';
  }

  if (hasWarningDeliverabilityAlert(input)) {
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
