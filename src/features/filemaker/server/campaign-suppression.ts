import 'server-only';

import {
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
} from '../settings-constants';
import {
  parseFilemakerEmailCampaignSuppressionRegistry,
} from '../settings/campaign-factories';
import type { FilemakerEmailCampaignSuppressionEntry } from '../types/campaigns';

import { readFilemakerCampaignSettingValue } from './campaign-settings-store';

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
