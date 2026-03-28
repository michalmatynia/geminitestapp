import { normalizeString } from '../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaignAudienceRule,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRecurringRule,
  FilemakerEmailCampaignSuppressionEntry,
  FilemakerEmailStatus,
  FilemakerPartyKind,
} from '../types';

const FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS: FilemakerPartyKind[] = [
  'person',
  'organization',
];
const FILEMAKER_CAMPAIGN_AUDIENCE_EMAIL_STATUSES: FilemakerEmailStatus[] = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];
const FILEMAKER_CAMPAIGN_EVENT_TYPES: FilemakerEmailCampaignEvent['type'][] = [
  'created',
  'updated',
  'unsubscribed',
  'resubscribed',
  'opened',
  'clicked',
  'launched',
  'processing_started',
  'delivery_sent',
  'delivery_failed',
  'delivery_bounced',
  'status_changed',
  'paused',
  'completed',
  'failed',
  'cancelled',
];
const FILEMAKER_CAMPAIGN_SUPPRESSION_REASONS: FilemakerEmailCampaignSuppressionEntry['reason'][] =
  ['manual_block', 'unsubscribed', 'bounced'];

export const normalizeStringList = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  input.forEach((entry: unknown) => {
    const normalized = normalizeString(entry);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

export const normalizePartyKinds = (input: unknown): FilemakerPartyKind[] => {
  if (!Array.isArray(input)) return [...FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS];
  const values = input
    .map((entry: unknown) => normalizeString(entry).toLowerCase())
    .filter(
      (entry: string): entry is FilemakerPartyKind =>
        FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS.includes(entry as FilemakerPartyKind)
    );
  return values.length > 0
    ? Array.from(new Set(values))
    : [...FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS];
};

export const normalizeEmailStatuses = (input: unknown): FilemakerEmailStatus[] => {
  if (!Array.isArray(input)) return ['active'];
  const values = input
    .map((entry: unknown) => normalizeString(entry).toLowerCase())
    .filter(
      (entry: string): entry is FilemakerEmailStatus =>
        FILEMAKER_CAMPAIGN_AUDIENCE_EMAIL_STATUSES.includes(entry as FilemakerEmailStatus)
    );
  return values.length > 0 ? Array.from(new Set(values)) : ['active'];
};

export const normalizePartyReferences = (
  input: unknown
): FilemakerEmailCampaignAudienceRule['includePartyReferences'] => {
  if (!Array.isArray(input)) return [];
  const references: FilemakerEmailCampaignAudienceRule['includePartyReferences'] = [];
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const partyKind = normalizeString(record['partyKind']).toLowerCase();
    const partyId = normalizeString(record['partyId']);
    if (
      !partyId ||
      !FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS.includes(partyKind as FilemakerPartyKind)
    ) {
      return;
    }
    const dedupeKey = `${partyKind}:${partyId}`;
    if (references.some((reference) => `${reference.kind}:${reference.id}` === dedupeKey)) {
      return;
    }
    references.push({
      kind: partyKind as FilemakerPartyKind,
      id: partyId,
    });
  });
  return references;
};

export const normalizeNullablePositiveInt = (input: unknown): number | null => {
  if (input == null || input === '') return null;
  const value = Math.trunc(Number(input));
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const normalizeNullableBoundedInt = (
  input: unknown,
  min: number,
  max: number
): number | null => {
  if (input == null || input === '') return null;
  const value = Math.trunc(Number(input));
  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
};

export const normalizeRecurringRule = (
  input: unknown
): FilemakerEmailCampaignRecurringRule | null => {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const frequency = normalizeString(record['frequency']).toLowerCase();
  const interval = Math.trunc(Number(record['interval']));
  const weekdays = Array.isArray(record['weekdays'])
    ? Array.from(
        new Set(
          record['weekdays']
            .map((entry: unknown) => Math.trunc(Number(entry)))
            .filter((entry: number) => Number.isFinite(entry) && entry >= 0 && entry <= 6)
        )
      )
    : [];

  return {
    frequency: frequency === 'weekly' || frequency === 'monthly' ? frequency : 'daily',
    interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
    weekdays,
    hourStart: normalizeNullableBoundedInt(record['hourStart'], 0, 23),
    hourEnd: normalizeNullableBoundedInt(record['hourEnd'], 0, 23),
  };
};

export const isFilemakerEmailCampaignEventType = (
  value: string
): value is FilemakerEmailCampaignEvent['type'] =>
  FILEMAKER_CAMPAIGN_EVENT_TYPES.includes(value as FilemakerEmailCampaignEvent['type']);

export const isFilemakerEmailCampaignSuppressionReason = (
  value: string
): value is FilemakerEmailCampaignSuppressionEntry['reason'] =>
  FILEMAKER_CAMPAIGN_SUPPRESSION_REASONS.includes(
    value as FilemakerEmailCampaignSuppressionEntry['reason']
  );
