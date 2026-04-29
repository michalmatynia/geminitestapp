import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop, max-params */

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
  filemakerJobBoardLexiconClassificationApplyRequestSchema,
  filemakerJobBoardScrapeDraftSaveRequestSchema,
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardLexiconClassification,
  type FilemakerJobBoardLexiconClassificationApplyResponse,
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

type LoadedDatabase = {
  database: FilemakerDatabase;
  rawValue: string | null;
};

import { normalizeNameForMatch } from './job-board-scrape/match-organizations';

type ScrapedCompanyCandidate = {
  organization: FilemakerOrganization;
};

type ApplyImportInput = {
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
  skippedResults: FilemakerJobBoardScrapeOfferResult[];
  sourceSite: string;
  warnings: string[];
};

type FilemakerJobBoardScrapeRunOptions = {
  onEvent?: FilemakerJobBoardScrapeLiveEventEmitter;
  signal?: AbortSignal;
};

type ClassificationPillBuildResult = {
  acceptedPills: FilemakerJobBoardScrapedOffer['pills'];
  rejectedCount: number;
  updatedOffer: FilemakerJobBoardScrapedOffer;
  warnings: string[];
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
  onSkippedExisting?: (input: {
    index: number;
    result: FilemakerJobBoardScrapeOfferResult;
    total: number;
    url: string;
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
import { classifyFilemakerLexiconLabelWithPatterns } from './job-board-scrape/lexicon-validation-patterns';
import {
  isSuspiciousJobBoardCompanyName,
  offerFromEvaluation,
} from './job-board-scrape/offer-from-evaluation';

const loadFilemakerDatabase = async (): Promise<LoadedDatabase> => {
  const rawValue = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (rawValue === null || rawValue.trim().length === 0) {
    return { database: normalizeFilemakerDatabase(null), rawValue: null };
  }
  const decoded = decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue);
  try {
    return {
      database: normalizeFilemakerDatabase(JSON.parse(decoded) as FilemakerDatabase),
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

import {
  findExistingListingIndex,
  findExistingListingIndexBySourceIdentity,
} from './job-board-scrape/dedupe-listings';

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
    addressId: input.existing?.addressId,
    street: input.existing?.street,
    streetNumber: input.existing?.streetNumber,
    city: input.existing?.city,
    postalCode: input.existing?.postalCode,
    country: input.existing?.country,
    countryId: input.existing?.countryId,
    salaryCurrency: input.offer.salaryCurrency ?? undefined,
    salaryMax: input.offer.salaryMax,
    salaryMin: input.offer.salaryMin,
    salaryText: input.offer.salaryText,
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
  findOfferAddressValue,
  parseScrapedAddressPill,
} from './job-board-scrape/address';

type AddressApplyResult = {
  address: FilemakerAddress | null;
  assignedDefault: boolean;
  changed: boolean;
};


const ensureAddressRecord = (
  database: FilemakerDatabase,
  ownerId: string,
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
    id: buildJobBoardAddressId(ownerId, parsedAddress),
    ...parsedAddress,
  });
  database.addresses.push(address);
  return { address, created: true };
};

const ensureAddressLink = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressLink['ownerKind'],
  ownerId: string,
  addressId: string,
  isDefault: boolean
): boolean => {
  const existingIndex = database.addressLinks.findIndex(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === ownerKind &&
      link.ownerId === ownerId &&
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
      id: buildJobBoardAddressLinkId(ownerKind, ownerId, addressId),
      ownerKind,
      ownerId,
      addressId,
      isDefault,
    })
  );
  return true;
};

