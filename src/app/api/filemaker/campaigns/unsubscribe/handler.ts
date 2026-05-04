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
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

type CampaignRegistry = ReturnType<typeof parseFilemakerEmailCampaignRegistry>;
type Campaign = CampaignRegistry['campaigns'][number];
type CampaignEventRegistry = ReturnType<typeof parseFilemakerEmailCampaignEventRegistry>;

const buildUnsubscribeNotes = (source: string | null | undefined): string => {
  const normalizedSource = typeof source === 'string' ? source.trim() : '';
  if (normalizedSource.length === 0) {
    return 'Self-service unsubscribe request.';
  }
  return `Self-service unsubscribe request. Source: ${normalizedSource}`;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const isOneClickFormBody = (contentType: string, bodyText: string): boolean => {
  if (!/application\/x-www-form-urlencoded/i.test(contentType)) {
    return false;
  }
  const params = new URLSearchParams(bodyText);
  return params.get('List-Unsubscribe') === 'One-Click';
};

const normalizeTokenValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveCampaign = (
  campaignRegistry: CampaignRegistry,
  campaignId: string | null
): Campaign | null => {
  if (campaignId === null) {
    return null;
  }
  for (const entry of campaignRegistry.campaigns) {
    if (entry.id === campaignId) {
      return entry;
    }
  }
  return null;
};

type ParsedUnsubscribeRequestResult =
  | { ok: true; data: FilemakerEmailCampaignUnsubscribeRequest }
  | { ok: false; response: Response };

const parseUnsubscribeRequest = async (
  req: NextRequest,
  queryToken: string | null,
  contentType: string | null
): Promise<ParsedUnsubscribeRequestResult> => {
  const hasQueryToken = isNonEmptyString(queryToken);
  const hasFormContentType = isNonEmptyString(contentType) && /application\/x-www-form-urlencoded/i.test(contentType);
  const isFormSubmit = hasQueryToken && hasFormContentType;
  if (!isFormSubmit) {
    const result: JsonParseResult<FilemakerEmailCampaignUnsubscribeRequest> =
      await parseJsonBody(req, filemakerEmailCampaignUnsubscribeRequestSchema, {
        logPrefix: 'filemaker.campaigns.unsubscribe.POST',
      });
    if (!result.ok) {
      return { ok: false, response: result.response };
    }
    const hasBodyToken = isNonEmptyString(result.data.token);
    return {
      ok: true,
      data: hasQueryToken && !hasBodyToken ? { ...result.data, token: queryToken } : result.data,
    };
  }

  const bodyText = await req.text();
  if (!isOneClickFormBody(contentType, bodyText)) {
    throw badRequestError('Expected List-Unsubscribe=One-Click form body.');
  }
  return {
    ok: true,
    data: {
      token: queryToken,
      source: 'list-unsubscribe-one-click',
    },
  };
};

const persistUnsubscribeChanges = async (writes: Array<Promise<boolean>>): Promise<void> => {
  const persisted = await Promise.all(writes);
  if (persisted.some((entry) => !entry)) {
    throw new Error('Failed to persist the Filemaker unsubscribe request.');
  }
};

type UnsubscribeRegistryData = {
  campaignRegistry: CampaignRegistry;
  suppressionRegistry: ReturnType<typeof parseFilemakerEmailCampaignSuppressionRegistry>;
  eventRegistry: CampaignEventRegistry;
};

const loadUnsubscribeRegistries = async (): Promise<UnsubscribeRegistryData> => {
  const [campaignsRaw, suppressionsRaw, eventsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
  ]);
  return {
    campaignRegistry: parseFilemakerEmailCampaignRegistry(campaignsRaw),
    suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw),
    eventRegistry: parseFilemakerEmailCampaignEventRegistry(eventsRaw),
  };
};

