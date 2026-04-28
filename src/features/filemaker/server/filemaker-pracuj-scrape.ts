import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop */

import { randomUUID } from 'crypto';

import { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';
import {
  collectJobBoardOfferUrls,
  extractJobBoardExternalIdFromUrl,
  isJobBoardOfferUrl,
} from '@/features/job-board/server/providers/job-board-sync';
import { getFilemakerOrganizationsCollection } from '@/features/filemaker/server/filemaker-organizations-mongo';
import type { JobScanEvaluation } from '@/shared/contracts/job-board';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';
import {
  resolveJobBoardProvider,
  type JobBoardProvider,
} from '@/shared/lib/job-board/job-board-providers';

import {
  filemakerPracujScrapeRequestSchema,
  type FilemakerPracujOrganizationMatch,
  type FilemakerPracujScrapeOfferResult,
  type FilemakerPracujScrapeRequest,
  type FilemakerPracujScrapeResponse,
  type FilemakerPracujScrapedOffer,
} from '../filemaker-pracuj-scrape-contracts';
import {
  createFilemakerJobListing,
  createFilemakerOrganization,
  normalizeFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import type { FilemakerDatabase, FilemakerJobListing, FilemakerOrganization } from '../types';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { toFilemakerOrganization } from './filemaker-organizations-mongo';

type LoadedDatabase = {
  database: FilemakerDatabase;
  rawValue: string | null;
};

type OrganizationCandidate = {
  organization: FilemakerOrganization;
  normalizedNames: string[];
  tokens: string[];
};

type ApplyImportInput = {
  candidates: OrganizationCandidate[];
  database: FilemakerDatabase;
  options: FilemakerPracujScrapeRequest;
  offers: FilemakerPracujScrapedOffer[];
};

type CentralizedScrapeResult = {
  offers: FilemakerPracujScrapedOffer[];
  provider: JobBoardProvider;
  runId: string | null;
  sourceSite: string;
  warnings: string[];
};

const DEFAULT_WARNINGS: string[] = [];

const sleep = async (delayMs: number): Promise<void> => {
  if (delayMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toNullableString = (value: unknown): string | null => {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
};

const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeSalaryPeriod = (value: unknown): FilemakerPracujScrapedOffer['salaryPeriod'] => {
  const normalized = toStringValue(value).toLowerCase();
  return normalized === 'hourly' || normalized === 'yearly' || normalized === 'fixed'
    ? normalized
    : 'monthly';
};

const normalizeJobBoardSourceUrl = (value: unknown): string | null => {
  const raw = toStringValue(value);
  if (raw.length === 0) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const recordString = (record: Record<string, unknown> | null, key: string): string =>
  toStringValue(record?.[key]);

const recordNullableString = (record: Record<string, unknown> | null, key: string): string | null =>
  toNullableString(record?.[key]);

const salaryFromListing = (
  listing: Record<string, unknown> | null,
  extractSalaries: boolean
): Pick<
  FilemakerPracujScrapedOffer,
  'salaryCurrency' | 'salaryMax' | 'salaryMin' | 'salaryPeriod' | 'salaryText'
> => {
  if (!extractSalaries) {
    return {
      salaryCurrency: null,
      salaryMax: null,
      salaryMin: null,
      salaryPeriod: 'monthly',
      salaryText: '',
    };
  }
  const salary = asRecord(listing?.['salary']);
  return {
    salaryCurrency: recordNullableString(salary, 'currency'),
    salaryMax: toNullableNumber(salary?.['max']),
    salaryMin: toNullableNumber(salary?.['min']),
    salaryPeriod: normalizeSalaryPeriod(salary?.['period']),
    salaryText: recordString(salary, 'raw'),
  };
};

const locationFromListing = (listing: Record<string, unknown> | null): string =>
  uniqueStrings([
    recordString(listing, 'city'),
    recordString(listing, 'region'),
    recordString(listing, 'country'),
  ]).join(', ');

const offerFromEvaluation = (input: {
  evaluation: JobScanEvaluation;
  finalUrl: string;
  options: FilemakerPracujScrapeRequest;
  provider: JobBoardProvider;
  sourceSite: string;
}): FilemakerPracujScrapedOffer | null => {
  const evaluation = input.evaluation;
  const listing = asRecord(evaluation?.listing);
  const company = asRecord(evaluation?.company);
  const sourceUrl = normalizeJobBoardSourceUrl(input.finalUrl);
  const title = recordString(listing, 'title');
  const companyName = recordString(company, 'name');
  if (sourceUrl === null || title.length === 0 || companyName.length === 0) return null;
  const salary = salaryFromListing(listing, input.options.extractSalaries);
  return {
    companyName,
    description: input.options.extractDescriptions ? recordString(listing, 'description') : '',
    expiresAt: recordNullableString(listing, 'expiresAt'),
    location: locationFromListing(listing),
    postedAt: recordNullableString(listing, 'postedAt'),
    salaryCurrency: salary.salaryCurrency,
    salaryMax: salary.salaryMax,
    salaryMin: salary.salaryMin,
    salaryPeriod: salary.salaryPeriod,
    salaryText: salary.salaryText,
    sourceExternalId: extractJobBoardExternalIdFromUrl(sourceUrl, input.provider),
    sourceSite: input.sourceSite,
    sourceUrl,
    title,
  };
};

const loadFilemakerDatabase = async (): Promise<LoadedDatabase> => {
  const rawValue = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (rawValue === null || rawValue.trim().length === 0) {
    return { database: normalizeFilemakerDatabase(null), rawValue: null };
  }
  const decoded = decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue);
  try {
    return {
      database: normalizeFilemakerDatabase(JSON.parse(decoded) as unknown),
      rawValue,
    };
  } catch {
    return { database: normalizeFilemakerDatabase(null), rawValue };
  }
};

const normalizeNameForMatch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(spolka|sp|zoo|z o o|s a|sa|inc|ltd|llc|gmbh|fundacja|stowarzyszenie)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeName = (value: string): string[] =>
  uniqueStrings(normalizeNameForMatch(value).split(' ').filter((token) => token.length >= 3));

const buildCandidate = (organization: FilemakerOrganization): OrganizationCandidate => {
  const names = uniqueStrings([organization.name, organization.tradingName ?? '']);
  return {
    organization,
    normalizedNames: names.map(normalizeNameForMatch).filter(Boolean),
    tokens: uniqueStrings(names.flatMap(tokenizeName)),
  };
};

const scoreTokens = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token)).length;
  return Math.round((overlap / Math.max(left.length, right.length)) * 100);
};

const scoreCandidate = (
  companyName: string,
  candidate: OrganizationCandidate
): FilemakerPracujOrganizationMatch | null => {
  const normalizedCompany = normalizeNameForMatch(companyName);
  if (normalizedCompany.length === 0) return null;
  let best = 0;
  let reason = 'token overlap';
  candidate.normalizedNames.forEach((name: string): void => {
    if (name === normalizedCompany) {
      best = Math.max(best, 100);
      reason = 'exact name match';
    } else if (name.includes(normalizedCompany) || normalizedCompany.includes(name)) {
      best = Math.max(best, 92);
      reason = 'contained name match';
    } else {
      best = Math.max(best, scoreTokens(tokenizeName(normalizedCompany), candidate.tokens));
    }
  });
  if (best <= 0) return null;
  return {
    confidence: best,
    organizationId: candidate.organization.id,
    organizationName: candidate.organization.name,
    reason,
  };
};

const findBestMatch = (
  offer: FilemakerPracujScrapedOffer,
  candidates: OrganizationCandidate[],
  minimumMatchConfidence: number
): FilemakerPracujOrganizationMatch | null => {
  const matches = candidates
    .map((candidate: OrganizationCandidate): FilemakerPracujOrganizationMatch | null =>
      scoreCandidate(offer.companyName, candidate)
    )
    .filter((match): match is FilemakerPracujOrganizationMatch => match !== null)
    .sort((left, right) => right.confidence - left.confidence);
  const best = matches[0] ?? null;
  return best && best.confidence >= minimumMatchConfidence ? best : null;
};

const listMongoCandidateOrganizations = async (
  selectedOrganizationIds: readonly string[],
  selectedOnly: boolean
): Promise<FilemakerOrganization[]> => {
  try {
    const collection = await getFilemakerOrganizationsCollection();
    const filter =
      selectedOnly && selectedOrganizationIds.length > 0
        ? { id: { $in: [...selectedOrganizationIds] } }
        : {};
    const documents = await collection.find(filter).limit(10_000).toArray();
    return documents.map(toFilemakerOrganization);
  } catch {
    return [];
  }
};

const loadOrganizationCandidates = async (
  database: FilemakerDatabase,
  options: FilemakerPracujScrapeRequest
): Promise<OrganizationCandidate[]> => {
  const selectedOnly = options.organizationScope === 'selected';
  const selectedIds = new Set(options.selectedOrganizationIds);
  const organizationsById = new Map<string, FilemakerOrganization>();
  database.organizations.forEach((organization: FilemakerOrganization): void => {
    if (!selectedOnly || selectedIds.has(organization.id)) {
      organizationsById.set(organization.id, organization);
    }
  });
  const mongoOrganizations = await listMongoCandidateOrganizations(
    options.selectedOrganizationIds,
    selectedOnly
  );
  mongoOrganizations.forEach((organization: FilemakerOrganization): void => {
    if (!selectedOnly || selectedIds.has(organization.id)) {
      organizationsById.set(organization.id, organization);
    }
  });
  return Array.from(organizationsById.values()).map(buildCandidate);
};

const buildListingId = (organizationId: string, offer: FilemakerPracujScrapedOffer): string => {
  const stablePart = offer.sourceExternalId ?? `${offer.title}-${offer.location}`;
  const slug = normalizeNameForMatch(`${organizationId}-${stablePart}`).replace(/\s+/g, '-');
  return `filemaker-job-board-job-${slug.length > 0 ? slug : randomUUID()}`;
};

const normalizeDedupeKey = (value: string): string => normalizeNameForMatch(value);

const findExistingListingIndex = (
  listings: readonly FilemakerJobListing[],
  organizationId: string,
  offer: FilemakerPracujScrapedOffer
): number => {
  const titleKey = normalizeDedupeKey(`${organizationId} ${offer.title} ${offer.location}`);
  return listings.findIndex((listing: FilemakerJobListing): boolean => {
    if (listing.organizationId !== organizationId) return false;
    if (offer.sourceExternalId !== null && listing.sourceExternalId === offer.sourceExternalId) return true;
    if (offer.sourceUrl.length > 0 && listing.sourceUrl === offer.sourceUrl) return true;
    return normalizeDedupeKey(`${listing.organizationId} ${listing.title} ${listing.location ?? ''}`) === titleKey;
  });
};

const toJobListing = (input: {
  existing?: FilemakerJobListing;
  offer: FilemakerPracujScrapedOffer;
  options: FilemakerPracujScrapeRequest;
  organizationId: string;
}): FilemakerJobListing => {
  const now = new Date().toISOString();
  return createFilemakerJobListing({
    id: input.existing?.id ?? buildListingId(input.organizationId, input.offer),
    organizationId: input.organizationId,
    title: input.offer.title,
    description: input.offer.description,
    location: input.offer.location,
    salaryCurrency: input.offer.salaryCurrency ?? undefined,
    salaryMax: input.offer.salaryMax,
    salaryMin: input.offer.salaryMin,
    salaryPeriod: input.offer.salaryPeriod,
    status: input.existing?.status ?? input.options.status,
    targetedCampaignIds: input.existing?.targetedCampaignIds ?? [],
    lastTargetedAt: input.existing?.lastTargetedAt,
    sourceExternalId: input.offer.sourceExternalId ?? undefined,
    sourceSite: input.offer.sourceSite,
    sourceUrl: input.offer.sourceUrl,
    scrapedAt: now,
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
  });
};

const createUnmatchedOrganization = (
  database: FilemakerDatabase,
  companyName: string
): FilemakerOrganization => {
  const now = new Date().toISOString();
  const organization = createFilemakerOrganization({
    id: `filemaker-job-board-organization-${randomUUID()}`,
    name: companyName,
    updatedBy: 'filemaker:job-board-scrape',
    createdAt: now,
    updatedAt: now,
  });
  database.organizations.push(organization);
  return organization;
};

const upsertMongoOrganizationForCreatedCandidate = async (
  organization: FilemakerOrganization
): Promise<void> => {
  try {
    const collection = await getFilemakerOrganizationsCollection();
    await collection.updateOne(
      { id: organization.id },
      {
        $set: {
          city: organization.city,
          id: organization.id,
          name: organization.name,
          updatedAt: organization.updatedAt,
          updatedBy: organization.updatedBy,
        },
        $setOnInsert: {
          _id: organization.id,
          createdAt: organization.createdAt,
        },
      },
      { upsert: true }
    );
  } catch {
    // Settings persistence is still useful in non-Mongo test/dev environments.
  }
};

const buildOfferResult = (
  offer: FilemakerPracujScrapedOffer,
  match: FilemakerPracujOrganizationMatch | null
): FilemakerPracujScrapeOfferResult => ({
  listingId: null,
  match,
  offer,
  reason: null,
  status: 'preview',
});

const applyImport = async ({
  candidates,
  database,
  offers,
  options,
}: ApplyImportInput): Promise<{
  changed: boolean;
  results: FilemakerPracujScrapeOfferResult[];
}> => {
  let changed = false;
  const candidateList = [...candidates];
  const results: FilemakerPracujScrapeOfferResult[] = [];

  for (const offer of offers) {
    let match = findBestMatch(offer, candidateList, options.minimumMatchConfidence);
    if (!match && options.importStrategy === 'create_unmatched') {
      const createdOrganization = createUnmatchedOrganization(database, offer.companyName);
      await upsertMongoOrganizationForCreatedCandidate(createdOrganization);
      const candidate = buildCandidate(createdOrganization);
      candidateList.push(candidate);
      match = {
        confidence: 100,
        organizationId: createdOrganization.id,
        organizationName: createdOrganization.name,
        reason: 'created from scraped job-board employer',
      };
      changed = true;
    }
    if (!match) {
      results.push({
        listingId: null,
        match: null,
        offer,
        reason: 'No organisation matched the employer name.',
        status: 'unmatched',
      });
      continue;
    }

    const existingIndex = findExistingListingIndex(database.jobListings, match.organizationId, offer);
    const existing = existingIndex >= 0 ? database.jobListings[existingIndex] : undefined;
    if (existing && options.duplicateStrategy === 'skip') {
      results.push({
        listingId: existing.id,
        match,
        offer,
        reason: `A matching ${offer.sourceSite} listing already exists.`,
        status: 'skipped',
      });
      continue;
    }

    const listing = toJobListing({
      existing: options.duplicateStrategy === 'update' ? existing : undefined,
      offer,
      options,
      organizationId: match.organizationId,
    });
    if (existing && options.duplicateStrategy === 'update') {
      database.jobListings.splice(existingIndex, 1, listing);
      results.push({ listingId: listing.id, match, offer, reason: null, status: 'updated' });
    } else {
      database.jobListings.push(listing);
      results.push({ listingId: listing.id, match, offer, reason: null, status: 'created' });
    }
    changed = true;
  }

  return { changed, results };
};

const buildSummary = (
  offers: readonly FilemakerPracujScrapeOfferResult[]
): FilemakerPracujScrapeResponse['summary'] => ({
  createdListings: offers.filter((offer) => offer.status === 'created').length,
  matchedOffers: offers.filter((offer) => offer.match !== null).length,
  scrapedOffers: offers.length,
  skippedOffers: offers.filter((offer) => offer.status === 'skipped').length,
  unmatchedOffers: offers.filter((offer) => offer.status === 'unmatched').length,
  updatedListings: offers.filter((offer) => offer.status === 'updated').length,
});

const collectOfferLinks = async (
  options: FilemakerPracujScrapeRequest
): Promise<{
  provider: JobBoardProvider;
  runId: string | null;
  sourceSite: string;
  urls: string[];
  warnings: string[];
}> => {
  const provider = resolveJobBoardProvider(options.sourceUrl, options.provider);
  if (provider === null) {
    throw badRequestError('Unsupported job board provider.');
  }
  const collected = await collectJobBoardOfferUrls({
    delayMs: options.delayMs,
    headless: options.headless,
    humanizeMouse: options.humanizeMouse,
    maxOffers: options.maxOffers,
    maxPages: options.maxPages,
    personaId: options.personaId,
    provider,
    sourceUrl: options.sourceUrl,
    timeoutMs: options.timeoutMs,
  });
  const urls = uniqueStrings(collected.links.map((link) => link.url));
  if (urls.length === 0 && isJobBoardOfferUrl(options.sourceUrl, provider)) {
    urls.push(options.sourceUrl);
  }
  return {
    provider,
    runId: collected.runId,
    sourceSite: collected.sourceSite,
    urls: urls.slice(0, options.maxOffers),
    warnings: collected.warnings,
  };
};

const scrapeOffersViaJobBoardSequencer = async (
  options: FilemakerPracujScrapeRequest
): Promise<CentralizedScrapeResult> => {
  const collected = await collectOfferLinks(options);
  const offers: FilemakerPracujScrapedOffer[] = [];
  const warnings = [...collected.warnings];
  let runId = collected.runId;

  for (const url of collected.urls) {
    const probe = await probeJobBoardOffer({
      forcePlaywright: true,
      headless: options.headless,
      humanizeMouse: options.humanizeMouse,
      personaId: options.personaId,
      provider: collected.provider,
      sourceUrl: url,
      timeoutMs: options.timeoutMs,
    });
    runId = runId ?? probe.runId;
    const offer = offerFromEvaluation({
      evaluation: probe.evaluation,
      finalUrl: probe.finalUrl,
      options,
      provider: probe.provider,
      sourceSite: probe.sourceSite,
    });
    if (offer) {
      offers.push(offer);
    } else {
      warnings.push(probe.error ?? `Could not extract a job offer from ${url}.`);
    }
    await sleep(options.delayMs);
  }

  return {
    offers,
    provider: collected.provider,
    runId,
    sourceSite: collected.sourceSite,
    warnings,
  };
};

export const runFilemakerPracujScrape = async (
  rawInput: unknown
): Promise<FilemakerPracujScrapeResponse> => {
  const parsed = filemakerPracujScrapeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw badRequestError('Invalid job-board scrape request.', { issues: parsed.error.issues });
  }
  const options = parsed.data;
  if (options.organizationScope === 'selected' && options.selectedOrganizationIds.length === 0) {
    throw badRequestError('Select at least one organisation or use all organisations.');
  }

  const { database } = await loadFilemakerDatabase();
  const candidates = await loadOrganizationCandidates(database, options);
  const scraped = await scrapeOffersViaJobBoardSequencer(options);
  const previewResults = scraped.offers.map((offer) =>
    buildOfferResult(offer, findBestMatch(offer, candidates, options.minimumMatchConfidence))
  );

  let results = previewResults;
  if (options.mode === 'import') {
    const imported = await applyImport({ candidates, database, offers: scraped.offers, options });
    results = imported.results;
    if (imported.changed) {
      const persisted = await upsertFilemakerCampaignSettingValue(
        FILEMAKER_DATABASE_KEY,
        JSON.stringify(toPersistedFilemakerDatabase(normalizeFilemakerDatabase(database)))
      );
      if (!persisted) {
        throw internalError('Failed to persist imported job-board listings.');
      }
    }
  }

  return {
    browserMode: options.headless ? 'headless' : 'headed',
    mode: options.mode,
    offers: results,
    provider: scraped.provider,
    runId: scraped.runId,
    sourceSite: scraped.sourceSite,
    sourceUrl: options.sourceUrl,
    summary: buildSummary(results),
    warnings: scraped.warnings.length > 0 ? scraped.warnings : DEFAULT_WARNINGS,
  };
};
