import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop */

import { randomUUID } from 'crypto';

import { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';
import {
  collectJobBoardOfferUrls,
  collectJobBoardOfferUrlsDeterministically,
  isJobBoardOfferUrl,
} from '@/features/job-board/server/providers/job-board-sync';
import type { FilemakerLexiconTermCategory } from '@/shared/contracts/filemaker';
import { getFilemakerOrganizationsCollection } from '@/features/filemaker/server/filemaker-organizations-mongo';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';
import {
  getJobBoardSourceSite,
  resolveJobBoardProvider,
  type JobBoardProvider,
} from '@/shared/lib/job-board/job-board-providers';

import {
  filemakerJobBoardScrapeDraftSaveRequestSchema,
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardOrganizationMatch,
  type FilemakerJobBoardDuplicateStrategy,
  type FilemakerJobBoardScrapeDraftSaveRequest,
  type FilemakerJobBoardScrapeOfferResult,
  type FilemakerJobBoardScrapeRequest,
  type FilemakerJobBoardScrapeResponse,
  type FilemakerJobBoardScrapeWriteAction,
  type FilemakerJobBoardScrapeWriteResult,
  type FilemakerJobBoardScrapedOffer,
} from '../filemaker-job-board-scrape-contracts';
import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
  createFilemakerOrganization,
  normalizeFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import type {
  FilemakerAddress,
  FilemakerAddressLink,
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerOrganization,
} from '../types';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { toFilemakerOrganization } from './filemaker-organizations-mongo';

type LoadedDatabase = {
  database: FilemakerDatabase;
  rawValue: string | null;
};

import {
  buildCandidate,
  findBestMatch,
  normalizeNameForMatch,
  type OrganizationCandidate,
} from './job-board-scrape/match-organizations';

type ApplyImportInput = {
  candidates: OrganizationCandidate[];
  database: FilemakerDatabase;
  onWrite?: (write: FilemakerJobBoardScrapeWriteResult) => Promise<void> | void;
  options: FilemakerJobBoardScrapeRequest;
  offers: FilemakerJobBoardScrapedOffer[];
};

type ImportCounters = {
  addressUpdates: number;
  createdLexiconTerms: number;
  createdOrganizations: number;
  linkedLexiconTerms: number;
  profileUpdates: number;
  updatedOrganizations: number;
};

type ImportVerification = {
  verifiedListings: number;
  warnings: string[];
};

type CentralizedScrapeResult = {
  offers: FilemakerJobBoardScrapedOffer[];
  provider: JobBoardProvider;
  runId: string | null;
  sourceSite: string;
  warnings: string[];
};

type FilemakerJobBoardScrapeRunOptions = {
  onEvent?: FilemakerJobBoardScrapeLiveEventEmitter;
  signal?: AbortSignal;
};

type ScrapeProgressHandlers = {
  onLinks?: (input: {
    provider: JobBoardProvider;
    runId: string | null;
    sourceSite: string;
    urls: string[];
  }) => Promise<void> | void;
  onOffer?: (input: {
    index: number;
    offer: FilemakerJobBoardScrapedOffer;
    total: number;
  }) => Promise<void> | void;
  onStatus?: (message: string) => Promise<void> | void;
  onWarning?: (warning: string) => Promise<void> | void;
};

const DEFAULT_WARNINGS: string[] = [];

const EMPTY_IMPORT_COUNTERS: ImportCounters = {
  addressUpdates: 0,
  createdLexiconTerms: 0,
  createdOrganizations: 0,
  linkedLexiconTerms: 0,
  profileUpdates: 0,
  updatedOrganizations: 0,
};

const EMPTY_IMPORT_VERIFICATION: ImportVerification = {
  verifiedListings: 0,
  warnings: [],
};

import {
  emitLiveEvent,
  resolveEffectiveHeadless,
  sleep,
  throwIfScrapeAborted,
  type FilemakerJobBoardScrapeLiveEventEmitter,
} from './job-board-scrape/live-events';

import {
  normalizeLexiconKey,
  uniqueStrings,
} from './job-board-scrape/normalizers';
import { offerFromEvaluation } from './job-board-scrape/offer-from-evaluation';

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

const hasLoadedFilemakerRecords = (database: FilemakerDatabase): boolean =>
  database.organizations.length > 0 || database.jobListings.length > 0;

const loadPersistedVerificationDatabase = async (
  fallbackDatabase: FilemakerDatabase
): Promise<FilemakerDatabase> => {
  const loaded = await loadFilemakerDatabase();
  if (loaded.rawValue !== null || hasLoadedFilemakerRecords(loaded.database)) {
    return loaded.database;
  }
  return normalizeFilemakerDatabase(fallbackDatabase);
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
  options: FilemakerJobBoardScrapeRequest
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

const buildListingId = (organizationId: string, offer: FilemakerJobBoardScrapedOffer): string => {
  const sourceSite = offer.sourceSite.length > 0 ? offer.sourceSite : 'job-board';
  let stablePart =
    offer.sourceUrl.length > 0 ? offer.sourceUrl : `${offer.title}-${offer.location}`;
  if (offer.sourceExternalId !== null) {
    stablePart = `${sourceSite}-${offer.sourceExternalId}`;
  }
  const slug = normalizeNameForMatch(`${organizationId}-${stablePart}`).replace(/\s+/g, '-');
  return `filemaker-job-board-job-${slug.length > 0 ? slug : randomUUID()}`;
};

import { findExistingListingIndex } from './job-board-scrape/dedupe-listings';

const toJobListing = (input: {
  existing?: FilemakerJobListing;
  offer: FilemakerJobBoardScrapedOffer;
  options: FilemakerJobBoardScrapeRequest;
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
    postedAt: input.offer.postedAt ?? undefined,
    expiresAt: input.offer.expiresAt ?? undefined,
    scrapedAt: now,
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
  });
};

const applyOfferProfileToOrganization = (
  organization: FilemakerOrganization,
  offer: FilemakerJobBoardScrapedOffer,
  now = new Date().toISOString()
): { changed: boolean; organization: FilemakerOrganization } => {
  if (offer.companyProfile.trim().length === 0) {
    return { changed: false, organization };
  }
  const next = createFilemakerOrganization({
    ...organization,
    jobBoardCompanyProfile: offer.companyProfile,
    jobBoardCompanyProfileUrl: offer.companyProfileUrl ?? undefined,
    jobBoardCompanyProfileScrapedAt: now,
    updatedBy: 'filemaker:job-board-scrape',
    updatedAt: now,
  });
  return {
    changed:
      organization.jobBoardCompanyProfile !== next.jobBoardCompanyProfile ||
      organization.jobBoardCompanyProfileUrl !== next.jobBoardCompanyProfileUrl ||
      organization.jobBoardCompanyProfileScrapedAt !== next.jobBoardCompanyProfileScrapedAt,
    organization: next,
  };
};

const applyOfferProfileToDatabaseOrganization = (
  database: FilemakerDatabase,
  organizationId: string,
  offer: FilemakerJobBoardScrapedOffer
): boolean => {
  const index = database.organizations.findIndex(
    (organization: FilemakerOrganization): boolean => organization.id === organizationId
  );
  if (index < 0) return false;
  const organization = database.organizations[index];
  if (organization === undefined) return false;
  const result = applyOfferProfileToOrganization(organization, offer);
  if (!result.changed) return false;
  database.organizations.splice(index, 1, result.organization);
  return true;
};

import {
  addressComparisonKey,
  buildJobBoardAddressId,
  buildJobBoardAddressLinkId,
  findOfferAddressPill,
  parseScrapedAddressPill,
} from './job-board-scrape/address';

type OrganizationAddressApplyResult = {
  address: FilemakerAddress | null;
  assignedDefault: boolean;
  changed: boolean;
};


const ensureAddressRecord = (
  database: FilemakerDatabase,
  organizationId: string,
  parsedAddress: Pick<
    FilemakerAddress,
    'city' | 'country' | 'countryId' | 'postalCode' | 'street' | 'streetNumber'
  >
): { address: FilemakerAddress; created: boolean } => {
  const comparisonKey = addressComparisonKey(parsedAddress);
  const existing = database.addresses.find(
    (address: FilemakerAddress): boolean => addressComparisonKey(address) === comparisonKey
  );
  if (existing !== undefined) return { address: existing, created: false };
  const address = createFilemakerAddress({
    id: buildJobBoardAddressId(organizationId, parsedAddress),
    ...parsedAddress,
  });
  database.addresses.push(address);
  return { address, created: true };
};

const ensureOrganizationAddressLink = (
  database: FilemakerDatabase,
  organizationId: string,
  addressId: string,
  isDefault: boolean
): boolean => {
  const existingIndex = database.addressLinks.findIndex(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === 'organization' &&
      link.ownerId === organizationId &&
      link.addressId === addressId
  );
  if (existingIndex >= 0) {
    const existing = database.addressLinks[existingIndex];
    if (existing === undefined || !isDefault || existing.isDefault) return false;
    database.addressLinks.splice(existingIndex, 1, {
      ...existing,
      isDefault: true,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }
  database.addressLinks.push(
    createFilemakerAddressLink({
      id: buildJobBoardAddressLinkId(organizationId, addressId),
      ownerKind: 'organization',
      ownerId: organizationId,
      addressId,
      isDefault,
    })
  );
  return true;
};

const applyOfferAddressToDatabaseOrganization = (
  database: FilemakerDatabase,
  organizationId: string,
  offer: FilemakerJobBoardScrapedOffer
): OrganizationAddressApplyResult => {
  const addressPill = findOfferAddressPill(offer);
  if (addressPill === null) return { address: null, assignedDefault: false, changed: false };
  const parsedAddress = parseScrapedAddressPill(addressPill.label);
  if (parsedAddress === null) return { address: null, assignedDefault: false, changed: false };
  const index = database.organizations.findIndex(
    (organization: FilemakerOrganization): boolean => organization.id === organizationId
  );
  if (index < 0) return { address: null, assignedDefault: false, changed: false };
  const organization = database.organizations[index];
  if (organization === undefined) return { address: null, assignedDefault: false, changed: false };
  const addressRecord = ensureAddressRecord(database, organizationId, parsedAddress);
  const shouldSetDefaultAddress = normalizeString(organization.addressId).length === 0;
  const shouldSetDisplayAddress = normalizeString(organization.displayAddressId).length === 0;
  const linkChanged = ensureOrganizationAddressLink(
    database,
    organizationId,
    addressRecord.address.id,
    shouldSetDefaultAddress
  );
  const nextOrganization = createFilemakerOrganization({
    ...organization,
    ...(shouldSetDefaultAddress ? { addressId: addressRecord.address.id } : {}),
    ...(shouldSetDisplayAddress ? { displayAddressId: addressRecord.address.id } : {}),
    ...(shouldSetDefaultAddress
      ? {
          city: addressRecord.address.city,
          country: addressRecord.address.country,
          countryId: addressRecord.address.countryId,
          postalCode: addressRecord.address.postalCode,
          street: addressRecord.address.street,
          streetNumber: addressRecord.address.streetNumber,
        }
      : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: 'filemaker:job-board-scrape',
  });
  const organizationChanged =
    JSON.stringify(organization) !== JSON.stringify(nextOrganization) &&
    (shouldSetDefaultAddress || shouldSetDisplayAddress);
  if (organizationChanged) {
    database.organizations.splice(index, 1, nextOrganization);
  }
  return {
    address: addressRecord.address,
    assignedDefault: shouldSetDefaultAddress,
    changed: addressRecord.created || linkChanged || organizationChanged,
  };
};

const createUnmatchedOrganization = (
  database: FilemakerDatabase,
  offer: FilemakerJobBoardScrapedOffer
): FilemakerOrganization => {
  const now = new Date().toISOString();
  const baseOrganization = createFilemakerOrganization({
    id: `filemaker-job-board-organization-${randomUUID()}`,
    name: offer.companyName,
    updatedBy: 'filemaker:job-board-scrape',
    createdAt: now,
    updatedAt: now,
  });
  const organization = applyOfferProfileToOrganization(baseOrganization, offer, now).organization;
  database.organizations.push(organization);
  return organization;
};

const ensureOrganizationInDatabase = (
  database: FilemakerDatabase,
  organization: FilemakerOrganization
): boolean => {
  const exists = database.organizations.some(
    (entry: FilemakerOrganization): boolean => entry.id === organization.id
  );
  if (exists) return false;
  database.organizations.push(
    createFilemakerOrganization({
      ...organization,
      updatedBy: organization.updatedBy ?? 'filemaker:job-board-scrape',
    })
  );
  return true;
};

const toOptionalMongoString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const compactMongoSetFields = (
  fields: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]): boolean => value !== undefined)
  );

const buildMongoOrganizationSetFields = (
  organization: FilemakerOrganization,
  now: string
): Record<string, unknown> =>
  compactMongoSetFields({
    addressId: toOptionalMongoString(organization.addressId),
    city: toOptionalMongoString(organization.city),
    country: toOptionalMongoString(organization.country),
    countryId: toOptionalMongoString(organization.countryId),
    displayAddressId: toOptionalMongoString(organization.displayAddressId),
    id: organization.id,
    jobBoardCompanyProfile: toOptionalMongoString(organization.jobBoardCompanyProfile),
    jobBoardCompanyProfileScrapedAt: toOptionalMongoString(
      organization.jobBoardCompanyProfileScrapedAt
    ),
    jobBoardCompanyProfileUrl: toOptionalMongoString(organization.jobBoardCompanyProfileUrl),
    name: organization.name,
    postalCode: toOptionalMongoString(organization.postalCode),
    street: toOptionalMongoString(organization.street),
    streetNumber: toOptionalMongoString(organization.streetNumber),
    tradingName: toOptionalMongoString(organization.tradingName),
    updatedAt: now,
    updatedBy: 'filemaker:job-board-scrape',
  });

const upsertMongoOrganizationForJobBoardImport = async (
  organization: FilemakerOrganization
): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const collection = await getFilemakerOrganizationsCollection();
    await collection.updateOne(
      { id: organization.id },
      {
        $set: buildMongoOrganizationSetFields(organization, now),
        $setOnInsert: {
          _id: organization.id,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  } catch {
    // Settings persistence is still useful in non-Mongo test/dev environments.
  }
};

const upsertMongoOrganizationProfile = async (
  organizationId: string,
  offer: FilemakerJobBoardScrapedOffer
): Promise<void> => {
  if (offer.companyProfile.trim().length === 0) return;
  try {
    const now = new Date().toISOString();
    const collection = await getFilemakerOrganizationsCollection();
    await collection.updateOne(
      { id: organizationId },
      {
        $set: {
          jobBoardCompanyProfile: offer.companyProfile,
          ...(offer.companyProfileUrl !== null
            ? { jobBoardCompanyProfileUrl: offer.companyProfileUrl }
            : {}),
          jobBoardCompanyProfileScrapedAt: now,
          updatedAt: now,
          updatedBy: 'filemaker:job-board-scrape',
        },
      }
    );
  } catch {
    // Settings persistence is still useful in non-Mongo test/dev environments.
  }
};

const upsertMongoOrganizationAddress = async (
  organizationId: string,
  address: FilemakerAddress | null
): Promise<void> => {
  if (address === null) return;
  try {
    const now = new Date().toISOString();
    const collection = await getFilemakerOrganizationsCollection();
    await collection.updateOne(
      { id: organizationId },
      {
        $set: {
          addressId: address.id,
          city: address.city,
          country: address.country,
          countryId: address.countryId,
          displayAddressId: address.id,
          postalCode: address.postalCode,
          street: address.street,
          streetNumber: address.streetNumber,
          updatedAt: now,
          updatedBy: 'filemaker:job-board-scrape',
        },
      }
    );
  } catch {
    // Settings persistence remains the source of truth in non-Mongo test/dev environments.
  }
};

const buildOfferResult = (
  offer: FilemakerJobBoardScrapedOffer,
  match: FilemakerJobBoardOrganizationMatch | null
): FilemakerJobBoardScrapeOfferResult => ({
  listingId: null,
  match,
  offer,
  reason: null,
  status: 'preview',
});

const buildWriteMessage = (
  action: FilemakerJobBoardScrapeWriteAction,
  result: FilemakerJobBoardScrapeOfferResult
): string => {
  const organizationName = result.match?.organizationName ?? result.offer.companyName;
  if (action === 'organization_address_updated') {
    return `Updated organisation address for ${organizationName}.`;
  }
  if (action === 'organization_created') {
    return `Created organisation ${organizationName}.`;
  }
  if (action === 'organization_linked') {
    return `Linked existing organisation ${organizationName}.`;
  }
  if (action === 'organization_profile_updated') {
    return `Updated company profile for ${organizationName}.`;
  }
  if (action === 'listing_created') {
    return `Created job listing ${result.offer.title}.`;
  }
  if (action === 'listing_updated') {
    return `Updated job listing ${result.offer.title}.`;
  }
  if (action === 'listing_skipped') {
    return `Skipped existing job listing ${result.offer.title}.`;
  }
  if (action === 'listing_lexicon_linked') {
    return `Linked job-board lexicon terms for ${result.offer.title}.`;
  }
  return `No organisation matched ${result.offer.companyName}.`;
};

const emitWriteResult = async (
  onWrite: ApplyImportInput['onWrite'],
  action: FilemakerJobBoardScrapeWriteAction,
  result: FilemakerJobBoardScrapeOfferResult,
  profileUpdated: boolean
): Promise<void> => {
  await onWrite?.({
    action,
    message: buildWriteMessage(action, result),
    profileUpdated,
    result,
  });
};

type OfferLexiconApplyResult = {
  changed: boolean;
  createdTerms: number;
  linkedTerms: number;
};

const buildLexiconTermId = (
  category: FilemakerLexiconTermCategory,
  normalizedLabel: string
): string => {
  const token = toIdToken(`${category}-${normalizedLabel}`);
  return `filemaker-lexicon-term-${token.length > 0 ? token : randomUUID()}`;
};

const buildJobListingLexiconLinkId = (jobListingId: string, lexiconTermId: string): string => {
  const token = toIdToken(`${jobListingId}-${lexiconTermId}`);
  return `filemaker-job-listing-lexicon-link-${token.length > 0 ? token : randomUUID()}`;
};

const scrapedPillTypeKey = (
  pill: FilemakerJobBoardScrapedOffer['pills'][number]
): FilemakerLexiconTermCategory => pill.typeKey;

const upsertLexiconTerm = (
  database: FilemakerDatabase,
  pill: FilemakerJobBoardScrapedOffer['pills'][number],
  sourceProvider: string
): { created: boolean; term: FilemakerLexiconTerm; updated: boolean } => {
  const normalizedLabel = normalizeLexiconKey(pill.label);
  const typeKey = scrapedPillTypeKey(pill);
  const existingIndex = database.lexiconTerms.findIndex(
    (term: FilemakerLexiconTerm): boolean =>
      term.typeKey === typeKey && term.normalizedLabel === normalizedLabel
  );
  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    const existing = database.lexiconTerms[existingIndex];
    if (existing === undefined) {
      throw internalError('Lexicon term index resolved without a term.');
    }
    const next = createFilemakerLexiconTerm({
      ...existing,
      lastSeenAt: now,
      occurrenceCount: existing.occurrenceCount + 1,
      updatedAt: now,
    });
    database.lexiconTerms.splice(existingIndex, 1, next);
    return { created: false, term: next, updated: true };
  }
  const term = createFilemakerLexiconTerm({
    id: buildLexiconTermId(typeKey, normalizedLabel),
    label: pill.label,
    normalizedLabel,
    typeKey,
    category: typeKey,
    sourceSite: pill.sourceSite,
    sourceProvider,
    firstSeenAt: now,
    lastSeenAt: now,
    occurrenceCount: 1,
  });
  database.lexiconTerms.push(term);
  return { created: true, term, updated: true };
};

const ensureJobListingLexiconLink = (
  database: FilemakerDatabase,
  jobListingId: string,
  term: FilemakerLexiconTerm,
  pill: FilemakerJobBoardScrapedOffer['pills'][number]
): boolean => {
  const exists = database.jobListingLexiconLinks.some(
    (link: FilemakerJobListingLexiconLink): boolean =>
      link.jobListingId === jobListingId && link.lexiconTermId === term.id
  );
  if (exists) return false;
  database.jobListingLexiconLinks.push(
    createFilemakerJobListingLexiconLink({
      id: buildJobListingLexiconLinkId(jobListingId, term.id),
      jobListingId,
      lexiconTermId: term.id,
      sourceSite: pill.sourceSite,
      sourceUrl: pill.sourceUrl,
      sourceValue: pill.label,
      typeKey: scrapedPillTypeKey(pill),
      category: scrapedPillTypeKey(pill),
      position: pill.position,
    })
  );
  return true;
};

const updateListingLexiconTermIds = (
  database: FilemakerDatabase,
  jobListingId: string,
  termIds: string[]
): boolean => {
  const index = database.jobListings.findIndex(
    (listing: FilemakerJobListing): boolean => listing.id === jobListingId
  );
  if (index < 0) return false;
  const listing = database.jobListings[index];
  if (listing === undefined) return false;
  const nextTermIds = uniqueStrings([...listing.lexiconTermIds, ...termIds]);
  if (nextTermIds.length === listing.lexiconTermIds.length) return false;
  database.jobListings.splice(
    index,
    1,
    createFilemakerJobListing({
      ...listing,
      lexiconTermIds: nextTermIds,
      updatedAt: new Date().toISOString(),
    })
  );
  return true;
};

const applyOfferLexiconToListing = (
  database: FilemakerDatabase,
  listingId: string,
  offer: FilemakerJobBoardScrapedOffer
): OfferLexiconApplyResult => {
  if (offer.pills.length === 0) {
    return { changed: false, createdTerms: 0, linkedTerms: 0 };
  }
  const termIds: string[] = [];
  let createdTerms = 0;
  let linkedTerms = 0;
  let changed = false;
  for (const pill of offer.pills) {
    const termResult = upsertLexiconTerm(database, pill, offer.sourceSite);
    if (termResult.created) createdTerms += 1;
    if (termResult.updated) changed = true;
    termIds.push(termResult.term.id);
    if (ensureJobListingLexiconLink(database, listingId, termResult.term, pill)) {
      linkedTerms += 1;
      changed = true;
    }
  }
  if (updateListingLexiconTermIds(database, listingId, termIds)) {
    changed = true;
  }
  return { changed, createdTerms, linkedTerms };
};

const applyImport = async ({
  candidates,
  database,
  onWrite,
  offers,
  options,
}: ApplyImportInput): Promise<{
  changed: boolean;
  counters: ImportCounters;
  results: FilemakerJobBoardScrapeOfferResult[];
}> => {
  let changed = false;
  const counters: ImportCounters = { ...EMPTY_IMPORT_COUNTERS };
  const candidateList = [...candidates];
  const results: FilemakerJobBoardScrapeOfferResult[] = [];

  for (const offer of offers) {
    let match = findBestMatch(offer, candidateList, options.minimumMatchConfidence);
    let createdOrganization = false;
    let createdOrganizationProfileUpdated = false;
    if (!match && options.importStrategy === 'create_unmatched') {
      const createdOrganizationRecord = createUnmatchedOrganization(database, offer);
      const candidate = buildCandidate(createdOrganizationRecord);
      candidateList.push(candidate);
      match = {
        confidence: 100,
        organizationId: candidate.organization.id,
        organizationName: candidate.organization.name,
        reason: 'created from scraped job-board employer',
      };
      changed = true;
      createdOrganization = true;
      counters.createdOrganizations += 1;
      if (offer.companyProfile.trim().length > 0) {
        createdOrganizationProfileUpdated = true;
        counters.profileUpdates += 1;
      }
      const organizationResult: FilemakerJobBoardScrapeOfferResult = {
        listingId: null,
        match,
        offer,
        reason: null,
        status: 'created',
      };
      await emitWriteResult(
        onWrite,
        'organization_created',
        organizationResult,
        createdOrganizationProfileUpdated
      );
      await upsertMongoOrganizationForJobBoardImport(candidate.organization);
    }
    if (!match) {
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: null,
        match: null,
        offer,
        reason: 'No organisation matched the employer name.',
        status: 'unmatched',
      };
      results.push(result);
      await emitWriteResult(onWrite, 'offer_unmatched', result, false);
      continue;
    }

    const matchedCandidate = candidateList.find(
      (candidate: OrganizationCandidate): boolean =>
        candidate.organization.id === match.organizationId
    );
    if (matchedCandidate && ensureOrganizationInDatabase(database, matchedCandidate.organization)) {
      changed = true;
      await emitWriteResult(
        onWrite,
        'organization_linked',
        { listingId: null, match, offer, reason: null, status: 'preview' },
        false
      );
    }
    if (matchedCandidate) {
      await upsertMongoOrganizationForJobBoardImport(matchedCandidate.organization);
    }
    const profileUpdated = applyOfferProfileToDatabaseOrganization(
      database,
      match.organizationId,
      offer
    );
    if (profileUpdated) {
      changed = true;
      if (!createdOrganization) {
        counters.updatedOrganizations += 1;
        counters.profileUpdates += 1;
      }
      await emitWriteResult(
        onWrite,
        'organization_profile_updated',
        { listingId: null, match, offer, reason: null, status: 'updated' },
        true
      );
    }
    await upsertMongoOrganizationProfile(match.organizationId, offer);
    const addressApply = applyOfferAddressToDatabaseOrganization(
      database,
      match.organizationId,
      offer
    );
    if (addressApply.changed) {
      changed = true;
      counters.addressUpdates += 1;
      if (addressApply.assignedDefault) {
        await upsertMongoOrganizationAddress(match.organizationId, addressApply.address);
      }
      await emitWriteResult(
        onWrite,
        'organization_address_updated',
        { listingId: null, match, offer, reason: null, status: 'updated' },
        false
      );
    }

    const existingIndex = findExistingListingIndex(database.jobListings, match.organizationId, offer);
    const existing = existingIndex >= 0 ? database.jobListings[existingIndex] : undefined;
    if (existing && options.duplicateStrategy === 'skip') {
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: existing.id,
        match,
        offer,
        reason: `A matching ${offer.sourceSite} listing already exists.`,
        status: 'skipped',
      };
      results.push(result);
      await emitWriteResult(onWrite, 'listing_skipped', result, false);
      const lexicon = applyOfferLexiconToListing(database, existing.id, offer);
      if (lexicon.changed) {
        changed = true;
        counters.createdLexiconTerms += lexicon.createdTerms;
        counters.linkedLexiconTerms += lexicon.linkedTerms;
        await emitWriteResult(onWrite, 'listing_lexicon_linked', result, false);
      }
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
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: listing.id,
        match,
        offer,
        reason: null,
        status: 'updated',
      };
      results.push(result);
      await emitWriteResult(onWrite, 'listing_updated', result, false);
      const lexicon = applyOfferLexiconToListing(database, listing.id, offer);
      if (lexicon.changed) {
        counters.createdLexiconTerms += lexicon.createdTerms;
        counters.linkedLexiconTerms += lexicon.linkedTerms;
        await emitWriteResult(onWrite, 'listing_lexicon_linked', result, false);
      }
    } else {
      database.jobListings.push(listing);
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: listing.id,
        match,
        offer,
        reason: null,
        status: 'created',
      };
      results.push(result);
      await emitWriteResult(onWrite, 'listing_created', result, false);
      const lexicon = applyOfferLexiconToListing(database, listing.id, offer);
      if (lexicon.changed) {
        counters.createdLexiconTerms += lexicon.createdTerms;
        counters.linkedLexiconTerms += lexicon.linkedTerms;
        await emitWriteResult(onWrite, 'listing_lexicon_linked', result, false);
      }
    }
    changed = true;
  }

  return { changed, counters, results };
};