/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
const buildUnsubscribeWrites = (input: {
  suppressionRegistry: ReturnType<typeof parseFilemakerEmailCampaignSuppressionRegistry>;
  eventRegistry: CampaignEventRegistry;
  campaign: Campaign | null;
  existingEntry: ReturnType<typeof getFilemakerEmailCampaignSuppressionByAddress>;
  emailAddress: string;
  campaignId: string | null;
  normalizedRunId: string | null;
  normalizedDeliveryId: string | null;
  notes: string;
}): {
  writes: Array<Promise<boolean>>;
  campaignId: string | null;
} => {
  const resolvedRunId = input.normalizedRunId ?? input.existingEntry?.runId ?? null;
  const resolvedDeliveryId = input.normalizedDeliveryId ?? input.existingEntry?.deliveryId ?? null;
  const nextSuppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
    registry: input.suppressionRegistry,
    entry: createFilemakerEmailCampaignSuppressionEntry({
      id: input.existingEntry?.id,
      createdAt: input.existingEntry?.createdAt,
      updatedAt: new Date().toISOString(),
      emailAddress: input.emailAddress,
      reason: 'unsubscribed',
      actor: 'recipient',
      campaignId: input.campaignId,
      runId: resolvedRunId,
      deliveryId: resolvedDeliveryId,
      notes: input.notes,
    }),
  });

  const writes: Array<Promise<boolean>> = [
    upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(nextSuppressionRegistry))
    ),
  ];
  if (input.campaign === null) {
    return { writes, campaignId: input.campaignId };
  }

  const nextEventRegistry = normalizeFilemakerEmailCampaignEventRegistry({
    version: input.eventRegistry.version,
    events: input.eventRegistry.events.concat(
      createFilemakerEmailCampaignEvent({
        campaignId: input.campaign.id,
        runId: resolvedRunId,
        deliveryId: resolvedDeliveryId,
        type: 'unsubscribed',
        actor: 'recipient',
        message: `${input.emailAddress} unsubscribed via the public unsubscribe form.`,
      })
    ),
  });

  writes.push(
    upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry))
    )
  );
  return { writes, campaignId: input.campaignId };
};
/* eslint-enable complexity,max-lines-per-function */

const buildUnsubscribeResponse = (
  input: {
    emailAddress: string;
    campaign: Campaign | null;
    campaignId: string | null;
    alreadySuppressed: boolean;
  }
): FilemakerEmailCampaignUnsubscribeResponse => ({
  ok: true,
  emailAddress: input.emailAddress,
  campaignId: input.campaign?.id ?? input.campaignId,
  alreadySuppressed: input.alreadySuppressed,
  reason: 'unsubscribed',
});

// eslint-disable-next-line complexity
export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const queryToken = req.nextUrl.searchParams.get('token');
  const contentType = req.headers.get('content-type');
  const parsedRequestResult = await parseUnsubscribeRequest(req, queryToken, contentType);
  if (!parsedRequestResult.ok) {
    return parsedRequestResult.response;
  }

  const parsedRequest = parsedRequestResult.data;
  const hasToken = isNonEmptyString(parsedRequest.token);
  const tokenPayload = hasToken ? parseFilemakerCampaignUnsubscribeToken(parsedRequest.token) : null;
  if (hasToken && tokenPayload === null) {
    throw badRequestError('Invalid or expired unsubscribe token.');
  }

  const normalizedEmailAddress = (tokenPayload?.emailAddress ?? parsedRequest.emailAddress ?? '')
    .trim()
    .toLowerCase();
  const normalizedCampaignId = normalizeTokenValue(tokenPayload?.campaignId) ?? normalizeTokenValue(parsedRequest.campaignId);
  const normalizedRunId = tokenPayload?.runId ?? null;
  const normalizedDeliveryId = tokenPayload?.deliveryId ?? null;

  const { campaignRegistry, suppressionRegistry, eventRegistry } = await loadUnsubscribeRegistries();
  const campaign = resolveCampaign(campaignRegistry, normalizedCampaignId);
  const existingEntry = getFilemakerEmailCampaignSuppressionByAddress(
    suppressionRegistry,
    normalizedEmailAddress
  );
  const alreadySuppressed = existingEntry !== null;

  const { writes, campaignId } = buildUnsubscribeWrites({
    suppressionRegistry,
    eventRegistry,
    campaign,
    existingEntry,
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId ?? existingEntry?.campaignId ?? null,
    normalizedRunId,
    normalizedDeliveryId,
    notes: buildUnsubscribeNotes(
      hasToken ? parsedRequest.source ?? 'signed-unsubscribe-token' : parsedRequest.source
    ),
  });
  await persistUnsubscribeChanges(writes);

  return NextResponse.json(
    buildUnsubscribeResponse({
      emailAddress: normalizedEmailAddress,
      campaign,
      campaignId,
      alreadySuppressed,
    })
  );
}
