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

export const findFilemakerCampaignColdRecipients = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
  minSendsWithoutEngagement?: number;
}): FilemakerCampaignColdRecipient[] => {
  const minSendsWithoutEngagement =
    input.minSendsWithoutEngagement ?? DEFAULT_MIN_SENDS_WITHOUT_ENGAGEMENT;
  if (minSendsWithoutEngagement <= 0) return [];

  const deliveryAddressById = new Map<string, string>();
  for (const delivery of input.deliveries) {
    deliveryAddressById.set(delivery.id, normalizeAddress(delivery.emailAddress));
  }

  const engagedAddresses = new Set<string>();
  for (const event of input.events) {
    if (event.type !== 'opened' && event.type !== 'clicked') continue;
    const deliveryId = event.deliveryId ?? '';
    if (!deliveryId) continue;
    const address = deliveryAddressById.get(deliveryId);
    if (address) engagedAddresses.add(address);
  }

  const sendStats = new Map<string, { sentCount: number; lastSentAt: string | null }>();
  for (const delivery of input.deliveries) {
    if (delivery.status !== 'sent') continue;
    const address = normalizeAddress(delivery.emailAddress);
    if (!address) continue;
    const previous = sendStats.get(address) ?? { sentCount: 0, lastSentAt: null };
    const lastSentAt =
      delivery.sentAt &&
      (!previous.lastSentAt || Date.parse(delivery.sentAt) > Date.parse(previous.lastSentAt))
        ? delivery.sentAt
        : previous.lastSentAt;
    sendStats.set(address, {
      sentCount: previous.sentCount + 1,
      lastSentAt,
    });
  }

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
    const existing = registry.entries.find(
      (entry) => normalizeAddress(entry.emailAddress) === candidate.emailAddress
    );
    if (existing) {
      skippedCount += 1;
      continue;
    }
    registry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry,
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress: candidate.emailAddress,
        reason: 'cold',
        actor: input?.actor ?? 'system',
        notes: `Auto-pruned: ${candidate.sentCount} consecutive sends without an open or click${
          candidate.lastSentAt ? `, last sent ${candidate.lastSentAt}` : ''
        }.`,
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
