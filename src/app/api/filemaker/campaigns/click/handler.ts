import { NextRequest } from 'next/server';

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

const resolveRedirectTarget = (req: NextRequest, redirectTo: string | null | undefined): string => {
  if (!redirectTo) {
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

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { token } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(token ?? null);
  const redirectTarget = resolveRedirectTarget(req, tokenPayload?.redirectTo);
  if (!tokenPayload?.campaignId || !tokenPayload.redirectTo) {
    return buildRedirectResponse(redirectTarget);
  }

  try {
    const [campaignsRaw, eventsRaw] = await Promise.all([
      readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
      readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
    ]);
    const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
    const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
    const campaign =
      campaignRegistry.campaigns.find((entry) => entry.id === tokenPayload.campaignId) ?? null;
    if (campaign) {
      const alreadyTracked = eventRegistry.events.some((event) => {
        if (event.type !== 'clicked' || event.campaignId !== campaign.id) {
          return false;
        }
        if (tokenPayload.deliveryId && event.deliveryId !== tokenPayload.deliveryId) {
          return false;
        }
        if (tokenPayload.runId && event.runId !== tokenPayload.runId) {
          return false;
        }
        return event.targetUrl === tokenPayload.redirectTo;
      });

      if (!alreadyTracked) {
        const nextEventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
          version: eventRegistry.version,
          events: eventRegistry.events.concat(
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: tokenPayload.runId,
              deliveryId: tokenPayload.deliveryId,
              type: 'clicked',
              actor: 'recipient',
              targetUrl: tokenPayload.redirectTo,
              message: `${tokenPayload.emailAddress} clicked ${tokenPayload.redirectTo}.`,
            })
          ),
        });

        await upsertFilemakerCampaignSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
          JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry))
        );
      }
    }
  } catch {
    return buildRedirectResponse(redirectTarget);
  }

  return buildRedirectResponse(redirectTarget);
}
