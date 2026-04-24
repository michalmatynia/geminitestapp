import {
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
} from './campaign-unsubscribe-token';
import type { FilemakerCampaignEmailDeliveryRecord } from './campaign-email-delivery';
import {
  applyCampaignRecipientTemplateTokens,
  resolveCampaignBodyText,
} from './campaign-runtime/runtime-utils';
import type { RepairRecordInput } from './campaign-mail-filing-repair.types';

type RepairTokenInput = Omit<
  Parameters<typeof applyCampaignRecipientTemplateTokens>[1],
  'htmlMode'
> & { now: number };

const resolveRepairTimestamp = (input: RepairRecordInput): { iso: string; ms: number } => {
  const candidate =
    input.delivery.sentAt ??
    input.delivery.updatedAt ??
    input.run.completedAt ??
    input.run.updatedAt ??
    input.run.startedAt;
  const parsed = Date.parse(candidate ?? '');
  if (Number.isFinite(parsed)) {
    return { iso: new Date(parsed).toISOString(), ms: parsed };
  }
  const now = Date.now();
  return { iso: new Date(now).toISOString(), ms: now };
};

const buildRepairTokenInput = (
  input: RepairRecordInput,
  timestampMs: number
): RepairTokenInput => {
  const common = {
    emailAddress: input.delivery.emailAddress,
    campaignId: input.campaign.id,
    runId: input.run.id,
    deliveryId: input.delivery.id,
    now: timestampMs,
  };
  return {
    ...common,
    unsubscribeUrl: buildFilemakerCampaignUnsubscribeUrl(common),
    preferencesUrl: buildFilemakerCampaignPreferencesUrl(common),
    manageAllPreferencesUrl: buildFilemakerCampaignManageAllPreferencesUrl(common),
    openTrackingUrl: buildFilemakerCampaignOpenTrackingUrl(common),
    nowMs: timestampMs,
  };
};

export const buildRepairDeliveryRecord = (
  input: RepairRecordInput
): FilemakerCampaignEmailDeliveryRecord => {
  const timestamp = resolveRepairTimestamp(input);
  const tokenInput = buildRepairTokenInput(input, timestamp.ms);
  return {
    to: input.delivery.emailAddress,
    subject: input.campaign.subject,
    text:
      applyCampaignRecipientTemplateTokens(resolveCampaignBodyText(input.campaign), {
        ...tokenInput,
        htmlMode: false,
      }) ?? '',
    html: applyCampaignRecipientTemplateTokens(input.campaign.bodyHtml ?? null, {
      ...tokenInput,
      htmlMode: true,
    }),
    campaignId: input.campaign.id,
    runId: input.run.id,
    deliveryId: input.delivery.id,
    mailAccountId: input.campaign.mailAccountId,
    replyToEmail: input.campaign.replyToEmail,
    fromName: input.campaign.fromName,
    sentAt: timestamp.iso,
  };
};
