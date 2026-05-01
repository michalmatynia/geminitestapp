import 'server-only';

import { randomUUID } from 'crypto';

import { badRequestError } from '@/shared/errors/app-error';

import {
  createFilemakerEmailCampaign,
  parseFilemakerDatabase,
  resolveFilemakerCampaignContentBodyText,
  resolveFilemakerCampaignContentForRecipient,
  assertFilemakerCampaignContentReadyForDelivery,
} from '../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignTestSendResponse,
} from '../types';
import { sendFilemakerCampaignEmail } from './campaign-email-delivery';
import {
  appendManagedCampaignPreferenceFooter,
  assertCampaignReadyForDelivery,
} from './campaign-runtime/runtime-utils';

type CampaignTestTemplateUrls = {
  unsubscribeUrl: string;
  preferencesUrl: string;
  manageAllPreferencesUrl: string;
  openTrackingUrl: string;
};

const resolveTestSendBaseUrl = (): string => {
  const configured = process.env['NEXT_PUBLIC_APP_URL']?.trim();
  if (configured !== undefined && configured !== '') {
    return configured.replace(/\/+$/u, '');
  }
  return 'http://localhost:3000';
};

const buildCampaignTestPreviewUrl = (input: {
  baseUrl: string;
  campaignId: string;
  action: 'unsubscribe' | 'preferences' | 'manage_all_preferences' | 'open_tracking';
}): string =>
  `${input.baseUrl}/admin/filemaker/campaigns?preview=test-send&campaignId=${encodeURIComponent(
    input.campaignId
  )}&action=${encodeURIComponent(input.action)}`;

const buildCampaignTestTemplateUrls = (
  baseUrl: string,
  campaignId: string
): CampaignTestTemplateUrls => ({
  unsubscribeUrl: buildCampaignTestPreviewUrl({ baseUrl, campaignId, action: 'unsubscribe' }),
  preferencesUrl: buildCampaignTestPreviewUrl({ baseUrl, campaignId, action: 'preferences' }),
  manageAllPreferencesUrl: buildCampaignTestPreviewUrl({
    baseUrl,
    campaignId,
    action: 'manage_all_preferences',
  }),
  openTrackingUrl: buildCampaignTestPreviewUrl({ baseUrl, campaignId, action: 'open_tracking' }),
});

const applyCampaignTestTemplateTokens = (
  value: string | null | undefined,
  input: CampaignTestTemplateUrls & {
    recipientEmail: string;
    htmlMode: boolean;
  }
): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return appendManagedCampaignPreferenceFooter(value, {
    unsubscribeUrl: input.unsubscribeUrl,
    preferencesUrl: input.preferencesUrl,
    htmlMode: input.htmlMode,
  })
    .split('{{unsubscribe_url}}')
    .join(input.unsubscribeUrl)
    .split('{{preferences_url}}')
    .join(input.preferencesUrl)
    .split('{{manage_all_preferences_url}}')
    .join(input.manageAllPreferencesUrl)
    .split('{{open_tracking_url}}')
    .join(input.openTrackingUrl)
    .split('{{open_tracking_pixel}}')
    .join('')
    .split('{{email}}')
    .join(input.recipientEmail)
    .replace(/\{\{click_tracking_url:([^}]+)\}\}/gu, (_match: string, destination: string): string =>
      destination.trim()
    );
};

const assertCampaignTestReady = (
  campaign: FilemakerEmailCampaign,
  contentGroupRegistry: FilemakerEmailCampaignContentGroupRegistry | undefined
): void => {
  const contentGroupId = campaign.contentGroupId ?? '';
  if (contentGroupId !== '') {
    assertFilemakerCampaignContentReadyForDelivery({ campaign, contentGroupRegistry });
    return;
  }
  assertCampaignReadyForDelivery(campaign, 'live');
};

const sendCampaignTestEmail = async (input: {
  campaign: FilemakerEmailCampaign;
  content: ReturnType<typeof resolveFilemakerCampaignContentForRecipient>;
  recipientEmail: string;
  templateUrls: CampaignTestTemplateUrls;
}): ReturnType<typeof sendFilemakerCampaignEmail> => {
  const text = applyCampaignTestTemplateTokens(resolveFilemakerCampaignContentBodyText(input.content), {
    recipientEmail: input.recipientEmail,
    ...input.templateUrls,
    htmlMode: false,
  });
  const html = applyCampaignTestTemplateTokens(input.content.bodyHtml ?? null, {
    recipientEmail: input.recipientEmail,
    ...input.templateUrls,
    htmlMode: true,
  });
  return sendFilemakerCampaignEmail({
    to: input.recipientEmail,
    subject: input.content.subject.trim(),
    text: text ?? '',
    html,
    campaignId: input.campaign.id,
    runId: `filemaker-email-campaign-test-run-${randomUUID()}`,
    deliveryId: `filemaker-email-campaign-test-delivery-${randomUUID()}`,
    mailAccountId: input.campaign.mailAccountId ?? null,
    replyToEmail: input.campaign.replyToEmail ?? null,
    fromName: input.campaign.fromName ?? null,
  });
};

export const sendFilemakerEmailCampaignTest = async (input: {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry;
  contentVariantId?: string | null;
  recipientEmail: string;
}): Promise<FilemakerEmailCampaignTestSendResponse> => {
  const campaign = createFilemakerEmailCampaign(input.campaign);
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if ((campaign.mailAccountId ?? '').trim().length === 0) {
    throw badRequestError('Campaign must have an email account assigned before sending a test.');
  }

  assertCampaignTestReady(campaign, input.contentGroupRegistry);
  const content = resolveFilemakerCampaignContentForRecipient({
    campaign,
    contentGroupRegistry: input.contentGroupRegistry,
    database: parseFilemakerDatabase(null),
    partyKind: 'organization',
    partyId: '',
    contentVariantId: input.contentVariantId ?? null,
  });

  const templateUrls = buildCampaignTestTemplateUrls(resolveTestSendBaseUrl(), campaign.id);

  const result = await sendCampaignTestEmail({ campaign, content, recipientEmail, templateUrls });

  return {
    campaignId: campaign.id,
    recipientEmail,
    provider: result.provider,
    providerMessage: result.providerMessage,
    sentAt: result.sentAt,
  };
};
