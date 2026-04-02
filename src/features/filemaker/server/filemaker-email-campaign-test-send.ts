import 'server-only';

import { randomUUID } from 'crypto';

import { createFilemakerEmailCampaign } from '../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignTestSendResponse,
} from '../types';
import { sendFilemakerCampaignEmail } from './campaign-email-delivery';
import {
  assertCampaignReadyForDelivery,
  resolveCampaignBodyText,
} from './campaign-runtime/runtime-utils';

const resolveTestSendBaseUrl = (): string => {
  const configured = process.env['NEXT_PUBLIC_APP_URL']?.trim();
  if (configured) {
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

const applyCampaignTestTemplateTokens = (
  value: string | null | undefined,
  input: {
    recipientEmail: string;
    unsubscribeUrl: string;
    preferencesUrl: string;
    manageAllPreferencesUrl: string;
    openTrackingUrl: string;
  }
): string | null => {
  if (!value) return null;
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
    .join('')
    .split('{{email}}')
    .join(input.recipientEmail)
    .replace(/\{\{click_tracking_url:([^}]+)\}\}/gu, (_match: string, destination: string): string =>
      destination.trim()
    );
};

export const sendFilemakerEmailCampaignTest = async (input: {
  campaign: FilemakerEmailCampaign;
  recipientEmail: string;
}): Promise<FilemakerEmailCampaignTestSendResponse> => {
  const campaign = createFilemakerEmailCampaign(input.campaign);
  const recipientEmail = input.recipientEmail.trim().toLowerCase();

  assertCampaignReadyForDelivery(campaign, 'live');

  const baseUrl = resolveTestSendBaseUrl();
  const unsubscribeUrl = buildCampaignTestPreviewUrl({
    baseUrl,
    campaignId: campaign.id,
    action: 'unsubscribe',
  });
  const preferencesUrl = buildCampaignTestPreviewUrl({
    baseUrl,
    campaignId: campaign.id,
    action: 'preferences',
  });
  const manageAllPreferencesUrl = buildCampaignTestPreviewUrl({
    baseUrl,
    campaignId: campaign.id,
    action: 'manage_all_preferences',
  });
  const openTrackingUrl = buildCampaignTestPreviewUrl({
    baseUrl,
    campaignId: campaign.id,
    action: 'open_tracking',
  });

  const text = applyCampaignTestTemplateTokens(resolveCampaignBodyText(campaign), {
    recipientEmail,
    unsubscribeUrl,
    preferencesUrl,
    manageAllPreferencesUrl,
    openTrackingUrl,
  });
  const html = applyCampaignTestTemplateTokens(campaign.bodyHtml ?? null, {
    recipientEmail,
    unsubscribeUrl,
    preferencesUrl,
    manageAllPreferencesUrl,
    openTrackingUrl,
  });

  const result = await sendFilemakerCampaignEmail({
    to: recipientEmail,
    subject: campaign.subject.trim(),
    text: text ?? '',
    html,
    campaignId: campaign.id,
    runId: `filemaker-email-campaign-test-run-${randomUUID()}`,
    deliveryId: `filemaker-email-campaign-test-delivery-${randomUUID()}`,
    mailAccountId: campaign.mailAccountId ?? null,
    replyToEmail: campaign.replyToEmail ?? null,
    fromName: campaign.fromName ?? null,
  });

  return {
    campaignId: campaign.id,
    recipientEmail,
    provider: result.provider,
    providerMessage: result.providerMessage,
    sentAt: result.sentAt,
  };
};
