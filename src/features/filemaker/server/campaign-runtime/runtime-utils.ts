import { badRequestError } from '@/shared/errors/app-error';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignRunMode,
} from '../../types';
import { buildFilemakerMailPlainText } from '../../mail-utils';
import { buildProgressSummary } from '../campaign-runtime.helpers';
import { buildFilemakerCampaignClickTrackingUrl } from '../campaign-unsubscribe-token';
import { resolveRecipientDomainProviderBucket } from './recipient-domain';

export const resolveFailureStatus = (
  failureCategory: 'soft_bounce' | 'hard_bounce' | 'invalid_recipient' | 'provider_rejected' | 'rate_limited' | 'timeout' | 'unknown'
): FilemakerEmailCampaignDeliveryAttempt['status'] =>
  failureCategory === 'soft_bounce' ||
  failureCategory === 'hard_bounce' ||
  failureCategory === 'invalid_recipient'
    ? 'bounced'
    : 'failed';

export const isFilemakerEmailCampaignPermanentFailureCategory = (
  failureCategory:
    | 'soft_bounce'
    | 'hard_bounce'
    | 'invalid_recipient'
    | 'provider_rejected'
    | 'rate_limited'
    | 'timeout'
    | 'unknown'
): boolean => failureCategory === 'hard_bounce' || failureCategory === 'invalid_recipient';

export const resolveCampaignBodyText = (campaign: FilemakerEmailCampaign): string => {
  const text = campaign.bodyText?.trim() ?? '';
  if (text.length > 0) return text;
  const html = campaign.bodyHtml?.trim() ?? '';
  if (html.length > 0) return buildFilemakerMailPlainText(html);
  return '';
};

const CAMPAIGN_PREFERENCE_LINK_TOKENS = [
  '{{unsubscribe_url}}',
  '{{preferences_url}}',
  '{{manage_all_preferences_url}}',
];

const hasCampaignPreferenceLinkToken = (value: string): boolean =>
  CAMPAIGN_PREFERENCE_LINK_TOKENS.some((token) => value.includes(token));

export const appendManagedCampaignPreferenceFooter = (
  value: string,
  input: {
    unsubscribeUrl: string;
    preferencesUrl: string;
    htmlMode: boolean;
  }
): string => {
  if (hasCampaignPreferenceLinkToken(value)) return value;
  if (input.htmlMode) {
    return `${value.trimEnd()}\n<p style="font-size:12px;line-height:1.5;color:#6b7280">Manage your campaign email preferences: <a href="${input.preferencesUrl}">preferences</a> or <a href="${input.unsubscribeUrl}">unsubscribe</a>.</p>`;
  }
  return `${value.trimEnd()}\n\nManage campaign email preferences: ${input.preferencesUrl}\nUnsubscribe: ${input.unsubscribeUrl}`;
};

export const applyCampaignRecipientTemplateTokens = (
  value: string | null | undefined,
  input: {
    emailAddress: string;
    unsubscribeUrl: string;
    preferencesUrl: string;
    manageAllPreferencesUrl: string;
    openTrackingUrl: string;
    campaignId: string;
    runId: string;
    deliveryId: string;
    nowMs: number;
    htmlMode: boolean;
  }
): string | null => {
  if (value === null || value === undefined || value.length === 0) return null;
  const openTrackingPixel = input.htmlMode
    ? `<img src="${input.openTrackingUrl}" alt="" width="1" height="1" style="display:none" />`
    : '';
  return appendManagedCampaignPreferenceFooter(value, input)
    .split('{{unsubscribe_url}}')
    .join(input.unsubscribeUrl)
    .split('{{preferences_url}}')
    .join(input.preferencesUrl)
    .split('{{manage_all_preferences_url}}')
    .join(input.manageAllPreferencesUrl)
    .split('{{open_tracking_url}}')
    .join(input.openTrackingUrl)
    .split('{{open_tracking_pixel}}')
    .join(openTrackingPixel)
    .split('{{email}}')
    .join(input.emailAddress)
    .replace(
      /\{\{click_tracking_url:([^}]+)\}\}/g,
      (_match: string, destination: string): string => {
        const normalizedDestination = destination.trim();
        if (normalizedDestination.length === 0) return '';
        return buildFilemakerCampaignClickTrackingUrl({
          emailAddress: input.emailAddress,
          campaignId: input.campaignId,
          runId: input.runId,
          deliveryId: input.deliveryId,
          redirectTo: normalizedDestination,
          now: input.nowMs,
        });
      }
    );
};