const applyOfferAddressToDatabaseJobListing = (
  database: FilemakerDatabase,
  listingId: string,
  offer: FilemakerJobBoardScrapedOffer
): AddressApplyResult => {
  const addressValue = findOfferAddressValue(offer);
  if (addressValue === null) return { address: null, assignedDefault: false, changed: false };
  const parsedAddress = parseScrapedAddressPill(addressValue);
  if (parsedAddress === null) return { address: null, assignedDefault: false, changed: false };
  const listingIndex = database.jobListings.findIndex(
    (listing: FilemakerJobListing): boolean => listing.id === listingId
  );
  if (listingIndex < 0) return { address: null, assignedDefault: false, changed: false };
  const listing = database.jobListings[listingIndex];
  if (listing === undefined) return { address: null, assignedDefault: false, changed: false };
  const addressRecord = ensureAddressRecord(database, listingId, parsedAddress);
  const shouldSetDefaultAddress = normalizeString(listing.addressId).length === 0;
  const linkChanged = ensureAddressLink(
    database,
    'job_listing',
    listingId,
    addressRecord.address.id,
    shouldSetDefaultAddress
  );
  let listingChanged = false;
  if (shouldSetDefaultAddress) {
    const nextListing = {
      ...createFilemakerJobListing({
        ...listing,
        addressId: addressRecord.address.id,
        city: addressRecord.address.city,
        country: addressRecord.address.country,
        countryId: addressRecord.address.countryId,
        postalCode: addressRecord.address.postalCode,
        street: addressRecord.address.street,
        streetNumber: addressRecord.address.streetNumber,
        updatedAt: new Date().toISOString(),
      }),
      postalCode: addressRecord.address.postalCode,
    };
    listingChanged = JSON.stringify(listing) !== JSON.stringify(nextListing);
    if (listingChanged) {
      database.jobListings.splice(listingIndex, 1, nextListing);
    }
  }
  return {
    address: addressRecord.address,
    assignedDefault: shouldSetDefaultAddress,
    changed: addressRecord.created || linkChanged || listingChanged,
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

const getOrCreateScrapedCompanyCandidate = async (args: {
  companyKey: string;
  createdCandidatesByCompanyKey: Map<string, ScrapedCompanyCandidate>;
  database: FilemakerDatabase;
  offer: FilemakerJobBoardScrapedOffer;
}): Promise<{ candidate: ScrapedCompanyCandidate; created: boolean; profileUpdated: boolean }> => {
  const existingCandidate = args.createdCandidatesByCompanyKey.get(args.companyKey);
  if (existingCandidate !== undefined) {
    return { candidate: existingCandidate, created: false, profileUpdated: false };
  }

  const createdOrganizationRecord = createUnmatchedOrganization(args.database, args.offer);
  const candidate: ScrapedCompanyCandidate = { organization: createdOrganizationRecord };
  args.createdCandidatesByCompanyKey.set(args.companyKey, candidate);
  await upsertMongoOrganizationForJobBoardImport(candidate.organization);
  return {
    candidate,
    created: true,
    profileUpdated: args.offer.companyProfile.trim().length > 0,
  };
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

const buildExistingListingOffer = (
  database: FilemakerDatabase,
  listing: FilemakerJobListing,
  sourceSite: string,
  sourceUrl: string
): FilemakerJobBoardScrapedOffer => {
  const organization = database.organizations.find(
    (entry: FilemakerOrganization): boolean => entry.id === listing.organizationId
  );
  return {
    companyName: organization?.name ?? 'Existing organisation',
    companyProfile: organization?.jobBoardCompanyProfile ?? '',
    companyProfileUrl: organization?.jobBoardCompanyProfileUrl ?? null,
    description: listing.description,
    expiresAt: listing.expiresAt ?? null,
    location: listing.location ?? '',
    postedAt: listing.postedAt ?? null,
    salaryCurrency: listing.salaryCurrency ?? null,
    salaryMax: listing.salaryMax ?? null,
    salaryMin: listing.salaryMin ?? null,
    salaryPeriod: listing.salaryPeriod,
    salaryText: '',
    sourceExternalId: listing.sourceExternalId ?? null,
    sourceSite: (listing.sourceSite ?? '').length > 0 ? listing.sourceSite ?? '' : sourceSite,
    sourceUrl: (listing.sourceUrl ?? '').length > 0 ? listing.sourceUrl ?? '' : sourceUrl,
    pills: [],
    unclassifiedPills: [],
    title: listing.title.length > 0 ? listing.title : 'Existing job listing',
  };
};

const buildExistingListingMatch = (
  database: FilemakerDatabase,
  listing: FilemakerJobListing
): FilemakerJobBoardOrganizationMatch | null => {
  const organization = database.organizations.find(
    (entry: FilemakerOrganization): boolean => entry.id === listing.organizationId
  );
  if (organization === undefined) return null;
  return {
    confidence: 100,
    organizationId: organization.id,
    organizationName: organization.name,
    reason: 'existing listing source identity',
  };
};

const buildExistingListingSkippedResult = (
  database: FilemakerDatabase,
  listing: FilemakerJobListing,
  sourceSite: string,
  sourceUrl: string
): FilemakerJobBoardScrapeOfferResult => ({
  listingId: listing.id,
  match: buildExistingListingMatch(database, listing),
  offer: buildExistingListingOffer(database, listing, sourceSite, sourceUrl),
  reason: `A matching ${sourceSite.length > 0 ? sourceSite : 'job-board'} listing already exists.`,
  status: 'skipped',
});

const buildWriteMessage = (
  action: FilemakerJobBoardScrapeWriteAction,
  result: FilemakerJobBoardScrapeOfferResult
): string => {
  const organizationName = result.match?.organizationName ?? result.offer.companyName;
  if (action === 'organization_created') {
    return `Created organisation ${organizationName}.`;
  }
  if (action === 'organization_linked') {
    return `Linked existing organisation ${organizationName}.`;
  }
  if (action === 'organization_profile_updated') {
    return `Updated company profile for ${organizationName}.`;
  }
  if (action === 'listing_address_updated') {
    return `Updated job listing address for ${result.offer.title}.`;
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
  return result.reason ?? `No organisation was created for ${result.offer.companyName}.`;
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
  const otherIndex =
    typeKey !== 'other'
      ? database.lexiconTerms.findIndex(
          (term: FilemakerLexiconTerm): boolean =>
            term.typeKey === 'other' && term.normalizedLabel === normalizedLabel
        )
      : -1;
  if (otherIndex >= 0) {
    const existing = database.lexiconTerms[otherIndex];
    if (existing === undefined) {
      throw internalError('Other lexicon term index resolved without a term.');
    }
    const next = createFilemakerLexiconTerm({
      ...existing,
      label: existing.label.trim().length > 0 ? existing.label : pill.label,
      typeKey,
      category: typeKey,
      sourceSite: existing.sourceSite ?? pill.sourceSite,
      sourceProvider: existing.sourceProvider ?? sourceProvider,
      lastSeenAt: now,
      occurrenceCount: existing.occurrenceCount + 1,
      updatedAt: now,
    });
    database.lexiconTerms.splice(otherIndex, 1, next);
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
  const existingIndex = database.jobListingLexiconLinks.findIndex(
    (link: FilemakerJobListingLexiconLink): boolean =>
      link.jobListingId === jobListingId && link.lexiconTermId === term.id
  );
  const typeKey = scrapedPillTypeKey(pill);
  if (existingIndex >= 0) {
    const existing = database.jobListingLexiconLinks[existingIndex];
    if (existing === undefined) return false;
    const next = createFilemakerJobListingLexiconLink({
      ...existing,
      sourceSite: pill.sourceSite,
      sourceUrl: pill.sourceUrl,
      sourceValue: pill.label,
      typeKey,
      category: typeKey,
      position: pill.position,
      updatedAt: new Date().toISOString(),
    });
    if (
      existing.sourceSite === next.sourceSite &&
      existing.sourceUrl === next.sourceUrl &&
      existing.sourceValue === next.sourceValue &&
      existing.typeKey === next.typeKey &&
      existing.category === next.category &&
      existing.position === next.position
    ) {
      return false;
    }
    database.jobListingLexiconLinks.splice(existingIndex, 1, next);
    return true;
  }
  database.jobListingLexiconLinks.push(
    createFilemakerJobListingLexiconLink({
      id: buildJobListingLexiconLinkId(jobListingId, term.id),
      jobListingId,
      lexiconTermId: term.id,
      sourceSite: pill.sourceSite,
      sourceUrl: pill.sourceUrl,
      sourceValue: pill.label,
      typeKey,
      category: typeKey,
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
  const lexiconPills = offer.pills;
  if (lexiconPills.length === 0) {
    return { changed: false, createdTerms: 0, linkedTerms: 0 };
  }
  const termIds: string[] = [];
  let createdTerms = 0;
  let linkedTerms = 0;
  let changed = false;
  for (const pill of lexiconPills) {
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

const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.65;

const classificationKey = (value: string): string => normalizeLexiconKey(value);

const isIgnoredClassificationNoise = (label: string): boolean =>
  /(?:asystent\s+pracuj\.pl|assistant|apply\s+button|save\s+offer|obserwuj|aplikuj)/iu.test(label);

const exactLexiconMatchesForClassification = (
  database: FilemakerDatabase,
  label: string
): FilemakerLexiconTerm[] => {
  const key = classificationKey(label);
  if (key.length === 0) return [];
  return database.lexiconTerms
    .filter((term) => {
      const termLabel =
        term.normalizedLabel.trim().length > 0 ? term.normalizedLabel : term.label;
      return classificationKey(termLabel) === key;
    })
    .sort((left, right) => right.occurrenceCount - left.occurrenceCount);
};

type ClassificationTypeResolution = {
  authoritative: boolean;
  reason: string | null;
  typeKey: FilemakerJobBoardLexiconClassification['typeKey'] | null;
};

const resolveAuthoritativeClassificationType = (
  database: FilemakerDatabase,
  classification: FilemakerJobBoardLexiconClassification,
  candidate: FilemakerJobBoardScrapedOffer['unclassifiedPills'][number]
): ClassificationTypeResolution => {
  if (isIgnoredClassificationNoise(candidate.label)) {
    return { authoritative: false, reason: 'ignored noise or provider UI text', typeKey: null };
  }

  const exactMatches = exactLexiconMatchesForClassification(database, candidate.label);
  const authoritativeExactMatches = exactMatches.filter(
    (term: FilemakerLexiconTerm): boolean =>
      term.typeKey !== 'address' && term.typeKey !== 'other'
  );
  if (authoritativeExactMatches.length > 0) {
    return {
      authoritative: true,
      reason: 'matched authoritative existing lexicon term',
      typeKey: authoritativeExactMatches[0]?.typeKey ?? classification.typeKey,
    };
  }

  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    database.lexiconValidationPatterns,
    { label: candidate.label, sourceScope: 'unclassified' }
  );
  if (patternClassification !== null) {
    if (patternClassification.typeKey === 'other' || patternClassification.typeKey === 'address') {
      return {
        authoritative: true,
        reason:
          `matched validation pattern ${patternClassification.pattern.id} as ${patternClassification.typeKey}`,
        typeKey: null,
      };
    }
    return {
      authoritative: true,
      reason: `matched validation pattern ${patternClassification.pattern.id}`,
      typeKey: patternClassification.typeKey,
    };
  }

  if (classification.action === 'ignore') {
    return { authoritative: false, reason: 'model returned ignore', typeKey: null };
  }
  if (classification.typeKey === 'other') {
    return {
      authoritative: false,
      reason: 'kept as unclassified because model returned Other',
      typeKey: null,
    };
  }
  if (classification.typeKey === 'address') {
    return {
      authoritative: false,
      reason: 'Address classifications are stored as structured address fields',
      typeKey: null,
    };
  }
  return { authoritative: false, reason: null, typeKey: classification.typeKey };
};

const buildClassifiedOfferPill = (
  candidate: FilemakerJobBoardScrapedOffer['unclassifiedPills'][number],
  typeKey: FilemakerJobBoardLexiconClassification['typeKey']
): FilemakerJobBoardScrapedOffer['pills'][number] => ({
  category: typeKey,
  typeKey,
  label: candidate.label,
  position: candidate.position,
  sourceSite: candidate.sourceSite,
  sourceUrl: candidate.sourceUrl,
});

const buildOfferWithClassifiedPills = (
  database: FilemakerDatabase,
  offer: FilemakerJobBoardScrapedOffer,
  classifications: readonly FilemakerJobBoardLexiconClassification[]
): ClassificationPillBuildResult => {
  const warnings: string[] = [];
  const candidatesByKey = new Map<
    string,
    FilemakerJobBoardScrapedOffer['unclassifiedPills'][number]
  >();
  offer.unclassifiedPills.forEach((candidate) => {
    const key = classificationKey(candidate.label);
    if (key.length > 0 && !candidatesByKey.has(key)) {
      candidatesByKey.set(key, candidate);
    }
  });
  const acceptedKeys = new Set<string>();
  const acceptedPills: FilemakerJobBoardScrapedOffer['pills'] = [];
  let rejectedCount = 0;

  classifications.forEach((classification) => {
    const outputKey = classificationKey(classification.normalizedLabel ?? classification.label);
    const candidate = candidatesByKey.get(outputKey);
    if (candidate === undefined) {
      rejectedCount += 1;
      warnings.push(`Ignored classification for unknown pill "${classification.label}".`);
      return;
    }
    const authoritative = resolveAuthoritativeClassificationType(database, classification, candidate);
    if (authoritative.typeKey === null) {
      rejectedCount += 1;
      warnings.push(
        `Kept "${candidate.label}" unclassified: ${authoritative.reason ?? 'not classifiable'}.`
      );
      return;
    }
    if (
      !authoritative.authoritative &&
      classification.confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD
    ) {
      rejectedCount += 1;
      warnings.push(`Kept "${candidate.label}" unclassified because confidence was too low.`);
      return;
    }
    const acceptedKey = `${authoritative.typeKey}:${classificationKey(candidate.label)}`;
    if (acceptedKeys.has(acceptedKey)) return;
    acceptedKeys.add(acceptedKey);
    acceptedPills.push(buildClassifiedOfferPill(candidate, authoritative.typeKey));
  });

  const existingKeys = new Set(
    offer.pills.map((pill) => `${pill.typeKey}:${classificationKey(pill.label)}`)
  );
  const mergedPills = [...offer.pills];
  acceptedPills.forEach((pill) => {
    const key = `${pill.typeKey}:${classificationKey(pill.label)}`;
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    mergedPills.push(pill);
  });
  const acceptedCandidateKeys = new Set(acceptedPills.map((pill) => classificationKey(pill.label)));

  return {
    acceptedPills,
    rejectedCount,
    updatedOffer: {
      ...offer,
      pills: mergedPills.slice(0, 100),
      unclassifiedPills: offer.unclassifiedPills.filter(
        (pill) => !acceptedCandidateKeys.has(classificationKey(pill.label))
      ),
    },
    warnings: uniqueStrings(warnings),
  };
};

const resolveClassificationListingId = (
  database: FilemakerDatabase,
  offer: FilemakerJobBoardScrapedOffer,
  listingId: string | null
): string | null => {
  if (
    listingId !== null &&
    database.jobListings.some((listing: FilemakerJobListing): boolean => listing.id === listingId)
  ) {
    return listingId;
  }
  const sourceIndex = findExistingListingIndexBySourceIdentity(database.jobListings, {
    sourceExternalId: offer.sourceExternalId,
    sourceSite: offer.sourceSite,
    sourceUrl: offer.sourceUrl,
  });
  return sourceIndex >= 0 ? database.jobListings[sourceIndex]?.id ?? null : null;
};

const upsertClassifiedPillsToLexicon = (
  database: FilemakerDatabase,
  pills: FilemakerJobBoardScrapedOffer['pills'],
  sourceProvider: string
): { changed: boolean; createdTerms: number } => {
  let changed = false;
  let createdTerms = 0;
  pills.forEach((pill) => {
    const result = upsertLexiconTerm(database, pill, sourceProvider);
    if (result.created) createdTerms += 1;
    if (result.updated) changed = true;
  });
  return { changed, createdTerms };
};

export const applyFilemakerJobBoardLexiconClassifications = async (
  rawInput: unknown
): Promise<FilemakerJobBoardLexiconClassificationApplyResponse> => {
  const parsed = filemakerJobBoardLexiconClassificationApplyRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw badRequestError('Invalid job-board lexicon classification request.', {
      issues: parsed.error.issues,
    });
  }
  const input = parsed.data;
  const { database } = await loadFilemakerDatabase();
  const classificationResult = buildOfferWithClassifiedPills(
    database,
    input.offer,
    input.classifications
  );
  const resolvedListingId = resolveClassificationListingId(
    database,
    input.offer,
    input.listingId
  );
  let createdLexiconTerms = 0;
  let linkedLexiconTerms = 0;
  let changed = false;
  const warnings = [...classificationResult.warnings];

  if (classificationResult.acceptedPills.length > 0 && resolvedListingId !== null) {
    const lexicon = applyOfferLexiconToListing(database, resolvedListingId, {
      ...input.offer,
      pills: classificationResult.acceptedPills,
    });
    createdLexiconTerms = lexicon.createdTerms;
    linkedLexiconTerms = lexicon.linkedTerms;
    changed = lexicon.changed;
  } else if (classificationResult.acceptedPills.length > 0) {
    const lexicon = upsertClassifiedPillsToLexicon(
      database,
      classificationResult.acceptedPills,
      input.offer.sourceSite
    );
    createdLexiconTerms = lexicon.createdTerms;
    changed = lexicon.changed;
    warnings.push('No saved listing was found; lexicon terms were enriched for the preview offer.');
  }

  if (changed) {
    const persisted = await upsertFilemakerCampaignSettingValue(
      FILEMAKER_DATABASE_KEY,
      JSON.stringify(toPersistedFilemakerDatabase(normalizeFilemakerDatabase(database)))
    );
    if (!persisted) {
      throw internalError('Failed to persist job-board lexicon classifications.');
    }
  }

  return {
    listingId: resolvedListingId,
    offer: classificationResult.updatedOffer,
    summary: {
      acceptedClassifications: classificationResult.acceptedPills.length,
      createdLexiconTerms,
      linkedLexiconTerms,
      persisted: changed,
      rejectedClassifications: classificationResult.rejectedCount,
    },
    warnings: uniqueStrings(warnings),
  };
};

const applyImport = async ({
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
  const createdCandidatesByCompanyKey = new Map<string, ScrapedCompanyCandidate>();
  const results: FilemakerJobBoardScrapeOfferResult[] = [];

  for (const offer of offers) {
    const existingSourceIndex = findExistingListingIndexBySourceIdentity(database.jobListings, {
      sourceExternalId: offer.sourceExternalId,
      sourceSite: offer.sourceSite,
      sourceUrl: offer.sourceUrl,
    });
    const existingSourceListing =
      existingSourceIndex >= 0 ? database.jobListings[existingSourceIndex] : undefined;
    const companyKey = normalizeNameForMatch(offer.companyName);
    if (existingSourceListing !== undefined && options.duplicateStrategy === 'skip') {
      let duplicateListing = existingSourceListing;
      const existingOrganization =
        database.organizations.find(
          (organization: FilemakerOrganization): boolean =>
            organization.id === duplicateListing.organizationId
        ) ?? null;
      const existingOrganizationMatches =
        existingOrganization !== null &&
        companyKey.length > 0 &&
        normalizeNameForMatch(existingOrganization.name) === companyKey;
      if (
        !existingOrganizationMatches &&
        companyKey.length > 0 &&
        !isSuspiciousJobBoardCompanyName(offer.companyName)
      ) {
        const companyCandidate = await getOrCreateScrapedCompanyCandidate({
          companyKey,
          createdCandidatesByCompanyKey,
          database,
          offer,
        });
        changed = changed || companyCandidate.created;
        counters.createdOrganizations += companyCandidate.created ? 1 : 0;
        counters.profileUpdates += companyCandidate.profileUpdated ? 1 : 0;
        duplicateListing = createFilemakerJobListing({
          ...duplicateListing,
          organizationId: companyCandidate.candidate.organization.id,
          updatedAt: new Date().toISOString(),
        });
        database.jobListings.splice(existingSourceIndex, 1, duplicateListing);
        changed = true;
        const match: FilemakerJobBoardOrganizationMatch = {
          confidence: 100,
          organizationId: companyCandidate.candidate.organization.id,
          organizationName: companyCandidate.candidate.organization.name,
          reason: companyCandidate.created
            ? 'created from scraped job-board employer'
            : 'same scraped employer in current import',
        };
        await emitWriteResult(
          onWrite,
          companyCandidate.created ? 'organization_created' : 'organization_linked',
          { listingId: duplicateListing.id, match, offer, reason: null, status: 'preview' },
          companyCandidate.profileUpdated
        );
      }
      const result = buildExistingListingSkippedResult(
        database,
        duplicateListing,
        offer.sourceSite,
        offer.sourceUrl
      );
      results.push(result);
      await emitWriteResult(onWrite, 'listing_skipped', result, false);
      const addressApply = applyOfferAddressToDatabaseJobListing(
        database,
        duplicateListing.id,
        offer
      );
      if (addressApply.changed) {
        changed = true;
        counters.addressUpdates += 1;
        await emitWriteResult(onWrite, 'listing_address_updated', result, false);
      }
      const lexicon = applyOfferLexiconToListing(database, duplicateListing.id, offer);
      if (lexicon.changed) {
        changed = true;
        counters.createdLexiconTerms += lexicon.createdTerms;
        counters.linkedLexiconTerms += lexicon.linkedTerms;
        await emitWriteResult(onWrite, 'listing_lexicon_linked', result, false);
      }
      continue;
    }

    if (companyKey.length === 0 || isSuspiciousJobBoardCompanyName(offer.companyName)) {
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: null,
        match: null,
        offer,
        reason:
          companyKey.length === 0
            ? 'Scraped employer name is empty, so no organisation was created.'
            : 'Scraped employer name looks like job-board directory metadata, so no organisation was created.',
        status: 'unmatched',
      };
      results.push(result);
      await emitWriteResult(onWrite, 'offer_unmatched', result, false);
      continue;
    }
    const companyCandidate = await getOrCreateScrapedCompanyCandidate({
      companyKey,
      createdCandidatesByCompanyKey,
      database,
      offer,
    });
    const matchedCandidate = companyCandidate.candidate;
    const createdOrganization = companyCandidate.created;
    const createdOrganizationProfileUpdated = companyCandidate.profileUpdated;
    const match: FilemakerJobBoardOrganizationMatch = {
      confidence: 100,
      organizationId: matchedCandidate.organization.id,
      organizationName: matchedCandidate.organization.name,
      reason: createdOrganization
        ? 'created from scraped job-board employer'
        : 'same scraped employer in current import',
    };
    if (createdOrganization) {
      changed = true;
      counters.createdOrganizations += 1;
      counters.profileUpdates += createdOrganizationProfileUpdated ? 1 : 0;
      await emitWriteResult(
        onWrite,
        'organization_created',
        { listingId: null, match, offer, reason: null, status: 'created' },
        createdOrganizationProfileUpdated
      );
    } else {
      await emitWriteResult(
        onWrite,
        'organization_linked',
        { listingId: null, match, offer, reason: null, status: 'preview' },
        false
      );
    }

    if (ensureOrganizationInDatabase(database, matchedCandidate.organization)) {
      changed = true;
      await emitWriteResult(
        onWrite,
        'organization_linked',
        { listingId: null, match, offer, reason: null, status: 'preview' },
        false
      );
    }
    await upsertMongoOrganizationForJobBoardImport(matchedCandidate.organization);
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
    const matchedExistingIndex = findExistingListingIndex(
      database.jobListings,
      match.organizationId,
      offer
    );
    const existingIndex =
      options.duplicateStrategy === 'update' && existingSourceIndex >= 0
        ? existingSourceIndex
        : matchedExistingIndex;
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
      const addressApply = applyOfferAddressToDatabaseJobListing(database, existing.id, offer);
      if (addressApply.changed) {
        changed = true;
        counters.addressUpdates += 1;
        await emitWriteResult(onWrite, 'listing_address_updated', result, false);
      }
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
      const addressApply = applyOfferAddressToDatabaseJobListing(database, listing.id, offer);
      if (addressApply.changed) {
        changed = true;
        counters.addressUpdates += 1;
        await emitWriteResult(onWrite, 'listing_address_updated', result, false);
      }
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
      const addressApply = applyOfferAddressToDatabaseJobListing(database, listing.id, offer);
      if (addressApply.changed) {
        counters.addressUpdates += 1;
        await emitWriteResult(onWrite, 'listing_address_updated', result, false);
      }
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
    const match = result.match;
    if (match !== null) {
      const organization = database.organizations.find(
        (entry: FilemakerOrganization): boolean => entry.id === match.organizationId
      );
      if (organization === undefined) {
        warnings.push(
          `Import verification could not find organisation ${match.organizationName}.`
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
): FilemakerJobBoardDuplicateStrategy => strategy;

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
    importStrategy: 'create_unmatched',
    maxOffers: input.offers.length,
    maxPages: 1,
    minimumMatchConfidence: 85,
    mode: 'import',
    organizationScope: 'all',
    personaId: null,
    provider: input.provider,
    selectedOrganizationIds: [],
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
  database: FilemakerDatabase,
  progress: ScrapeProgressHandlers = {},
  signal?: AbortSignal
): Promise<CentralizedScrapeResult> => {
  throwIfScrapeAborted(signal);
  await progress.onStatus?.('Collecting job-board offer links.');
  const collected = await collectOfferLinks(options);
  throwIfScrapeAborted(signal);
  const offers: FilemakerJobBoardScrapedOffer[] = [];
  const skippedResults: FilemakerJobBoardScrapeOfferResult[] = [];
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
    if (options.duplicateStrategy !== 'add') {
      const existingIndex = findExistingListingIndexBySourceIdentity(database.jobListings, {
        sourceSite: collected.sourceSite,
        sourceUrl: url,
      });
      const existingListing =
        existingIndex >= 0 ? database.jobListings[existingIndex] : undefined;
      if (existingListing !== undefined) {
        const result = buildExistingListingSkippedResult(
          database,
          existingListing,
          collected.sourceSite,
          url
        );
        skippedResults.push(result);
        await progress.onStatus?.(
          `Skipping existing offer ${index + 1} of ${collected.urls.length}: ${url}`
        );
        await progress.onSkippedExisting?.({
          index: index + 1,
          result,
          total: collected.urls.length,
          url,
        });
        continue;
      }
    }
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
      validationPatterns: database.lexiconValidationPatterns,
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
    skippedResults,
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

  await emitLiveEvent(onEvent, { message: 'Saving scraped job-board drafts.', type: 'status' });
  const effectiveHeadless = await resolveEffectiveHeadless(options.headless);
  const provider = resolveDraftSaveProvider(input);
  const sourceSite = resolveDraftSaveSourceSite(input, provider);
  throwIfScrapeAborted(signal);
  const { database } = await loadFilemakerDatabase();
  throwIfScrapeAborted(signal);
  const imported = await applyImport({
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
  const parsedOptions = parsed.data;
  const options: FilemakerJobBoardScrapeRequest = {
    ...parsedOptions,
    duplicateStrategy: parsedOptions.duplicateStrategy,
  };
  const onEvent = runOptions.onEvent;
  const signal = runOptions.signal;
  throwIfScrapeAborted(signal);
  await emitLiveEvent(onEvent, { message: 'Preparing job-board scraper.', type: 'status' });
  const effectiveHeadless = await resolveEffectiveHeadless(options.headless);
  throwIfScrapeAborted(signal);

  await emitLiveEvent(onEvent, { message: 'Loading FileMaker database.', type: 'status' });
  const { database } = await loadFilemakerDatabase();
  throwIfScrapeAborted(signal);
  const scraped = await scrapeOffersViaJobBoardSequencer(
    options,
    database,
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
          result: buildOfferResult(input.offer, null),
          total: input.total,
          type: 'offer',
        }),
      onSkippedExisting: async (input) => {
        await emitLiveEvent(onEvent, {
          index: input.index,
          result: input.result,
          total: input.total,
          type: 'offer',
        });
        await emitLiveEvent(onEvent, {
          type: 'write',
          write: {
            action: 'listing_skipped',
            message: buildWriteMessage('listing_skipped', input.result),
            profileUpdated: false,
            result: input.result,
          },
        });
      },
      onStatus: (message) => emitLiveEvent(onEvent, { message, type: 'status' }),
      onWarning: (warning) => emitLiveEvent(onEvent, { type: 'warning', warning }),
    },
    signal
  );
  const previewResults = [
    ...scraped.skippedResults,
    ...scraped.offers.map((offer) => buildOfferResult(offer, null)),
  ];

  let results = previewResults;
  let importCounters: ImportCounters = { ...EMPTY_IMPORT_COUNTERS };
  let importVerification: ImportVerification = { ...EMPTY_IMPORT_VERIFICATION };
  if (options.mode === 'import') {
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Importing scraped offers.', type: 'status' });
    const imported = await applyImport({
      database,
      offers: scraped.offers,
      onWrite: (write) => emitLiveEvent(onEvent, { type: 'write', write }),
      options,
    });
    importCounters = imported.counters;
    results = [...scraped.skippedResults, ...imported.results];
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
