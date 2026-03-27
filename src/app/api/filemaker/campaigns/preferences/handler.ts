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
  removeFilemakerEmailCampaignSuppressionEntryByAddress,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '@/features/filemaker/settings';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from '@/features/filemaker/server/campaign-settings-store';
import { parseFilemakerCampaignUnsubscribeToken } from '@/features/filemaker/server/campaign-unsubscribe-token';
import type {
  FilemakerEmailCampaignPreferenceStatus,
  FilemakerEmailCampaignPreferencesRequest,
  FilemakerEmailCampaignPreferencesResponse,
} from '@/features/filemaker/types';
import { filemakerEmailCampaignPreferencesRequestSchema } from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const buildPreferenceNotes = (source: string | null | undefined, action: 'unsubscribe'): string =>
  source?.trim()
    ? `Self-service preferences ${action}. Source: ${source.trim()}`
    : `Self-service preferences ${action}.`;

const resolvePreferenceStatus = (reason: string | null | undefined): FilemakerEmailCampaignPreferenceStatus => {
  if (!reason) return 'subscribed';
  return reason === 'unsubscribed' ? 'unsubscribed' : 'blocked';
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result: JsonParseResult<FilemakerEmailCampaignPreferencesRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignPreferencesRequestSchema,
    { logPrefix: 'filemaker.campaigns.preferences.POST' }
  );
  if (!result.ok) {
    return result.response;
  }

  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(result.data.token);
  if (!tokenPayload) {
    throw badRequestError('Invalid or expired preferences token.');
  }

  const normalizedEmailAddress = tokenPayload.emailAddress.trim().toLowerCase();
  const normalizedCampaignId = tokenPayload.campaignId?.trim() || null;
  const normalizedRunId = tokenPayload.runId?.trim() || null;
  const normalizedDeliveryId = tokenPayload.deliveryId?.trim() || null;

  const [campaignsRaw, suppressionsRaw, eventsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
  ]);

  const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
  const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw);
  const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
  const campaign = normalizedCampaignId
    ? campaignRegistry.campaigns.find((entry) => entry.id === normalizedCampaignId) ?? null
    : null;
  const existingEntry = getFilemakerEmailCampaignSuppressionByAddress(
    suppressionRegistry,
    normalizedEmailAddress
  );

  if (result.data.action === 'unsubscribe') {
    if (existingEntry?.reason === 'manual_block' || existingEntry?.reason === 'bounced') {
      const response: FilemakerEmailCampaignPreferencesResponse = {
        ok: true,
        emailAddress: normalizedEmailAddress,
        campaignId: campaign?.id ?? normalizedCampaignId,
        status: 'blocked',
        reason: existingEntry.reason,
        canResubscribe: false,
      };
      return NextResponse.json(response);
    }

    if (existingEntry?.reason === 'unsubscribed') {
      const response: FilemakerEmailCampaignPreferencesResponse = {
        ok: true,
        emailAddress: normalizedEmailAddress,
        campaignId: campaign?.id ?? normalizedCampaignId,
        status: 'unsubscribed',
        reason: 'unsubscribed',
        canResubscribe: true,
      };
      return NextResponse.json(response);
    }

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
        runId: normalizedRunId ?? existingEntry?.runId ?? null,
        deliveryId: normalizedDeliveryId ?? existingEntry?.deliveryId ?? null,
        notes: buildPreferenceNotes(
          result.data.source ?? 'signed-preferences-token',
          'unsubscribe'
        ),
      }),
    });

    const nextEventRegistry = campaign
      ? normalizeFilemakerEmailCampaignEventRegistry({
          version: eventRegistry.version,
          events: eventRegistry.events.concat(
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: normalizedRunId ?? existingEntry?.runId ?? null,
              deliveryId: normalizedDeliveryId ?? existingEntry?.deliveryId ?? null,
              type: 'unsubscribed',
              actor: 'recipient',
              message: `${normalizedEmailAddress} unsubscribed from the preferences center.`,
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
      throw new Error('Failed to persist the Filemaker preferences unsubscribe update.');
    }

    const response: FilemakerEmailCampaignPreferencesResponse = {
      ok: true,
      emailAddress: normalizedEmailAddress,
      campaignId: campaign?.id ?? normalizedCampaignId,
      status: 'unsubscribed',
      reason: 'unsubscribed',
      canResubscribe: true,
    };
    return NextResponse.json(response);
  }

  if (existingEntry?.reason === 'unsubscribed') {
    const nextSuppressionRegistry = removeFilemakerEmailCampaignSuppressionEntryByAddress({
      registry: suppressionRegistry,
      emailAddress: normalizedEmailAddress,
    });
    const nextEventRegistry = campaign
      ? normalizeFilemakerEmailCampaignEventRegistry({
          version: eventRegistry.version,
          events: eventRegistry.events.concat(
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: normalizedRunId ?? existingEntry.runId ?? null,
              deliveryId: normalizedDeliveryId ?? existingEntry.deliveryId ?? null,
              type: 'resubscribed',
              actor: 'recipient',
              message: `${normalizedEmailAddress} restored campaign delivery from the preferences center.`,
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
      throw new Error('Failed to persist the Filemaker preferences restore update.');
    }

    const response: FilemakerEmailCampaignPreferencesResponse = {
      ok: true,
      emailAddress: normalizedEmailAddress,
      campaignId: campaign?.id ?? normalizedCampaignId,
      status: 'subscribed',
      reason: null,
      canResubscribe: false,
    };
    return NextResponse.json(response);
  }

  const resolvedStatus = resolvePreferenceStatus(existingEntry?.reason ?? null);
  const response: FilemakerEmailCampaignPreferencesResponse = {
    ok: true,
    emailAddress: normalizedEmailAddress,
    campaignId: campaign?.id ?? normalizedCampaignId,
    status: resolvedStatus,
    reason: existingEntry?.reason ?? null,
    canResubscribe: resolvedStatus === 'unsubscribed',
  };
  return NextResponse.json(response);
}
