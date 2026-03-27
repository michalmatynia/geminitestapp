import 'server-only';

import { FilemakerCampaignUnsubscribePage } from '@/features/filemaker/pages/FilemakerCampaignUnsubscribePage';
import { parseFilemakerCampaignUnsubscribeToken } from '@/features/filemaker/server/campaign-unsubscribe-token';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type FilemakerUnsubscribeRouteOptions = {
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

export const generateFilemakerUnsubscribeMetadata = async (): Promise<Metadata> => ({
  title: 'Unsubscribe from Filemaker campaign emails',
  description: 'Remove an email address from future Filemaker campaign sends.',
});

export const renderFilemakerUnsubscribeRoute = async ({
  searchParams,
}: FilemakerUnsubscribeRouteOptions = {}): Promise<JSX.Element> => {
  const token = readSearchParamValue(searchParams, 'token');
  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(token);

  return (
    <FilemakerCampaignUnsubscribePage
      initialEmailAddress={tokenPayload?.emailAddress ?? readSearchParamValue(searchParams, 'email')}
      initialCampaignId={tokenPayload?.campaignId ?? readSearchParamValue(searchParams, 'campaignId')}
      initialToken={token}
      hasValidSignedToken={Boolean(tokenPayload)}
    />
  );
};
