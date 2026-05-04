/* eslint-disable max-lines */

import { type NextRequest, NextResponse } from 'next/server';

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
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
  parseFilemakerCampaignUnsubscribeToken,
  type FilemakerEmailCampaignPreferenceStatus,
  type FilemakerEmailCampaignPreferencesRequest,
} from '@/features/filemaker/server';
import { filemakerEmailCampaignPreferencesRequestSchema } from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

type CampaignRegistry = ReturnType<typeof parseFilemakerEmailCampaignRegistry>;
type Campaign = CampaignRegistry['campaigns'][number];
type CampaignEventRegistry = ReturnType<typeof parseFilemakerEmailCampaignEventRegistry>;
type SuppressionRegistry = ReturnType<typeof parseFilemakerEmailCampaignSuppressionRegistry>;
type SuppressionEntry = ReturnType<typeof getFilemakerEmailCampaignSuppressionByAddress>;

const buildPreferenceNotes = (source: string | null | undefined): string => {
  const normalizedSource = typeof source === 'string' ? source.trim() : null;
  if (normalizedSource === null || normalizedSource.length === 0) {
    return 'Self-service preferences unsubscribe. Source: unknown.';
  }
  return `Self-service preferences unsubscribe. Source: ${normalizedSource}`;
};

const normalizeTokenValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveCampaign = (
  campaignRegistry: CampaignRegistry,
  campaignId: string | null
): Campaign | null => {
  if (campaignId === null) return null;
  for (const entry of campaignRegistry.campaigns) {
    if (entry.id === campaignId) {
      return entry;
    }
  }
  return null;
};

const resolvePreferenceStatus = (reason: string | undefined | null): FilemakerEmailCampaignPreferenceStatus => {
  if (reason === 'unsubscribed') return 'unsubscribed';
  if (reason === null || reason === undefined) return 'subscribed';
  return 'blocked';
};

const persistPreferenceWrites = async (
  writes: Array<Promise<boolean>>,
  failureMessage: string
): Promise<void> => {
  const persisted = await Promise.all(writes);
  if (persisted.some((entry) => !entry)) {
    throw new Error(failureMessage);
  }
};

const buildPreferenceResponse = (input: {
  emailAddress: string;
  campaign: Campaign | null;
  campaignId: string | null;
  status: FilemakerEmailCampaignPreferenceStatus;
  reason: string | null | undefined;
  canResubscribe: boolean;
}): Response => {
  return NextResponse.json({
    ok: true,
    emailAddress: input.emailAddress,
    campaignId: input.campaign?.id ?? input.campaignId,
    status: input.status,
    reason: input.reason ?? null,
    canResubscribe: input.canResubscribe,
  });
};

type PreferencesUnsubscribeInput = {
  registry: SuppressionRegistry;
  campaign: Campaign | null;
  emailAddress: string;
  campaignId: string | null;
  runId: string | null;
  deliveryId: string | null;
  existingEntry: SuppressionEntry;
  eventRegistry: CampaignEventRegistry;
  source: string | null | undefined;
};

/* eslint-disable complexity */
const buildPreferenceUnsubscribeWrites = (input: {
  registry: SuppressionRegistry;
  campaign: Campaign | null;
  emailAddress: string;
  runId: string | null;
  deliveryId: string | null;
  campaignId: string | null;
  existingEntry: SuppressionEntry;
  eventRegistry: CampaignEventRegistry;
  source: string | null | undefined;
}): Array<Promise<boolean>> => {
  const now = new Date().toISOString();
  const campaignId = input.campaignId ?? input.existingEntry?.campaignId ?? null;
  const runId = input.runId ?? input.existingEntry?.runId ?? null;
  const deliveryId = input.deliveryId ?? input.existingEntry?.deliveryId ?? null;

  const suppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
    registry: input.registry,
    entry: createFilemakerEmailCampaignSuppressionEntry({
      id: input.existingEntry?.id,
      createdAt: input.existingEntry?.createdAt,
      updatedAt: now,
      emailAddress: input.emailAddress,
      reason: 'unsubscribed',
      actor: 'recipient',
      campaignId,
      runId,
      deliveryId,
      notes: buildPreferenceNotes(input.source),
    }),
  });

  const writeList: Array<Promise<boolean>> = [
    upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(suppressionRegistry))
    ),
  ];

  if (input.campaign !== null) {
    const eventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
      version: input.eventRegistry.version,
      events: input.eventRegistry.events.concat(
        createFilemakerEmailCampaignEvent({
          campaignId: input.campaign.id,
          runId,
          deliveryId,
          type: 'unsubscribed',
          actor: 'recipient',
          message: `${input.emailAddress} unsubscribed from the preferences center.`,
        })
      ),
    });
    writeList.push(
      upsertFilemakerCampaignSettingValue(
        FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(eventRegistry))
      )
    );
  }

  return writeList;
};
/* eslint-enable complexity */