export const FILEMAKER_CAMPAIGN_DOMAIN_GUARD_MIN_DECIDED = 3;
export const FILEMAKER_CAMPAIGN_DOMAIN_GUARD_FAILURE_RATE_PERCENT = 50;
export const FILEMAKER_CAMPAIGN_DOMAIN_GUARD_ATTEMPT_WINDOW_MS = 60 * 60_000;
export const FILEMAKER_CAMPAIGN_DOMAIN_GUARD_RETRY_DELAY_MS = 15 * 60_000;

type DomainGuardDecisionStatus = 'sent' | 'failed' | 'bounced';

const isDomainGuardDecidedStatus = (
  status:
    | FilemakerEmailCampaignDelivery['status']
    | FilemakerEmailCampaignDeliveryAttempt['status']
): status is DomainGuardDecisionStatus =>
  status === 'sent' || status === 'failed' || status === 'bounced';

const isDomainGuardFailedStatus = (status: DomainGuardDecisionStatus): boolean =>
  status === 'failed' || status === 'bounced';

const isWithinDomainGuardAttemptWindow = (input: {
  attempt: FilemakerEmailCampaignDeliveryAttempt;
  nowMs: number | undefined;
  attemptWindowMs: number;
}): boolean => {
  if (input.nowMs === undefined) return true;
  const attemptedAt = input.attempt.attemptedAt ?? input.attempt.createdAt;
  const attemptedAtMs = Date.parse(attemptedAt);
  if (!Number.isFinite(attemptedAtMs)) return true;
  return input.nowMs - attemptedAtMs <= input.attemptWindowMs;
};

const isWithinDomainGuardDeliveryWindow = (input: {
  delivery: FilemakerEmailCampaignDelivery;
  nowMs: number | undefined;
  attemptWindowMs: number;
}): boolean => {
  if (input.nowMs === undefined) return true;
  const decidedAt =
    input.delivery.sentAt ?? input.delivery.updatedAt ?? input.delivery.createdAt;
  const decidedAtMs = Date.parse(decidedAt);
  if (!Number.isFinite(decidedAtMs)) return true;
  return input.nowMs - decidedAtMs <= input.attemptWindowMs;
};

const collectDomainGuardAttemptStatuses = (input: {
  attempts: FilemakerEmailCampaignDeliveryAttempt[] | undefined;
  delivery: FilemakerEmailCampaignDelivery;
  domain: string;
  nowMs: number | undefined;
  attemptWindowMs: number;
  attemptedDeliveryIds: Set<string>;
}): DomainGuardDecisionStatus[] =>
  input.attempts
    ?.filter((attempt) => {
      if (attempt.runId !== input.delivery.runId) return false;
      if (resolveRecipientDomainProviderBucket(attempt.emailAddress) !== input.domain) {
        return false;
      }
      if (
        !isWithinDomainGuardAttemptWindow({
          attempt,
          nowMs: input.nowMs,
          attemptWindowMs: input.attemptWindowMs,
        })
      ) {
        return false;
      }
      input.attemptedDeliveryIds.add(attempt.deliveryId);
      return isDomainGuardDecidedStatus(attempt.status);
    })
    .map((attempt) => attempt.status as DomainGuardDecisionStatus) ?? [];

const collectDomainGuardDeliveryStatuses = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  delivery: FilemakerEmailCampaignDelivery;
  domain: string;
  attemptedDeliveryIds: Set<string>;
  nowMs: number | undefined;
  attemptWindowMs: number;
}): DomainGuardDecisionStatus[] =>
  input.deliveries
    .filter((delivery) => {
      if (delivery.runId !== input.delivery.runId) return false;
      if (input.attemptedDeliveryIds.has(delivery.id)) return false;
      if (resolveRecipientDomainProviderBucket(delivery.emailAddress) !== input.domain) {
        return false;
      }
      if (
        !isWithinDomainGuardDeliveryWindow({
          delivery,
          nowMs: input.nowMs,
          attemptWindowMs: input.attemptWindowMs,
        })
      ) {
        return false;
      }
      return isDomainGuardDecidedStatus(delivery.status);
    })
    .map((delivery) => delivery.status as DomainGuardDecisionStatus);

