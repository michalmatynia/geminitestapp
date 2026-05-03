import 'server-only';
/* eslint-disable max-lines-per-function, complexity */

import { createCustomPlaywrightInstance } from '@/features/playwright/server/instances';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import {
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
  type FilemakerOrganizationPresenceScrapePayload,
  type FilemakerOrganizationPresenceSocialProfile,
  type FilemakerOrganizationPresenceWebsite,
} from '@/shared/lib/browser-execution';
import { notFoundError } from '@/shared/errors/app-error';

import type { MongoFilemakerWebsite } from '../filemaker-websites.types';
import type { FilemakerOrganization } from '../types';
import { getMongoFilemakerOrganizationById } from './filemaker-organizations-repository';
import {
  listMongoFilemakerWebsitesForOrganization,
  upsertMongoFilemakerOrganizationWebsiteDiscovery,
  type MongoFilemakerOrganizationWebsiteDiscoveryResult,
} from './filemaker-website-repository';

export type FilemakerOrganizationPresenceScrapeResult = {
  organizationId: string;
  organizationName: string;
  persisted: MongoFilemakerOrganizationWebsiteDiscoveryResult;
  runId: string | null;
  runtimeKey: typeof FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY;
  seedWebsites: string[];
  socialProfiles: FilemakerOrganizationPresenceSocialProfile[];
  visitedUrls: string[];
  warnings: string[];
  websites: FilemakerOrganizationPresenceWebsite[];
};

const normalizeWebsiteUrl = (website: MongoFilemakerWebsite): string | null => {
  const normalized = website.normalizedUrl?.trim() ?? '';
  const raw = normalized.length > 0 ? normalized : website.url;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === 'string'))
    : [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePresenceWebsites = (value: unknown): FilemakerOrganizationPresenceWebsite[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      confidence: normalizeNumber(entry['confidence'], 0),
      reason: typeof entry['reason'] === 'string' ? entry['reason'] : null,
      sourceUrl: typeof entry['sourceUrl'] === 'string' ? entry['sourceUrl'] : null,
      title: typeof entry['title'] === 'string' ? entry['title'] : null,
      url: typeof entry['url'] === 'string' ? entry['url'] : '',
    }))
    .filter((entry) => entry.url.trim().length > 0);
};

const normalizePresenceSocialProfiles = (
  value: unknown
): FilemakerOrganizationPresenceSocialProfile[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      confidence: normalizeNumber(entry['confidence'], 0),
      platform: typeof entry['platform'] === 'string' ? entry['platform'] : 'unknown',
      sourceUrl: typeof entry['sourceUrl'] === 'string' ? entry['sourceUrl'] : null,
      title: typeof entry['title'] === 'string' ? entry['title'] : null,
      url: typeof entry['url'] === 'string' ? entry['url'] : '',
    }))
    .filter((entry) => entry.url.trim().length > 0);
};

const readRunReturnValue = (result: unknown): unknown =>
  isRecord(result) ? result['returnValue'] : null;

const parsePresencePayload = (value: unknown): Pick<
  FilemakerOrganizationPresenceScrapeResult,
  'socialProfiles' | 'visitedUrls' | 'warnings' | 'websites'
> => {
  const record = isRecord(value) ? value : {};
  return {
    socialProfiles: normalizePresenceSocialProfiles(record['socialProfiles']),
    visitedUrls: normalizeStringArray(record['visitedUrls']),
    warnings: normalizeStringArray(record['warnings']),
    websites: normalizePresenceWebsites(record['websites']),
  };
};

const buildOrganizationSearchStartUrl = (organization: FilemakerOrganization): string => {
  const query = [organization.name, organization.tradingName, organization.city, organization.taxId]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
};

const toOrganizationInput = (organization: FilemakerOrganization): Record<string, unknown> => ({
  id: organization.id,
  name: organization.name,
  tradingName: organization.tradingName ?? null,
  taxId: organization.taxId ?? null,
  krs: organization.krs ?? null,
  city: organization.city,
  postalCode: organization.postalCode,
  street: organization.street,
  streetNumber: organization.streetNumber,
});

export const runFilemakerOrganizationPresenceScrapeForOrganization = async (input: {
  existingWebsites?: MongoFilemakerWebsite[];
  maxPages?: number;
  maxSearchResults?: number;
  organization: FilemakerOrganization;
}): Promise<FilemakerOrganizationPresenceScrapeResult> => {
  const linkedWebsites =
    input.existingWebsites ?? (await listMongoFilemakerWebsitesForOrganization(input.organization));
  const seedWebsites = uniqueStrings(
    linkedWebsites
      .map(normalizeWebsiteUrl)
      .filter((url): url is string => url !== null)
  );
  const startUrl = seedWebsites[0] ?? buildOrganizationSearchStartUrl(input.organization);
  const run = await runPlaywrightEngineTask({
    request: {
      startUrl,
      input: {
        organization: toOrganizationInput(input.organization),
        seedWebsites,
        maxPages: input.maxPages ?? 6,
        maxSearchResults: input.maxSearchResults ?? 8,
        runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
      },
      actionId: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
      actionName: 'Filemaker organisation website and social scrape',
      runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
      browserEngine: 'chromium',
      timeoutMs: 150_000,
      preventNewPages: true,
    },
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: `Filemaker organisation website/social scrape: ${input.organization.name}`,
      tags: ['filemaker', 'organization', 'website-social-scrape', 'playwright'],
    }),
  });

  if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
    return {
      organizationId: input.organization.id,
      organizationName: input.organization.name,
      persisted: { linked: [], skipped: [] },
      runId: run.runId,
      runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
      seedWebsites,
      socialProfiles: [],
      visitedUrls: [],
      warnings: [run.error ?? `Scrape run status=${run.status}`, ...normalizeStringArray(run.logs)],
      websites: [],
    };
  }

  const parsed = parsePresencePayload(
    readRunReturnValue(run.result) as FilemakerOrganizationPresenceScrapePayload | null
  );
  const persisted = await upsertMongoFilemakerOrganizationWebsiteDiscovery({
    organization: input.organization,
    runId: run.runId,
    socialProfiles: parsed.socialProfiles,
    websites: parsed.websites,
  });

  return {
    organizationId: input.organization.id,
    organizationName: input.organization.name,
    persisted,
    runId: run.runId,
    runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
    seedWebsites,
    ...parsed,
  };
};

export const runFilemakerOrganizationPresenceScrape = async (input: {
  maxPages?: number;
  maxSearchResults?: number;
  organizationId: string;
}): Promise<FilemakerOrganizationPresenceScrapeResult> => {
  const organization = await getMongoFilemakerOrganizationById(input.organizationId);
  if (!organization) {
    throw notFoundError(`Filemaker organisation ${input.organizationId} not found.`, {
      organizationId: input.organizationId,
    });
  }
  return runFilemakerOrganizationPresenceScrapeForOrganization({
    maxPages: input.maxPages,
    maxSearchResults: input.maxSearchResults,
    organization,
  });
};
