import { type NextRequest } from 'next/server';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  createFilemakerEmailCampaignEvent,
  normalizeFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
} from '@/features/filemaker/server';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from '@/features/filemaker/server';
import { parseFilemakerCampaignUnsubscribeToken } from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { z } from 'zod';

type ClickCampaignRegistry = ReturnType<typeof parseFilemakerEmailCampaignRegistry>;
type ClickCampaignEventRegistry = ReturnType<typeof parseFilemakerEmailCampaignEventRegistry>;
type ClickTrackingPayload = {
  campaignId: string;
  redirectTo: string;
  emailAddress: string;
  runId: string | null;
  deliveryId: string | null;
};

const resolveRedirectTarget = (req: NextRequest, redirectTo: string | null | undefined): string => {
  if (typeof redirectTo !== 'string' || redirectTo.length === 0) {
    return `${new URL(req.url).origin}/`;
  }
  return new URL(redirectTo, req.url).toString();
};

const querySchema = z.object({
  token: optionalTrimmedQueryString(),
});

const buildRedirectResponse = (location: string): Response =>
  /* safe */ new Response(null, {
    status: 307,
    headers: {
      location,
    },
  });

const isPresentString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const isMatchingClickEvent = (
  event: ClickCampaignEventRegistry['events'][number],
  params: {
    campaignId: string;
    deliveryId: string | null;
    runId: string | null;
    redirectTo: string;
  }
): boolean => {
  if (event.type !== 'clicked') return false;
  if (event.campaignId !== params.campaignId) return false;
  if (event.targetUrl !== params.redirectTo) return false;
  if (params.deliveryId !== null && event.deliveryId !== params.deliveryId) return false;
  if (params.runId !== null && event.runId !== params.runId) return false;
  return true;
};

const hasTrackedClickEvent = (params: {
  campaignId: string;
  deliveryId: string | null;
  runId: string | null;
  redirectTo: string;
  eventRegistry: ClickCampaignEventRegistry;
}): boolean => {
  for (const event of params.eventRegistry.events) {
    if (
      isMatchingClickEvent(event, {
        campaignId: params.campaignId,
        deliveryId: params.deliveryId,
        runId: params.runId,
        redirectTo: params.redirectTo,
      })
    ) {
      return true;
    }
  }
  return false;
};

const findCampaignById = (
  campaignRegistry: ClickCampaignRegistry,
  campaignId: string
): ClickCampaignRegistry['campaigns'][number] | null => {
  for (const campaign of campaignRegistry.campaigns) {
    if (campaign.id === campaignId) {
      return campaign;
    }
  }
  return null;
};

const upsertClickEvent = async (params: {
  campaignId: string;
  eventRegistry: ClickCampaignEventRegistry;
  runId: string | null;
  deliveryId: string | null;
  redirectTo: string;
  emailAddress: string;
}): Promise<void> => {
  const nextEventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
    version: params.eventRegistry.version,
    events: params.eventRegistry.events.concat(
      createFilemakerEmailCampaignEvent({
        campaignId: params.campaignId,
        runId: params.runId,
        deliveryId: params.deliveryId,
        type: 'clicked',
        actor: 'recipient',
        targetUrl: params.redirectTo,
        message: `${params.emailAddress} clicked ${params.redirectTo}.`,
      })
    ),
  });
  await upsertFilemakerCampaignSettingValue(
    FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
    JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry))
  );
};

const resolvePayload = (
  tokenPayload: ReturnType<typeof parseFilemakerCampaignUnsubscribeToken> | null
): ClickTrackingPayload | null =>
  tokenPayload === null ||
  !isPresentString(tokenPayload.campaignId) ||
  !isPresentString(tokenPayload.redirectTo)
    ? null
    : {
        campaignId: tokenPayload.campaignId,
        redirectTo: tokenPayload.redirectTo,
        emailAddress: tokenPayload.emailAddress,
        runId: tokenPayload.runId,
        deliveryId: tokenPayload.deliveryId,
      };

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { token } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(token ?? null);
  const payload = resolvePayload(tokenPayload);
  const redirectTarget = resolveRedirectTarget(req, tokenPayload?.redirectTo);
  if (payload === null) {
    return buildRedirectResponse(redirectTarget);
  }

  try {
    const [campaignsRaw, eventsRaw] = await Promise.all([
      readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
      readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
    ]);
    const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
    const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
    const campaign = findCampaignById(campaignRegistry, payload.campaignId);
    if (campaign === null) {
      return buildRedirectResponse(redirectTarget);
    }

    const alreadyTracked = hasTrackedClickEvent({
      campaignId: campaign.id,
      deliveryId: payload.deliveryId,
      runId: payload.runId,
      redirectTo: payload.redirectTo,
      eventRegistry,
    });
    if (alreadyTracked) {
      return buildRedirectResponse(redirectTarget);
    }

    await upsertClickEvent({
      campaignId: campaign.id,
      eventRegistry,
      runId: payload.runId,
      deliveryId: payload.deliveryId,
      redirectTo: payload.redirectTo,
      emailAddress: payload.emailAddress,
    });
  } catch {
    return buildRedirectResponse(redirectTarget);
  }

  return buildRedirectResponse(redirectTarget);
}