const verifyImportedResults = (
  database: FilemakerDatabase,
  results: readonly FilemakerJobBoardScrapeOfferResult[]
): ImportVerification => {
  const warnings: string[] = [];
  let verifiedListings = 0;

  for (const result of results) {
    if (result.match !== null) {
      const organization = database.organizations.find(
        (entry: FilemakerOrganization): boolean => entry.id === result.match.organizationId
      );
      if (organization === undefined) {
        warnings.push(
          `Import verification could not find organisation ${result.match.organizationName}.`
        );
      } else if (
        result.offer.companyProfile.trim().length > 0 &&
        organization.jobBoardCompanyProfile !== result.offer.companyProfile
      ) {
        warnings.push(
          `Import verification could not confirm company profile for ${organization.name}.`
        );
      }
    }

    if (result.listingId === null || result.status === 'unmatched') {
      continue;
    }
    const listing = database.jobListings.find(
      (entry: FilemakerJobListing): boolean => entry.id === result.listingId
    );
    if (listing === undefined) {
      warnings.push(`Import verification could not find listing ${result.offer.title}.`);
      continue;
    }
    if (result.offer.pills.length > 0) {
      const listingLinkedTermIds = new Set([
        ...listing.lexiconTermIds,
        ...database.jobListingLexiconLinks
          .filter(
            (link: FilemakerJobListingLexiconLink): boolean =>
              link.jobListingId === listing.id
          )
          .map((link: FilemakerJobListingLexiconLink): string => link.lexiconTermId),
      ]);
      const missingTerm = result.offer.pills.find((pill): boolean => {
        const normalizedLabel = normalizeLexiconKey(pill.label);
        const typeKey = scrapedPillTypeKey(pill);
        const term = database.lexiconTerms.find(
          (entry: FilemakerLexiconTerm): boolean =>
            entry.typeKey === typeKey && entry.normalizedLabel === normalizedLabel
        );
        return term === undefined || !listingLinkedTermIds.has(term.id);
      });
      if (missingTerm !== undefined) {
        warnings.push(`Import verification could not confirm lexicon terms for ${result.offer.title}.`);
      }
    }
    verifiedListings += 1;
  }

  return { verifiedListings, warnings: uniqueStrings(warnings) };
};