export const shouldDeferDeliveryForDomainHealth = (input: {
  delivery: FilemakerEmailCampaignDelivery;
  deliveries: FilemakerEmailCampaignDelivery[];
  attempts?: FilemakerEmailCampaignDeliveryAttempt[];
  nowMs?: number;
  minDecided?: number;
  failureRatePercent?: number;
  attemptWindowMs?: number;
}): boolean => {
  const domain = resolveRecipientDomainProviderBucket(input.delivery.emailAddress);
  if (domain.length === 0) return false;
  const attemptWindowMs =
    input.attemptWindowMs ?? FILEMAKER_CAMPAIGN_DOMAIN_GUARD_ATTEMPT_WINDOW_MS;
  const attemptedDeliveryIds = new Set<string>();
  const attemptStatuses = collectDomainGuardAttemptStatuses({
    attempts: input.attempts,
    delivery: input.delivery,
    domain,
    nowMs: input.nowMs,
    attemptWindowMs,
    attemptedDeliveryIds,
  });
  const deliveryStatuses = collectDomainGuardDeliveryStatuses({
    deliveries: input.deliveries,
    delivery: input.delivery,
    domain,
    attemptedDeliveryIds,
    nowMs: input.nowMs,
    attemptWindowMs,
  });
  const decidedStatuses = attemptStatuses.concat(deliveryStatuses);
  const minDecided = input.minDecided ?? FILEMAKER_CAMPAIGN_DOMAIN_GUARD_MIN_DECIDED;
  if (decidedStatuses.length < minDecided) return false;
  const failedCount = decidedStatuses.filter(isDomainGuardFailedStatus).length;
  const failureRate = (failedCount / decidedStatuses.length) * 100;
  const threshold =
    input.failureRatePercent ?? FILEMAKER_CAMPAIGN_DOMAIN_GUARD_FAILURE_RATE_PERCENT;
  return failedCount > 0 && failureRate >= threshold;
};

export const assertCampaignReadyForDelivery = (
  campaign: FilemakerEmailCampaign,
  mode: FilemakerEmailCampaignRunMode
): void => {
  if (mode !== 'live') return;
  if (campaign.subject.trim().length === 0) {
    throw badRequestError('Campaign subject is required before launching a live send.');
  }
  if (resolveCampaignBodyText(campaign).length === 0) {
    throw badRequestError('Campaign body text or HTML is required before launching a live send.');
  }
};

export const FILEMAKER_CAMPAIGN_BOUNCE_CIRCUIT_BREAKER_MIN_SAMPLE_SIZE = 20;

export const shouldPauseRunForBounceRate = (input: {
  campaign: FilemakerEmailCampaign;
  deliveries: FilemakerEmailCampaignDelivery[];
  minSampleSize?: number;
}): boolean => {
  const threshold = input.campaign.launch.pauseOnBounceRatePercent;
  if (threshold === null || threshold === undefined || threshold < 0) return false;
  const minSampleSize =
    input.minSampleSize ?? FILEMAKER_CAMPAIGN_BOUNCE_CIRCUIT_BREAKER_MIN_SAMPLE_SIZE;
  const progress = buildProgressSummary(input.deliveries);
  const decided = progress.sentCount + progress.bouncedCount + progress.failedCount;
  if (decided < minSampleSize) return false;
  if (decided === 0) return false;
  const bounceRate = (progress.bouncedCount / decided) * 100;
  return bounceRate >= threshold;
};

export const applyBounceThresholdToCampaign = (input: {
  campaign: FilemakerEmailCampaign;
  deliveries: FilemakerEmailCampaignDelivery[];
  nowIso: string;
}): FilemakerEmailCampaign => {
  const threshold = input.campaign.launch.pauseOnBounceRatePercent;
  if (threshold === null || threshold === undefined || threshold < 0) {
    return input.campaign;
  }
  const progress = buildProgressSummary(input.deliveries);
  if (progress.totalCount === 0) return input.campaign;
  const bounceRate = (progress.bouncedCount / progress.totalCount) * 100;
  if (bounceRate < threshold) {
    return input.campaign;
  }
  return {
    ...input.campaign,
    status: 'paused',
    lastEvaluatedAt: input.nowIso,
    updatedAt: input.nowIso,
  };
};
