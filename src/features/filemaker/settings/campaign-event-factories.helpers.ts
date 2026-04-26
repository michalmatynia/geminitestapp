import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  isFilemakerEmailCampaignEventType,
} from './campaign-factory-normalizers';
import {
  type FilemakerEmailCampaignEvent,
  type FilemakerEmailCampaignEventRegistry,
  type FilemakerEmailCampaignRunStatus,
  type FilemakerEmailCampaignDeliveryStatus,
} from '../types';
import {
  FILEMAKER_CAMPAIGN_EVENT_VERSION,
} from './campaign-factories.constants';
import {
  sortRegistryEntriesNewestFirst,
  parseCampaignRegistryJson,
  dedupeByNormalizedId,
} from './campaign-factory-utils.helpers';

const resolveEventId = (input: Partial<FilemakerEmailCampaignEvent>): string => {
  const id = normalizeString(input.id);
  if (id !== '') return id;
  const now = new Date().toISOString();
  const msg = normalizeString(input.message);
  const token = toIdToken(
    `${input.campaignId}-${input.runId || 'campaign'}-${input.deliveryId || 'timeline'}-${
      input.type
    }-${msg !== '' ? msg : 'event'}-${now}`
  );
  return `filemaker-email-campaign-event-${token !== '' ? token : 'entry'}`;
};

const resolveEventRunStatus = (status: string | undefined): FilemakerEmailCampaignRunStatus | null => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaignRunStatus;
  return null;
};

const resolveEventDeliveryStatus = (
  status: string | undefined
): FilemakerEmailCampaignDeliveryStatus | null => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['queued', 'sent', 'failed', 'skipped', 'bounced'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaignDeliveryStatus;
  return null;
};

const resolveEventMetadata = (input: Partial<FilemakerEmailCampaignEvent>) => {
  const actor = normalizeString(input.actor);
  const targetUrl = normalizeString(input.targetUrl);
  const mailThreadId = normalizeString(input.mailThreadId);
  const mailMessageId = normalizeString(input.mailMessageId);
  return {
    actor: actor !== '' ? actor : null,
    targetUrl: targetUrl !== '' ? targetUrl : null,
    mailThreadId: mailThreadId !== '' ? mailThreadId : null,
    mailMessageId: mailMessageId !== '' ? mailMessageId : null,
  };
};

export const createFilemakerEmailCampaignEvent = (
  input: Partial<FilemakerEmailCampaignEvent> &
    Pick<FilemakerEmailCampaignEvent, 'campaignId' | 'type' | 'message'>
): FilemakerEmailCampaignEvent => {
  const now = new Date().toISOString();
  const normalizedType = normalizeString(input.type).toLowerCase();
  const meta = resolveEventMetadata(input);

  return {
    id: resolveEventId(input),
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId) || null,
    deliveryId: normalizeString(input.deliveryId) || null,
    type: isFilemakerEmailCampaignEventType(normalizedType) ? normalizedType : 'status_changed',
    message: normalizeString(input.message),
    ...meta,
    runStatus: resolveEventRunStatus(input.runStatus),
    deliveryStatus: resolveEventDeliveryStatus(input.deliveryStatus),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignEventRegistry =
  (): FilemakerEmailCampaignEventRegistry => ({
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events: [],
  });

const normalizeEventEntry = (entry: unknown): FilemakerEmailCampaignEvent => {
  if (entry !== null && typeof entry === 'object') {
    return createFilemakerEmailCampaignEvent(
      entry as Partial<FilemakerEmailCampaignEvent> &
        Pick<FilemakerEmailCampaignEvent, 'campaignId' | 'type' | 'message'>
    );
  }
  return {
    id: '',
    campaignId: '',
    type: 'status_changed',
    message: '',
    createdAt: '',
    updatedAt: '',
  };
};

export const normalizeFilemakerEmailCampaignEventRegistry = (
  value: unknown
): FilemakerEmailCampaignEventRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignEventRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEvents = Array.isArray(record['events']) ? record['events'] : [];
  const events = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(rawEvents.map(normalizeEventEntry))
  );

  return {
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events,
  };
};

export const parseFilemakerEmailCampaignEventRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignEventRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  return normalizeFilemakerEmailCampaignEventRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignEventRegistry = (
  value: FilemakerEmailCampaignEventRegistry | null | undefined
): FilemakerEmailCampaignEventRegistry => normalizeFilemakerEmailCampaignEventRegistry(value);
