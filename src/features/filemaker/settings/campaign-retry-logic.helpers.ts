import { normalizeString } from '../filemaker-settings.helpers';
import {
  type FilemakerEmailCampaignDelivery,
  type FilemakerEmailCampaignDeliveryAttemptRegistry,
} from '../types';
import {
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
} from './campaign-factories.constants';
import {
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry,
  getFilemakerEmailCampaignDeliveryAttemptsForDelivery,
} from './campaign-delivery-attempt-factories.helpers';

export const isFilemakerEmailCampaignRetryableFailureCategory = (
  category: FilemakerEmailCampaignDelivery['failureCategory']
): boolean =>
  category === 'soft_bounce' ||
  category === 'provider_rejected' ||
  category === 'rate_limited' ||
  category === 'timeout' ||
  category === 'unknown';

export const resolveFilemakerEmailCampaignRetryDelayForAttemptCount = (
  attemptCount: number
): number => {
  if (attemptCount <= 1) return 60_000;
  if (attemptCount === 2) return 5 * 60_000;
  if (attemptCount === 3) return 15 * 60_000;
  return 60 * 60_000;
};

const resolveFilemakerEmailCampaignNextRetryAtMs = (
  delivery: FilemakerEmailCampaignDelivery
): number | null => {
  const nextRetryAt = normalizeString(delivery.nextRetryAt);
  if (nextRetryAt.length === 0) return null;
  const parsed = Date.parse(nextRetryAt);
  return Number.isFinite(parsed) ? parsed : null;
};

const isFilemakerEmailCampaignDeliveryRetryDue = (
  delivery: FilemakerEmailCampaignDelivery,
  nowMs: number | undefined
): boolean => {
  if (nowMs === undefined) return true;
  const nextRetryAtMs = resolveFilemakerEmailCampaignNextRetryAtMs(delivery);
  if (nextRetryAtMs === null) return true;
  return nextRetryAtMs <= nowMs;
};

export const resolveFilemakerEmailCampaignRetryableDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
  nowMs?: number;
}): {
  retryableDeliveries: FilemakerEmailCampaignDelivery[];
  exhaustedDeliveries: FilemakerEmailCampaignDelivery[];
} => {
  const maxAttempts = input.maxAttempts ?? FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS;
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry);
  const retryableDeliveries: FilemakerEmailCampaignDelivery[] = [];
  const exhaustedDeliveries: FilemakerEmailCampaignDelivery[] = [];

  input.deliveries.forEach((delivery: FilemakerEmailCampaignDelivery) => {
    if (
      (delivery.status !== 'failed' && delivery.status !== 'bounced') ||
      !isFilemakerEmailCampaignRetryableFailureCategory(delivery.failureCategory)
    ) {
      return;
    }

    const attempts = getFilemakerEmailCampaignDeliveryAttemptsForDelivery(
      attemptRegistry,
      delivery.id
    );
    const attemptCount = attempts.length;
    if (attemptCount < maxAttempts) {
      if (!isFilemakerEmailCampaignDeliveryRetryDue(delivery, input.nowMs)) return;
      retryableDeliveries.push(delivery);
      return;
    }
    exhaustedDeliveries.push(delivery);
  });

  return { retryableDeliveries, exhaustedDeliveries };
};

export const resolveFilemakerEmailCampaignRetryDelayMs = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
  nowMs?: number;
}): number | null => {
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
    ...input,
    nowMs: undefined,
  });
  if (retrySummary.retryableDeliveries.length === 0) return null;
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry);
  return retrySummary.retryableDeliveries.reduce<number | null>((smallestDelay, delivery) => {
    const attempts = getFilemakerEmailCampaignDeliveryAttemptsForDelivery(
      attemptRegistry,
      delivery.id
    );
    const attemptCount = attempts.length;
    const nextRetryAtMs = resolveFilemakerEmailCampaignNextRetryAtMs(delivery);
    const nextDelay =
      input.nowMs !== undefined && nextRetryAtMs !== null
        ? Math.max(0, nextRetryAtMs - input.nowMs)
        : resolveFilemakerEmailCampaignRetryDelayForAttemptCount(attemptCount);
    if (smallestDelay === null) return nextDelay;
    return Math.min(smallestDelay, nextDelay);
  }, null);
};
