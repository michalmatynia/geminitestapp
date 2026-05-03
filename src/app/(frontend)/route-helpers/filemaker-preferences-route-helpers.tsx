import 'server-only';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  getFilemakerEmailCampaignSuppressionByAddress,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  summarizeFilemakerEmailCampaignRecipientActivity,
  FilemakerCampaignPreferencesPage,
} from '@/features/filemaker/public';
import {
  readFilemakerCampaignSettingValue,
  parseFilemakerCampaignUnsubscribeToken,
} from '@/features/filemaker/server';

import type { Metadata } from 'next';
import type { JSX } from 'react';
import type { FilemakerEmailCampaignSuppressionEntry } from '@/features/filemaker/public';

type FilemakerPreferencesRouteOptions = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | null => {
  const value = searchParams?.[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
    return typeof first === 'string' ? first.trim() : null;
  }
  return null;
};

export const generateFilemakerPreferencesMetadata = (): Metadata => ({
  title: 'Manage Filemaker campaign email preferences',
  description: 'Review and update recipient delivery preferences for Filemaker campaigns.',
});

function resolveInitialStatus(suppressionEntry: FilemakerEmailCampaignSuppressionEntry | null): 'subscribed' | 'unsubscribed' | 'blocked' {
  if (suppressionEntry === null) return 'subscribed';
  if (suppressionEntry.reason === 'unsubscribed') return 'unsubscribed';
  return 'blocked';
}

export const renderFilemakerPreferencesRoute = async ({
  searchParams,
}: FilemakerPreferencesRouteOptions = {}): Promise<JSX.Element> => {
  const token = readSearchParamValue(searchParams, 'token');
  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(token);

  if (tokenPayload === null) {
    return (
      <FilemakerCampaignPreferencesPage
        initialEmailAddress={readSearchParamValue(searchParams, 'email')}
        initialCampaignId={readSearchParamValue(searchParams, 'campaignId')}
        initialScope='campaign'
        initialToken={token}
        hasValidSignedToken={false}
      />
    );
  }

  const [campaignsRaw, deliveriesRaw, eventsRaw, suppressionsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
  ]);
  const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
  const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw);
  const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
  const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw);
  const suppressionEntry = getFilemakerEmailCampaignSuppressionByAddress(
    suppressionRegistry,
    tokenPayload.emailAddress
  );
  
  const initialStatus = resolveInitialStatus(suppressionEntry);

  return (
    <FilemakerCampaignPreferencesPage
      initialEmailAddress={tokenPayload.emailAddress}
      initialCampaignId={tokenPayload.campaignId}
      initialScope={tokenPayload.scope}
      initialToken={token}
      hasValidSignedToken
      initialStatus={initialStatus}
      initialReason={suppressionEntry?.reason ?? null}
      canResubscribe={suppressionEntry?.reason === 'unsubscribed'}
      initialRecipientSummary={summarizeFilemakerEmailCampaignRecipientActivity({
        emailAddress: tokenPayload.emailAddress,
        campaignId: tokenPayload.scope === 'all_campaigns' ? null : tokenPayload.campaignId,
        campaignRegistry,
        deliveryRegistry,
        eventRegistry,
      })}
    />
  );
};