const buildSummary = (
  offers: readonly FilemakerJobBoardScrapeOfferResult[],
  counters: ImportCounters = EMPTY_IMPORT_COUNTERS,
  verification: ImportVerification = EMPTY_IMPORT_VERIFICATION
): FilemakerJobBoardScrapeResponse['summary'] => ({
  createdListings: offers.filter((offer) => offer.status === 'created').length,
  createdLexiconTerms: counters.createdLexiconTerms,
  createdOrganizations: counters.createdOrganizations,
  linkedLexiconTerms: counters.linkedLexiconTerms,
  matchedOffers: offers.filter((offer) => offer.match !== null).length,
  profileUpdates: counters.profileUpdates,
  addressUpdates: counters.addressUpdates,
  scrapedOffers: offers.length,
  skippedOffers: offers.filter((offer) => offer.status === 'skipped').length,
  unmatchedOffers: offers.filter((offer) => offer.status === 'unmatched').length,
  updatedOrganizations: counters.updatedOrganizations,
  updatedListings: offers.filter((offer) => offer.status === 'updated').length,
  verifiedListings: verification.verifiedListings,
});

const resolveDraftSaveDuplicateStrategy = (
  strategy: FilemakerJobBoardDuplicateStrategy
): FilemakerJobBoardDuplicateStrategy => (strategy === 'add' ? 'add' : 'update');