const handleUnsubscribeAction = async (input: PreferencesUnsubscribeInput): Promise<Response> => {
  const reason = input.existingEntry?.reason;
  if (reason === 'manual_block' || reason === 'bounced') {
    return buildPreferenceResponse({
      emailAddress: input.emailAddress,
      campaign: input.campaign,
      campaignId: input.campaignId,
      status: 'blocked',
      reason,
      canResubscribe: false,
    });
  }
  if (reason === 'unsubscribed') {
    return buildPreferenceResponse({
      emailAddress: input.emailAddress,
      campaign: input.campaign,
      campaignId: input.campaignId,
      status: 'unsubscribed',
      reason: 'unsubscribed',
      canResubscribe: true,
    });
  }

  const writes = buildPreferenceUnsubscribeWrites(input);
  await persistPreferenceWrites(writes, 'Failed to persist the Filemaker preferences unsubscribe update.');
  return buildPreferenceResponse({
    emailAddress: input.emailAddress,
    campaign: input.campaign,
    campaignId: input.campaignId,
    status: 'unsubscribed',
    reason: 'unsubscribed',
    canResubscribe: true,
  });
};

// eslint-disable-next-line max-lines-per-function
const handleResubscribeAction = async (input: {
  registry: SuppressionRegistry;
  campaign: Campaign | null;
  emailAddress: string;
  campaignId: string | null;
  runId: string | null;
  deliveryId: string | null;
  existingEntry: SuppressionEntry;
  eventRegistry: CampaignEventRegistry;
}): Promise<Response> => {
  const reason = input.existingEntry?.reason;
  if (reason !== 'unsubscribed') {
    const status = resolvePreferenceStatus(reason);
    return buildPreferenceResponse({
      emailAddress: input.emailAddress,
      campaign: input.campaign,
      campaignId: input.campaignId,
      status,
      reason,
      canResubscribe: status === 'unsubscribed',
    });
  }

  const suppressionRegistry = removeFilemakerEmailCampaignSuppressionEntryByAddress({
    registry: input.registry,
    emailAddress: input.emailAddress,
  });
  const writes: Array<Promise<boolean>> = [
    upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(suppressionRegistry))
    ),
  ];
  if (input.campaign !== null) {
    const eventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
      version: input.eventRegistry.version,
      events: input.eventRegistry.events.concat(
        createFilemakerEmailCampaignEvent({
          campaignId: input.campaign.id,
          runId: input.runId,
          deliveryId: input.deliveryId,
          type: 'resubscribed',
          actor: 'recipient',
          message: `${input.emailAddress} restored campaign delivery from the preferences center.`,
        })
      ),
    });
    writes.push(
      upsertFilemakerCampaignSettingValue(
        FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(eventRegistry))
      )
    );
  }

  await persistPreferenceWrites(writes, 'Failed to persist the Filemaker preferences restore update.');
  return buildPreferenceResponse({
    emailAddress: input.emailAddress,
    campaign: input.campaign,
    campaignId: input.campaignId,
    status: 'subscribed',
    reason: null,
    canResubscribe: false,
  });
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result: JsonParseResult<FilemakerEmailCampaignPreferencesRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignPreferencesRequestSchema,
    { logPrefix: 'filemaker.campaigns.preferences.POST' }
  );
  if (!result.ok) {
    return result.response;
  }

  const tokenPayload = parseFilemakerCampaignUnsubscribeToken(result.data.token);
  if (tokenPayload === null) {
    throw badRequestError('Invalid or expired preferences token.');
  }

  const normalizedEmailAddress = tokenPayload.emailAddress.trim().toLowerCase();
  const normalizedCampaignId = normalizeTokenValue(tokenPayload.campaignId);
  const normalizedRunId = normalizeTokenValue(tokenPayload.runId);
  const normalizedDeliveryId = normalizeTokenValue(tokenPayload.deliveryId);

  const [campaignsRaw, suppressionsRaw, eventsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
  ]);

  const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
  const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw);
  const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
  const campaign = resolveCampaign(campaignRegistry, normalizedCampaignId);
  const existingEntry = getFilemakerEmailCampaignSuppressionByAddress(
    suppressionRegistry,
    normalizedEmailAddress
  );

  if (result.data.action === 'unsubscribe') {
    return handleUnsubscribeAction({
      registry: suppressionRegistry,
      campaign,
      emailAddress: normalizedEmailAddress,
      campaignId: normalizedCampaignId,
      runId: normalizedRunId,
      deliveryId: normalizedDeliveryId,
      existingEntry,
      eventRegistry,
      source: result.data.source ?? 'signed-preferences-token',
    });
  }

  return handleResubscribeAction({
    registry: suppressionRegistry,
    campaign,
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    runId: normalizedRunId,
    deliveryId: normalizedDeliveryId,
    existingEntry,
    eventRegistry,
  });
}

/* eslint-enable max-lines */
