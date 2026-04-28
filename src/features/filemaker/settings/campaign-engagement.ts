import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignSuppressionEntry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import {
  createFilemakerEmailCampaignSuppressionEntry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from './campaign-suppression-factories.helpers';

export interface EmailEngagementCounters {
  emailAddress: string;
  sends: number;
  opens: number;
  clicks: number;
  consecutiveSendsSinceEngagement: number;
  lastSendAt: string | null;
  lastEngagementAt: string | null;
}

export interface EmailEngagementSnapshot {
  countersByEmailAddress: Map<string, EmailEngagementCounters>;
}

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const sortEventsChronologically = (
  events: FilemakerEmailCampaignEvent[]
): FilemakerEmailCampaignEvent[] =>
  events.slice().sort((left, right) => {
    const leftAt = Date.parse(left.createdAt ?? '');
    const rightAt = Date.parse(right.createdAt ?? '');
    const safeLeft = Number.isFinite(leftAt) ? leftAt : 0;
    const safeRight = Number.isFinite(rightAt) ? rightAt : 0;
    if (safeLeft !== safeRight) return safeLeft - safeRight;
    return left.id.localeCompare(right.id);
  });

const ensureCounter = (
  counters: Map<string, EmailEngagementCounters>,
  emailAddress: string
): EmailEngagementCounters => {
  const existing = counters.get(emailAddress);
  if (existing) return existing;
  const created: EmailEngagementCounters = {
    emailAddress,
    sends: 0,
    opens: 0,
    clicks: 0,
    consecutiveSendsSinceEngagement: 0,
    lastSendAt: null,
    lastEngagementAt: null,
  };
  counters.set(emailAddress, created);
  return created;
};

interface ComputeEngagementSnapshotInput {
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
}

export const computeEngagementSnapshot = (
  input: ComputeEngagementSnapshotInput
): EmailEngagementSnapshot => {
  const counters = new Map<string, EmailEngagementCounters>();

  // Index deliveries by id for fast lookup. Each delivery exposes its email address.
  const deliveryById = new Map<string, FilemakerEmailCampaignDelivery>();
  input.deliveryRegistry.deliveries.forEach((delivery) => {
    deliveryById.set(delivery.id, delivery);
  });

  const sortedEvents = sortEventsChronologically(input.eventRegistry.events);

  sortedEvents.forEach((event) => {
    if (!event.deliveryId) return;
    const delivery = deliveryById.get(event.deliveryId);
    if (!delivery) return;
    const address = normalizeAddress(delivery.emailAddress);
    if (!address) return;
    const counter = ensureCounter(counters, address);

    switch (event.type) {
      case 'delivery_sent': {
        counter.sends += 1;
        counter.consecutiveSendsSinceEngagement += 1;
        counter.lastSendAt = event.createdAt ?? null;
        return;
      }
      case 'opened': {
        counter.opens += 1;
        counter.consecutiveSendsSinceEngagement = 0;
        counter.lastEngagementAt = event.createdAt ?? null;
        return;
      }
      case 'clicked': {
        counter.clicks += 1;
        counter.consecutiveSendsSinceEngagement = 0;
        counter.lastEngagementAt = event.createdAt ?? null;
        return;
      }
      default:
        return;
    }
  });

  return { countersByEmailAddress: counters };
};

export interface ColdAddressEntry {
  emailAddress: string;
  sends: number;
  consecutiveSendsSinceEngagement: number;
  lastSendAt: string | null;
}

export const findColdAddresses = (
  snapshot: EmailEngagementSnapshot,
  options: {
    minSends: number;
    consecutiveSendsThreshold: number;
    excludeAddresses?: ReadonlySet<string>;
  }
): ColdAddressEntry[] => {
  const exclude = options.excludeAddresses ?? new Set<string>();
  const cold: ColdAddressEntry[] = [];
  snapshot.countersByEmailAddress.forEach((counter, emailAddress) => {
    if (exclude.has(emailAddress)) return;
    if (counter.sends < options.minSends) return;
    if (counter.consecutiveSendsSinceEngagement < options.consecutiveSendsThreshold) return;
    cold.push({
      emailAddress,
      sends: counter.sends,
      consecutiveSendsSinceEngagement: counter.consecutiveSendsSinceEngagement,
      lastSendAt: counter.lastSendAt,
    });
  });
  return cold.sort((left, right) =>
    right.consecutiveSendsSinceEngagement - left.consecutiveSendsSinceEngagement
  );
};

export const FILEMAKER_CAMPAIGN_DEFAULT_COLD_THRESHOLD = 5;
export const FILEMAKER_CAMPAIGN_DEFAULT_COLD_MIN_SENDS = 3;

export interface AutoSuppressColdAddressesInput {
  snapshot: EmailEngagementSnapshot;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  campaignId?: string | null;
  runId?: string | null;
  actor?: string | null;
  consecutiveSendsThreshold?: number;
  minSends?: number;
}

export interface AutoSuppressColdAddressesResult {
  nextRegistry: FilemakerEmailCampaignSuppressionRegistry;
  addedEntries: FilemakerEmailCampaignSuppressionEntry[];
}

export const autoSuppressColdAddresses = (
  input: AutoSuppressColdAddressesInput
): AutoSuppressColdAddressesResult => {
  const consecutiveSendsThreshold =
    input.consecutiveSendsThreshold ?? FILEMAKER_CAMPAIGN_DEFAULT_COLD_THRESHOLD;
  const minSends = input.minSends ?? FILEMAKER_CAMPAIGN_DEFAULT_COLD_MIN_SENDS;

  const alreadySuppressed = new Set(
    input.suppressionRegistry.entries.map((entry) => entry.emailAddress.trim().toLowerCase())
  );

  const cold = findColdAddresses(input.snapshot, {
    minSends,
    consecutiveSendsThreshold,
    excludeAddresses: alreadySuppressed,
  });

  if (cold.length === 0) {
    return { nextRegistry: input.suppressionRegistry, addedEntries: [] };
  }

  let nextRegistry = input.suppressionRegistry;
  const addedEntries: FilemakerEmailCampaignSuppressionEntry[] = [];

  cold.forEach((entry) => {
    const newEntry = createFilemakerEmailCampaignSuppressionEntry({
      emailAddress: entry.emailAddress,
      reason: 'cold',
      actor: input.actor ?? null,
      notes: `Auto-suppressed after ${entry.consecutiveSendsSinceEngagement} consecutive sends without engagement (last send ${entry.lastSendAt ?? 'unknown'}).`,
      campaignId: input.campaignId ?? null,
      runId: input.runId ?? null,
      deliveryId: null,
    });
    nextRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry: nextRegistry,
      entry: newEntry,
    });
    addedEntries.push(newEntry);
  });

  return { nextRegistry, addedEntries };
};
