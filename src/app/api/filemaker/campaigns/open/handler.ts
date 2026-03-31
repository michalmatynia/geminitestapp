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
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

const buildTransparentPixelResponse = (): Response =>
  new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'content-type': 'image/gif',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      pragma: 'no-cache',
      expires: '0',
    },
  });

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const token = req.nextUrl.searchParams.get('token');
  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(token);
  if (!tokenPayload?.campaignId) {
    return buildTransparentPixelResponse();
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
    if (!campaign) {
      return buildTransparentPixelResponse();
    }

    const alreadyTracked = eventRegistry.events.some((event) => {
      if (event.type !== 'opened' || event.campaignId !== campaign.id) {
        return false;
      }
      if (tokenPayload.deliveryId) {
        return event.deliveryId === tokenPayload.deliveryId;
      }
      if (tokenPayload.runId) {
        return event.runId === tokenPayload.runId;
      }
      return false;
    });

    if (!alreadyTracked) {
      const nextEventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
        version: eventRegistry.version,
        events: eventRegistry.events.concat(
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: tokenPayload.runId,
            deliveryId: tokenPayload.deliveryId,
            type: 'opened',
            actor: 'recipient',
            message: `${tokenPayload.emailAddress} opened the campaign email.`,
          })
        ),
      });

      await upsertFilemakerCampaignSettingValue(
        FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry))
      );
    }
  } catch {
    return buildTransparentPixelResponse();
  }

  return buildTransparentPixelResponse();
}
