import { NextRequest, NextResponse } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';
import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignSuppressionEntry,
  getFilemakerEmailCampaignSuppressionByAddress,
  normalizeFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
  parseFilemakerCampaignUnsubscribeToken,
  type FilemakerEmailCampaignUnsubscribeRequest,
  type FilemakerEmailCampaignUnsubscribeResponse,
} from '@/features/filemaker/server';
import { filemakerEmailCampaignUnsubscribeRequestSchema } from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const buildUnsubscribeNotes = (source: string | null | undefined): string =>
  source?.trim()
    ? `Self-service unsubscribe request. Source: ${source.trim()}`
    : 'Self-service unsubscribe request.';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result: JsonParseResult<FilemakerEmailCampaignUnsubscribeRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignUnsubscribeRequestSchema,
    { logPrefix: 'filemaker.campaigns.unsubscribe.POST' }
  );
  if (!result.ok) {
    return result.response;
  }

  const tokenPayload = result.data.token
    ? parseFilemakerCampaignUnsubscribeToken(result.data.token)
    : null;
  if (result.data.token && !tokenPayload) {
    throw badRequestError('Invalid or expired unsubscribe token.');
  }

  const normalizedEmailAddress = (
    tokenPayload?.emailAddress ??
    result.data.emailAddress?.trim().toLowerCase() ??
    ''
  ).trim();
  const normalizedCampaignId =
    tokenPayload?.campaignId ?? result.data.campaignId?.trim() ?? null;
  const [campaignsRaw, suppressionsRaw, eventsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
  ]);

  const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
  const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw);
  const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
  const existingEntry = getFilemakerEmailCampaignSuppressionByAddress(
    suppressionRegistry,
    normalizedEmailAddress
  );
  const alreadySuppressed = Boolean(existingEntry);
  const normalizedRunId = tokenPayload?.runId ?? existingEntry?.runId ?? null;
  const normalizedDeliveryId = tokenPayload?.deliveryId ?? existingEntry?.deliveryId ?? null;

  const nextSuppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
    registry: suppressionRegistry,
    entry: createFilemakerEmailCampaignSuppressionEntry({
      id: existingEntry?.id,
      createdAt: existingEntry?.createdAt,
      updatedAt: new Date().toISOString(),
      emailAddress: normalizedEmailAddress,
      reason: 'unsubscribed',
      actor: 'recipient',
      campaignId: normalizedCampaignId ?? existingEntry?.campaignId ?? null,
      runId: normalizedRunId,
      deliveryId: normalizedDeliveryId,
      notes: buildUnsubscribeNotes(
        tokenPayload ? result.data.source ?? 'signed-unsubscribe-token' : result.data.source
      ),
    }),
  });

  const campaign = normalizedCampaignId
    ? campaignRegistry.campaigns.find((entry) => entry.id === normalizedCampaignId) ?? null
    : null;
  const nextEventRegistry = campaign
    ? normalizeFilemakerEmailCampaignEventRegistry({
        version: eventRegistry.version,
        events: eventRegistry.events.concat(
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: normalizedRunId,
            deliveryId: normalizedDeliveryId,
            type: 'unsubscribed',
            actor: 'recipient',
            message: `${normalizedEmailAddress} unsubscribed via the public unsubscribe form.`,
          })
        ),
      })
    : eventRegistry;

  const writes: Array<Promise<boolean>> = [
    upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(
        toPersistedFilemakerEmailCampaignSuppressionRegistry(nextSuppressionRegistry)
      )
    ),
  ];

  if (campaign) {
    writes.push(
      upsertFilemakerCampaignSettingValue(
        FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry))
      )
    );
  }

  const persisted = await Promise.all(writes);
  if (persisted.some((entry) => !entry)) {
    throw new Error('Failed to persist the Filemaker unsubscribe request.');
  }

  const response: FilemakerEmailCampaignUnsubscribeResponse = {
    ok: true,
    emailAddress: normalizedEmailAddress,
    campaignId: campaign?.id ?? normalizedCampaignId,
    alreadySuppressed,
    reason: 'unsubscribed',
  };
  return NextResponse.json(response);
}
