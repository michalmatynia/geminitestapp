import 'server-only';

import {
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
} from '../settings-constants';
import {
  createFilemakerEmailCampaignSuppressionEntry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings/campaign-factories';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
} from '../types';

import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';

const DEFAULT_MIN_SENDS_WITHOUT_ENGAGEMENT = 5;

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export type FilemakerCampaignColdRecipient = {
  emailAddress: string;
  sentCount: number;
  lastSentAt: string | null;
};

type FilemakerCampaignSendStats = {
  sentCount: number;
  lastSentAt: string | null;
};

const hasEngagementEvent = (event: FilemakerEmailCampaignEvent): boolean =>
  event.type === 'opened' || event.type === 'clicked';

const collectDeliveryAddressById = (
  deliveries: FilemakerEmailCampaignDelivery[]
): Map<string, string> => {
  const deliveryAddressById = new Map<string, string>();
  for (const delivery of deliveries) {
    deliveryAddressById.set(delivery.id, normalizeAddress(delivery.emailAddress));
  }
  return deliveryAddressById;
};

const collectEngagedAddresses = (
  events: FilemakerEmailCampaignEvent[],
  deliveryAddressById: Map<string, string>
): Set<string> => {
  const engagedAddresses = new Set<string>();
  for (const event of events) {
    if (!hasEngagementEvent(event)) continue;
    const deliveryId = event.deliveryId ?? '';
    if (deliveryId.length === 0) continue;
    const address = deliveryAddressById.get(deliveryId);
    if (address !== undefined && address.length > 0) engagedAddresses.add(address);
  }
  return engagedAddresses;
};

const resolveLastSentAt = (
  sentAt: string | null | undefined,
  previous: FilemakerCampaignSendStats
): string | null => {
  if (sentAt === null || sentAt === undefined || sentAt.length === 0) {
    return previous.lastSentAt;
  }
  if (previous.lastSentAt === null) return sentAt;
  return Date.parse(sentAt) > Date.parse(previous.lastSentAt) ? sentAt : previous.lastSentAt;
};

const collectSendStatsByAddress = (
  deliveries: FilemakerEmailCampaignDelivery[]
): Map<string, FilemakerCampaignSendStats> => {
  const sendStats = new Map<string, FilemakerCampaignSendStats>();
  for (const delivery of deliveries) {
    if (delivery.status !== 'sent') continue;
    const address = normalizeAddress(delivery.emailAddress);
    if (address.length === 0) continue;
    const previous = sendStats.get(address) ?? { sentCount: 0, lastSentAt: null };
    sendStats.set(address, {
      sentCount: previous.sentCount + 1,
      lastSentAt: resolveLastSentAt(delivery.sentAt, previous),
    });
  }
  return sendStats;
};

const collectColdRecipients = ({
  engagedAddresses,
  minSendsWithoutEngagement,
  sendStats,
}: {
  engagedAddresses: Set<string>;
  minSendsWithoutEngagement: number;
  sendStats: Map<string, FilemakerCampaignSendStats>;
}): FilemakerCampaignColdRecipient[] => {
  const cold: FilemakerCampaignColdRecipient[] = [];
  for (const [emailAddress, stats] of sendStats.entries()) {
    if (stats.sentCount < minSendsWithoutEngagement) continue;
    if (engagedAddresses.has(emailAddress)) continue;
    cold.push({
      emailAddress,
      sentCount: stats.sentCount,
      lastSentAt: stats.lastSentAt,
    });
  }
  return cold.sort((left, right) => right.sentCount - left.sentCount);
};

const findExistingSuppressionEntry = (
  entries: Array<{ emailAddress: string }>,
  emailAddress: string
): { emailAddress: string } | undefined =>
  entries.find((entry) => normalizeAddress(entry.emailAddress) === emailAddress);

const buildColdRecipientNotes = (candidate: FilemakerCampaignColdRecipient): string => {
  const lastSentAt = candidate.lastSentAt !== null ? `, last sent ${candidate.lastSentAt}` : '';
  return `Auto-pruned: ${candidate.sentCount} consecutive sends without an open or click${lastSentAt}.`;
};

export const findFilemakerCampaignColdRecipients = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
  minSendsWithoutEngagement?: number;
}): FilemakerCampaignColdRecipient[] => {
  const minSendsWithoutEngagement =
    input.minSendsWithoutEngagement ?? DEFAULT_MIN_SENDS_WITHOUT_ENGAGEMENT;
  if (minSendsWithoutEngagement <= 0) return [];

  const deliveryAddressById = collectDeliveryAddressById(input.deliveries);
  const engagedAddresses = collectEngagedAddresses(input.events, deliveryAddressById);
  const sendStats = collectSendStatsByAddress(input.deliveries);
  return collectColdRecipients({ engagedAddresses, minSendsWithoutEngagement, sendStats });
};

export const pruneFilemakerCampaignColdRecipients = async (input?: {
  minSendsWithoutEngagement?: number;
  actor?: string | null;
}): Promise<{
  candidates: FilemakerCampaignColdRecipient[];
  addedCount: number;
  skippedCount: number;
}> => {
  const [deliveriesRaw, eventsRaw, suppressionsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
  ]);

  const deliveries = parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw).deliveries;
  const events = parseFilemakerEmailCampaignEventRegistry(eventsRaw).events;
  const candidates = findFilemakerCampaignColdRecipients({
    deliveries,
    events,
    minSendsWithoutEngagement: input?.minSendsWithoutEngagement,
  });
  if (candidates.length === 0) {
    return { candidates: [], addedCount: 0, skippedCount: 0 };
  }

  let registry = parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw);
  const nowIso = new Date().toISOString();
  let addedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    const existing = findExistingSuppressionEntry(registry.entries, candidate.emailAddress);
    if (existing !== undefined) {
      skippedCount += 1;
      continue;
    }
    registry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry,
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress: candidate.emailAddress,
        reason: 'cold',
        actor: input?.actor ?? 'system',
        notes: buildColdRecipientNotes(candidate),
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    });
    addedCount += 1;
  }

  if (addedCount > 0) {
    await upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(registry))
    );
  }

  return { candidates, addedCount, skippedCount };
};
