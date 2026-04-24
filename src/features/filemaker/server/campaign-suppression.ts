import 'server-only';

import {
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
} from '../settings-constants';
import {
  createFilemakerEmailCampaignSuppressionEntry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings/campaign-factories';
import type { FilemakerEmailCampaignSuppressionEntry } from '../types/campaigns';

import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const loadFilemakerMailSuppressionEntries = async (): Promise<
  FilemakerEmailCampaignSuppressionEntry[]
> => {
  const raw = await readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);
  return parseFilemakerEmailCampaignSuppressionRegistry(raw).entries;
};

export const findFilemakerMailSuppressionEntry = async (
  emailAddress: string
): Promise<FilemakerEmailCampaignSuppressionEntry | null> => {
  const target = normalizeAddress(emailAddress);
  if (!target) return null;
  const entries = await loadFilemakerMailSuppressionEntries();
  return (
    entries.find((entry) => normalizeAddress(entry.emailAddress) === target) ?? null
  );
};

export const filterFilemakerMailSuppressionEntries = async (
  emailAddresses: string[]
): Promise<FilemakerEmailCampaignSuppressionEntry[]> => {
  const targets = new Set(emailAddresses.map(normalizeAddress).filter(Boolean));
  if (targets.size === 0) return [];
  const entries = await loadFilemakerMailSuppressionEntries();
  return entries.filter((entry) => targets.has(normalizeAddress(entry.emailAddress)));
};

export const isFilemakerMailAddressSuppressed = async (
  emailAddress: string
): Promise<boolean> => Boolean(await findFilemakerMailSuppressionEntry(emailAddress));

export const recordFilemakerMailBounceSuppressions = async (input: {
  addresses: string[];
  notes: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
}): Promise<{ addedCount: number; skippedCount: number }> => {
  const targets = Array.from(
    new Set(input.addresses.map(normalizeAddress).filter(Boolean))
  );
  if (targets.length === 0) return { addedCount: 0, skippedCount: 0 };

  const raw = await readFilemakerCampaignSettingValue(
    FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY
  );
  let registry = parseFilemakerEmailCampaignSuppressionRegistry(raw);
  const nowIso = new Date().toISOString();
  let addedCount = 0;
  let skippedCount = 0;

  for (const emailAddress of targets) {
    const existing = registry.entries.find(
      (entry) => normalizeAddress(entry.emailAddress) === emailAddress
    );
    if (existing) {
      skippedCount += 1;
      continue;
    }
    registry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry,
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress,
        reason: 'bounced',
        actor: 'system',
        campaignId: input.campaignId ?? null,
        runId: input.runId ?? null,
        deliveryId: input.deliveryId ?? null,
        notes: input.notes,
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

  return { addedCount, skippedCount };
};

export const removeFilemakerMailSuppressionEntry = async (
  emailAddress: string
): Promise<{ removed: boolean; entry: FilemakerEmailCampaignSuppressionEntry | null }> => {
  const target = normalizeAddress(emailAddress);
  if (!target) return { removed: false, entry: null };

  const raw = await readFilemakerCampaignSettingValue(
    FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY
  );
  const registry = parseFilemakerEmailCampaignSuppressionRegistry(raw);
  const removed = registry.entries.find(
    (entry) => normalizeAddress(entry.emailAddress) === target
  );
  if (!removed) return { removed: false, entry: null };

  const nextRegistry = {
    ...registry,
    entries: registry.entries.filter(
      (entry) => normalizeAddress(entry.emailAddress) !== target
    ),
  };
  await upsertFilemakerCampaignSettingValue(
    FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
    JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(nextRegistry))
  );
  return { removed: true, entry: removed };
};
