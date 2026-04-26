import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  isFilemakerEmailCampaignSuppressionReason,
} from './campaign-factory-normalizers';
import {
  type FilemakerEmailCampaignSuppressionEntry,
  type FilemakerEmailCampaignSuppressionReason,
  type FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import {
  FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
} from './campaign-factories.constants';
import {
  sortRegistryEntriesNewestFirst,
  parseCampaignRegistryJson,
} from './campaign-factory-utils.helpers';

const resolveSuppressionEntryId = (input: Partial<FilemakerEmailCampaignSuppressionEntry>): string => {
  const id = normalizeString(input.id);
  if (id.length > 0) return id;
  const reason = normalizeString(input.reason).toLowerCase();
  const email = normalizeString(input.emailAddress).toLowerCase();
  const token = toIdToken(`${email}-${reason.length > 0 ? reason : 'manual'}`);
  return `filemaker-email-campaign-suppression-${token.length > 0 ? token : 'entry'}`;
};

const EMPTY_SUPPRESSION_ENTRY: FilemakerEmailCampaignSuppressionEntry = {
  createdAt: '',
  emailAddress: '',
  id: '',
  reason: 'manual_block',
  updatedAt: '',
};

const normalizeSuppressionOptionalString = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const resolveSuppressionReason = (
  reason: string
): FilemakerEmailCampaignSuppressionReason => {
  const normalizedReason = normalizeString(reason).toLowerCase();
  return isFilemakerEmailCampaignSuppressionReason(normalizedReason)
    ? normalizedReason
    : 'manual_block';
};

export const createFilemakerEmailCampaignSuppressionEntry = (
  input: Partial<FilemakerEmailCampaignSuppressionEntry> &
    Pick<FilemakerEmailCampaignSuppressionEntry, 'emailAddress' | 'reason'>
): FilemakerEmailCampaignSuppressionEntry => {
  const now = new Date().toISOString();

  return {
    id: resolveSuppressionEntryId(input),
    emailAddress: normalizeString(input.emailAddress).toLowerCase(),
    reason: resolveSuppressionReason(input.reason),
    actor: normalizeSuppressionOptionalString(input.actor),
    notes: normalizeSuppressionOptionalString(input.notes),
    campaignId: normalizeSuppressionOptionalString(input.campaignId),
    runId: normalizeSuppressionOptionalString(input.runId),
    deliveryId: normalizeSuppressionOptionalString(input.deliveryId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

const normalizeSuppressionEntry = (
  entry: unknown
): FilemakerEmailCampaignSuppressionEntry => {
  if (entry !== null && typeof entry === 'object') {
    return createFilemakerEmailCampaignSuppressionEntry(
      entry as Partial<FilemakerEmailCampaignSuppressionEntry> &
        Pick<FilemakerEmailCampaignSuppressionEntry, 'emailAddress' | 'reason'>
    );
  }
  return EMPTY_SUPPRESSION_ENTRY;
};

export const createDefaultFilemakerEmailCampaignSuppressionRegistry =
  (): FilemakerEmailCampaignSuppressionRegistry => ({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: [],
  });

export const normalizeFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignSuppressionRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEntries = Array.isArray(record['entries']) ? record['entries'] : [];
  const newestFirstEntries = sortRegistryEntriesNewestFirst(
    rawEntries.map(normalizeSuppressionEntry)
  );

  const uniqueEntriesMap = new Map<string, FilemakerEmailCampaignSuppressionEntry>();
  newestFirstEntries.forEach((entry) => {
    const email = normalizeString(entry.emailAddress).toLowerCase();
    if (email.length > 0 && !uniqueEntriesMap.has(email)) {
      uniqueEntriesMap.set(email, entry);
    }
  });

  return {
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: Array.from(uniqueEntriesMap.values()),
  };
};

export const parseFilemakerEmailCampaignSuppressionRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (parsed === null || parsed === undefined) {
    return createDefaultFilemakerEmailCampaignSuppressionRegistry();
  }
  return normalizeFilemakerEmailCampaignSuppressionRegistry(
    parsed as FilemakerEmailCampaignSuppressionRegistry
  );
};

export const toPersistedFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry | null | undefined
): FilemakerEmailCampaignSuppressionRegistry =>
  normalizeFilemakerEmailCampaignSuppressionRegistry(value);

export const getFilemakerEmailCampaignSuppressionByAddress = (
  registry: FilemakerEmailCampaignSuppressionRegistry,
  emailAddress: string
): FilemakerEmailCampaignSuppressionEntry | null => {
  const normalizedEmailAddress = normalizeString(emailAddress).toLowerCase();
  if (normalizedEmailAddress.length === 0) return null;
  return (
    normalizeFilemakerEmailCampaignSuppressionRegistry(registry).entries.find(
      (entry: FilemakerEmailCampaignSuppressionEntry): boolean =>
        entry.emailAddress === normalizedEmailAddress
    ) ?? null
  );
};

export const upsertFilemakerEmailCampaignSuppressionEntry = (input: {
  registry: FilemakerEmailCampaignSuppressionRegistry;
  entry: FilemakerEmailCampaignSuppressionEntry;
}): FilemakerEmailCampaignSuppressionRegistry =>
  normalizeFilemakerEmailCampaignSuppressionRegistry({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: normalizeFilemakerEmailCampaignSuppressionRegistry(input.registry).entries
      .filter(
        (existingEntry: FilemakerEmailCampaignSuppressionEntry): boolean =>
          existingEntry.emailAddress !== normalizeString(input.entry.emailAddress).toLowerCase()
      )
      .concat(createFilemakerEmailCampaignSuppressionEntry(input.entry)),
  });

export const removeFilemakerEmailCampaignSuppressionEntryByAddress = (input: {
  registry: FilemakerEmailCampaignSuppressionRegistry;
  emailAddress: string;
}): FilemakerEmailCampaignSuppressionRegistry => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  return normalizeFilemakerEmailCampaignSuppressionRegistry({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: normalizeFilemakerEmailCampaignSuppressionRegistry(input.registry).entries.filter(
      (entry: FilemakerEmailCampaignSuppressionEntry): boolean =>
        entry.emailAddress !== normalizedEmailAddress
    ),
  });
};
