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
  if (!value) return null;
  const openTrackingPixel = input.htmlMode
    ? `<img src="${input.openTrackingUrl}" alt="" width="1" height="1" style="display:none" />`
    : '';
  return value
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
    .replace(/\{\{click_tracking_url:([^}]+)\}\}/g, (_match: string, destination: string): string => {
      const normalizedDestination = destination.trim();
      if (!normalizedDestination) return '';
      return buildFilemakerCampaignClickTrackingUrl({
        emailAddress: input.emailAddress,
        campaignId: input.campaignId,
        runId: input.runId,
        deliveryId: input.deliveryId,
        redirectTo: normalizedDestination,
        now: input.nowMs,
      });
    });
};

export const assertCampaignReadyForDelivery = (
  campaign: FilemakerEmailCampaign,
  mode: FilemakerEmailCampaignRunMode
): void => {
  if (mode !== 'live') return;
  if (!campaign.subject.trim()) {
    throw badRequestError('Campaign subject is required before launching a live send.');
  }
  if (!resolveCampaignBodyText(campaign)) {
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
  if (threshold == null || threshold < 0) return false;
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
  if (threshold == null || threshold < 0) {
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