const toDraftSaveImportOptions = (
  input: FilemakerJobBoardScrapeDraftSaveRequest
): FilemakerJobBoardScrapeRequest =>
  filemakerJobBoardScrapeRequestSchema.parse({
    delayMs: 0,
    duplicateStrategy: resolveDraftSaveDuplicateStrategy(input.duplicateStrategy),
    extractDescriptions: true,
    extractSalaries: true,
    headless: null,
    humanizeMouse: true,
    importStrategy: input.importStrategy,
    maxOffers: input.offers.length,
    maxPages: 1,
    minimumMatchConfidence: input.minimumMatchConfidence,
    mode: 'import',
    organizationScope: input.organizationScope,
    personaId: null,
    provider: input.provider,
    selectedOrganizationIds: input.selectedOrganizationIds,
    sourceUrl: input.sourceUrl,
    status: input.status,
    timeoutMs: 180_000,
  });

const resolveDraftSaveProvider = (
  input: FilemakerJobBoardScrapeDraftSaveRequest
): JobBoardProvider => {
  const provider =
    resolveJobBoardProvider(input.sourceUrl, input.provider) ??
    resolveJobBoardProvider(input.offers[0]?.sourceUrl ?? '', input.provider);
  if (provider === null) {
    throw badRequestError('Unsupported job board provider.');
  }
  return provider;
};

