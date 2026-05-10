import 'server-only';

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

type PresenceScrapeRun = Awaited<ReturnType<typeof runPlaywrightEngineTask>>;

const getWebsiteUrlCandidate = (website: MongoFilemakerWebsite): string => {
  const normalized = website.normalizedUrl?.trim() ?? '';
  return normalized.length > 0 ? normalized : website.url;
};

const parseHttpWebsiteUrl = (value: string): URL | null => {
  try {
    const parsed = new URL(value.includes('://') ? value : `https://${value}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeWebsiteUrl = (website: MongoFilemakerWebsite): string | null => {
  const trimmed = getWebsiteUrlCandidate(website).trim();
  if (trimmed.length === 0) return null;
  return parseHttpWebsiteUrl(trimmed)?.toString() ?? null;
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

const buildPresenceScrapeTask = (input: {
  maxPages?: number;
  maxSearchResults?: number;
  organization: FilemakerOrganization;
  seedWebsites: string[];
  startUrl: string;
}): Parameters<typeof runPlaywrightEngineTask>[0] => ({
  request: {
    startUrl: input.startUrl,
    input: {
      organization: toOrganizationInput(input.organization),
      seedWebsites: input.seedWebsites,
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

const isFailedPresenceScrapeRun = (run: PresenceScrapeRun): boolean =>
  run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled';

const toFailedPresenceScrapeResult = ({
  organization,
  run,
  seedWebsites,
}: {
  organization: FilemakerOrganization;
  run: PresenceScrapeRun;
  seedWebsites: string[];
}): FilemakerOrganizationPresenceScrapeResult => ({
  organizationId: organization.id,
  organizationName: organization.name,
  persisted: { linked: [], skipped: [] },
  runId: run.runId,
  runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
  seedWebsites,
  socialProfiles: [],
  visitedUrls: [],
  warnings: [run.error ?? `Scrape run status=${run.status}`, ...normalizeStringArray(run.logs)],
  websites: [],
});

const toSuccessfulPresenceScrapeResult = async ({
  organization,
  run,
  seedWebsites,
}: {
  organization: FilemakerOrganization;
  run: PresenceScrapeRun;
  seedWebsites: string[];
}): Promise<FilemakerOrganizationPresenceScrapeResult> => {
  const parsed = parsePresencePayload(
    readRunReturnValue(run.result) as FilemakerOrganizationPresenceScrapePayload | null
  );
  const persisted = await upsertMongoFilemakerOrganizationWebsiteDiscovery({
    organization,
    runId: run.runId,
    socialProfiles: parsed.socialProfiles,
    websites: parsed.websites,
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    persisted,
    runId: run.runId,
    runtimeKey: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
    seedWebsites,
    ...parsed,
  };
};

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
    ...buildPresenceScrapeTask({
      maxPages: input.maxPages,
      maxSearchResults: input.maxSearchResults,
      organization: input.organization,
      seedWebsites,
      startUrl,
    }),
  });

  if (isFailedPresenceScrapeRun(run)) {
    return toFailedPresenceScrapeResult({
      organization: input.organization,
      run,
      seedWebsites,
    });
  }

  return toSuccessfulPresenceScrapeResult({
    organization: input.organization,
    run,
    seedWebsites,
  });
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