const resolveDraftSaveSourceSite = (
  input: FilemakerJobBoardScrapeDraftSaveRequest,
  provider: JobBoardProvider
): string => {
  const offerSourceSite = input.offers.find(
    (offer): boolean => offer.sourceSite.trim().length > 0
  )?.sourceSite;
  const normalizedSourceSite = offerSourceSite?.trim() ?? '';
  return normalizedSourceSite.length > 0 ? normalizedSourceSite : getJobBoardSourceSite(provider);
};

const isDirectOfferUrlForScrape = (sourceUrl: string, provider: JobBoardProvider): boolean => {
  if (!isJobBoardOfferUrl(sourceUrl, provider)) return false;
  if (provider !== 'pracuj_pl') return true;
  try {
    return /,oferta,/i.test(new URL(sourceUrl).pathname);
  } catch {
    return false;
  }
};

const usesDeterministicFirstExtractionPath = (
  extractionPath: FilemakerJobBoardScrapeRequest['extractionPath']
): boolean =>
  extractionPath === 'deterministic' || extractionPath === 'deterministic_then_playwright';

const collectOfferLinks = async (
  options: FilemakerJobBoardScrapeRequest
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
  const useDeterministicFirst = usesDeterministicFirstExtractionPath(options.extractionPath);
  if (
    useDeterministicFirst &&
    isDirectOfferUrlForScrape(options.sourceUrl, provider)
  ) {
    return {
      provider,
      runId: null,
      sourceSite: getJobBoardSourceSite(provider),
      urls: [options.sourceUrl],
      warnings: [],
    };
  }
  const collectOptions = {
    delayMs: options.delayMs,
    headless: options.headless,
    humanizeMouse: options.humanizeMouse,
    maxOffers: options.maxOffers,
    maxPages: options.maxPages,
    personaId: options.personaId,
    provider,
    sourceUrl: options.sourceUrl,
    timeoutMs: options.timeoutMs,
  };

  if (useDeterministicFirst) {
    const deterministicCollected = await collectJobBoardOfferUrlsDeterministically(collectOptions);
    const deterministicUrls = uniqueStrings(
      deterministicCollected.links.map((link) => link.url)
    );
    if (deterministicUrls.length > 0 || options.extractionPath === 'deterministic') {
      if (
        deterministicUrls.length === 0 &&
        isDirectOfferUrlForScrape(options.sourceUrl, provider)
      ) {
        deterministicUrls.push(options.sourceUrl);
      }
      return {
        provider,
        runId: deterministicCollected.runId,
        sourceSite: deterministicCollected.sourceSite,
        urls: deterministicUrls.slice(0, options.maxOffers),
        warnings: deterministicCollected.warnings,
      };
    }

    const fallbackCollected = await collectJobBoardOfferUrls(collectOptions);
    const fallbackUrls = uniqueStrings(fallbackCollected.links.map((link) => link.url));
    if (fallbackUrls.length === 0 && isDirectOfferUrlForScrape(options.sourceUrl, provider)) {
      fallbackUrls.push(options.sourceUrl);
    }
    return {
      provider,
      runId: fallbackCollected.runId ?? deterministicCollected.runId,
      sourceSite: fallbackCollected.sourceSite,
      urls: fallbackUrls.slice(0, options.maxOffers),
      warnings:
        fallbackUrls.length === 0
          ? [...deterministicCollected.warnings, ...fallbackCollected.warnings]
          : fallbackCollected.warnings,
    };
  }

  const collected = await collectJobBoardOfferUrls(collectOptions);
  const urls = uniqueStrings(collected.links.map((link) => link.url));
  if (urls.length === 0 && isDirectOfferUrlForScrape(options.sourceUrl, provider)) {
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
  options: FilemakerJobBoardScrapeRequest,
  progress: ScrapeProgressHandlers = {},
  signal?: AbortSignal
): Promise<CentralizedScrapeResult> => {
  throwIfScrapeAborted(signal);
  await progress.onStatus?.('Collecting job-board offer links.');
  const collected = await collectOfferLinks(options);
  throwIfScrapeAborted(signal);
  const offers: FilemakerJobBoardScrapedOffer[] = [];
  const warnings = [...collected.warnings];
  let runId = collected.runId;
  await progress.onLinks?.({
    provider: collected.provider,
    runId: collected.runId,
    sourceSite: collected.sourceSite,
    urls: collected.urls,
  });
  for (const warning of collected.warnings) {
    await progress.onWarning?.(warning);
  }
  if (collected.urls.length === 0) {
    const warning = `No job offer links were found on ${options.sourceUrl}.`;
    warnings.push(warning);
    await progress.onWarning?.(warning);
  }

  for (const [index, url] of collected.urls.entries()) {
    throwIfScrapeAborted(signal);
    await progress.onStatus?.(
      `Scraping offer ${index + 1} of ${collected.urls.length}: ${url}`
    );
    const probe = await probeJobBoardOffer({
      extractionPath: options.extractionPath,
      forcePlaywright: options.extractionPath !== 'deterministic',
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
      snapshot: probe.snapshot,
      sourceSite: probe.sourceSite,
    });
    if (offer) {
      offers.push(offer);
      await progress.onOffer?.({ index: index + 1, offer, total: collected.urls.length });
    } else {
      const warning = probe.error ?? `Could not extract a job offer from ${url}.`;
      warnings.push(warning);
      await progress.onWarning?.(warning);
    }
    throwIfScrapeAborted(signal);
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

export const saveFilemakerJobBoardScrapeDrafts = async (
  rawInput: unknown,
  runOptions: FilemakerJobBoardScrapeRunOptions = {}
): Promise<FilemakerJobBoardScrapeResponse> => {
  const parsed = filemakerJobBoardScrapeDraftSaveRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw badRequestError('Invalid job-board scrape draft save request.', {
      issues: parsed.error.issues,
    });
  }
  const input = parsed.data;
  const options = toDraftSaveImportOptions(input);
  const onEvent = runOptions.onEvent;
  const signal = runOptions.signal;
  throwIfScrapeAborted(signal);
  if (options.organizationScope === 'selected' && options.selectedOrganizationIds.length === 0) {
    throw badRequestError('Select at least one organisation or use all organisations.');
  }

  await emitLiveEvent(onEvent, { message: 'Saving scraped job-board drafts.', type: 'status' });
  const effectiveHeadless = await resolveEffectiveHeadless(options.headless);
  const provider = resolveDraftSaveProvider(input);
  const sourceSite = resolveDraftSaveSourceSite(input, provider);
  throwIfScrapeAborted(signal);
  const { database } = await loadFilemakerDatabase();
  const candidates = await loadOrganizationCandidates(database, options);
  throwIfScrapeAborted(signal);
  const imported = await applyImport({
    candidates,
    database,
    offers: input.offers,
    onWrite: (write) => emitLiveEvent(onEvent, { type: 'write', write }),
    options,
  });
  let verificationDatabase = normalizeFilemakerDatabase(database);
  if (imported.changed) {
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Persisting imported job listings.', type: 'status' });
    const persisted = await upsertFilemakerCampaignSettingValue(
      FILEMAKER_DATABASE_KEY,
      JSON.stringify(toPersistedFilemakerDatabase(normalizeFilemakerDatabase(database)))
    );
    if (!persisted) {
      throw internalError('Failed to persist imported job-board listings.');
    }
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Verifying persisted import.', type: 'status' });
    verificationDatabase = await loadPersistedVerificationDatabase(database);
  }
  const importVerification = verifyImportedResults(verificationDatabase, imported.results);
  for (const warning of importVerification.warnings) {
    await emitLiveEvent(onEvent, { type: 'warning', warning });
  }
  const warnings = uniqueStrings(importVerification.warnings);
  const response: FilemakerJobBoardScrapeResponse = {
    browserMode: effectiveHeadless ? 'headless' : 'headed',
    mode: 'import',
    offers: imported.results,
    provider,
    runId: null,
    sourceSite,
    sourceUrl: options.sourceUrl,
    summary: buildSummary(imported.results, imported.counters, importVerification),
    warnings: warnings.length > 0 ? warnings : DEFAULT_WARNINGS,
  };
  await emitLiveEvent(onEvent, { result: response, type: 'done' });
  return response;
};

export const runFilemakerJobBoardScrape = async (
  rawInput: unknown,
  runOptions: FilemakerJobBoardScrapeRunOptions = {}
): Promise<FilemakerJobBoardScrapeResponse> => {
  const parsed = filemakerJobBoardScrapeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw badRequestError('Invalid job-board scrape request.', { issues: parsed.error.issues });
  }
  const options = parsed.data;
  const onEvent = runOptions.onEvent;
  const signal = runOptions.signal;
  throwIfScrapeAborted(signal);
  await emitLiveEvent(onEvent, { message: 'Preparing job-board scraper.', type: 'status' });
  const effectiveHeadless = await resolveEffectiveHeadless(options.headless);
  throwIfScrapeAborted(signal);
  if (options.organizationScope === 'selected' && options.selectedOrganizationIds.length === 0) {
    throw badRequestError('Select at least one organisation or use all organisations.');
  }

  await emitLiveEvent(onEvent, { message: 'Loading FileMaker organisations.', type: 'status' });
  const { database } = await loadFilemakerDatabase();
  const candidates = await loadOrganizationCandidates(database, options);
  throwIfScrapeAborted(signal);
  const scraped = await scrapeOffersViaJobBoardSequencer(
    options,
    {
      onLinks: (input) =>
        emitLiveEvent(onEvent, {
          provider: input.provider,
          runId: input.runId,
          sourceSite: input.sourceSite,
          type: 'links',
          urls: input.urls,
        }),
      onOffer: (input) =>
        emitLiveEvent(onEvent, {
          index: input.index,
          result: buildOfferResult(
            input.offer,
            findBestMatch(input.offer, candidates, options.minimumMatchConfidence)
          ),
          total: input.total,
          type: 'offer',
        }),
      onStatus: (message) => emitLiveEvent(onEvent, { message, type: 'status' }),
      onWarning: (warning) => emitLiveEvent(onEvent, { type: 'warning', warning }),
    },
    signal
  );
  const previewResults = scraped.offers.map((offer) =>
    buildOfferResult(offer, findBestMatch(offer, candidates, options.minimumMatchConfidence))
  );

  let results = previewResults;
  let importCounters: ImportCounters = { ...EMPTY_IMPORT_COUNTERS };
  let importVerification: ImportVerification = { ...EMPTY_IMPORT_VERIFICATION };
  if (options.mode === 'import') {
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Importing scraped offers.', type: 'status' });
    const imported = await applyImport({
      candidates,
      database,
      offers: scraped.offers,
      onWrite: (write) => emitLiveEvent(onEvent, { type: 'write', write }),
      options,
    });
    importCounters = imported.counters;
    results = imported.results;
    let verificationDatabase = normalizeFilemakerDatabase(database);
    if (imported.changed) {
      throwIfScrapeAborted(signal);
      await emitLiveEvent(onEvent, { message: 'Persisting imported job listings.', type: 'status' });
      const persisted = await upsertFilemakerCampaignSettingValue(
        FILEMAKER_DATABASE_KEY,
        JSON.stringify(toPersistedFilemakerDatabase(normalizeFilemakerDatabase(database)))
      );
      if (!persisted) {
        throw internalError('Failed to persist imported job-board listings.');
      }
      throwIfScrapeAborted(signal);
      await emitLiveEvent(onEvent, { message: 'Verifying persisted import.', type: 'status' });
      verificationDatabase = await loadPersistedVerificationDatabase(database);
    }
    importVerification = verifyImportedResults(verificationDatabase, results);
    for (const warning of importVerification.warnings) {
      await emitLiveEvent(onEvent, { type: 'warning', warning });
    }
  }

  const warnings = uniqueStrings([...scraped.warnings, ...importVerification.warnings]);

  const response: FilemakerJobBoardScrapeResponse = {
    browserMode: effectiveHeadless ? 'headless' : 'headed',
    mode: options.mode,
    offers: results,
    provider: scraped.provider,
    runId: scraped.runId,
    sourceSite: scraped.sourceSite,
    sourceUrl: options.sourceUrl,
    summary: buildSummary(results, importCounters, importVerification),
    warnings: warnings.length > 0 ? warnings : DEFAULT_WARNINGS,
  };
  await emitLiveEvent(onEvent, { result: response, type: 'done' });
  return response;
};
