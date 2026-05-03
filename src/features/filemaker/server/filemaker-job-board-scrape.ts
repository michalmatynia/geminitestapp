import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop */

import { randomUUID } from 'crypto';

import type { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';
import {
  collectJobBoardOfferUrls,
  collectJobBoardOfferUrlsDeterministically,
  isJobBoardOfferUrl,
} from '@/features/job-board/server/providers/job-board-sync';
import { getFilemakerOrganizationsCollection } from '@/features/filemaker/server/filemaker-organizations-mongo';
import { badRequestError, internalError } from '@/shared/errors/app-error';
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
  createFilemakerJobListing,
  createFilemakerOrganization,
  toPersistedFilemakerDatabase,
} from '../settings';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import { normalizeString } from '../filemaker-settings.helpers';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerLexiconTerm,
  FilemakerOrganization,
} from '../types';
import { resolveJobBoardOriginLabel } from '../job-board-origin';
import { upsertFilemakerCampaignSettingValue } from './campaign-settings-store';

type ScrapedCompanyCandidate = {
  organization: FilemakerOrganization;
};

type ApplyImportInput = {
  database: FilemakerDatabase;
  onWrite?: (write: FilemakerJobBoardScrapeWriteResult) => Promise<void> | void;
  options: FilemakerJobBoardScrapeRequest;
  offers: FilemakerJobBoardScrapedOffer[];
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
  waitWhilePaused?: () => Promise<void>;
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
  waitWhilePaused?: () => Promise<void>;
};

const DEFAULT_WARNINGS: string[] = [];

import {
  emitLiveEvent,
  resolveEffectiveHeadless,
  sleep,
  throwIfScrapeAborted,
  type FilemakerJobBoardScrapeLiveEventEmitter,
} from './job-board-scrape/live-events';

import {
  normalizeJobBoardSourceUrl,
  normalizeLexiconKey,
  uniqueStrings,
} from './job-board-scrape/normalizers';
import { classifyFilemakerLexiconLabelWithPatterns } from './job-board-scrape/lexicon-validation-patterns';
import { probeJobBoardOfferWithRetry } from './job-board-scrape/probe-retry';
import {
  EMPTY_IMPORT_COUNTERS,
  EMPTY_IMPORT_VERIFICATION,
  verifyImportedResults,
  type ImportCounters,
  type ImportVerification,
} from './job-board-scrape/import-verification';
import {
  buildOfferResult,
  buildSummary,
  buildWriteMessage,
} from './job-board-scrape/output-builders';
import {
  loadFilemakerDatabase,
  loadPersistedVerificationDatabase,
} from './job-board-scrape/database-loader';
import {
  isSuspiciousJobBoardCompanyName,
  offerFromEvaluation,
} from './job-board-scrape/offer-from-evaluation';

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
  findExistingListingIndexesBySourceIdentity,
  normalizeNameForMatch,
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
    requirements:
      (input.offer.requirements?.trim().length ?? 0) > 0
        ? input.offer.requirements
        : input.existing?.requirements,
    responsibilities:
      (input.offer.responsibilities?.trim().length ?? 0) > 0
        ? input.offer.responsibilities
        : input.existing?.responsibilities,
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

const optionalScrapedString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const scrapedOrExisting = (scraped: unknown, existing: unknown): string | undefined => {
  const scrapedValue = optionalScrapedString(scraped);
  if (scrapedValue !== undefined) return scrapedValue;
  return optionalScrapedString(existing);
};

const fillEmptyOrganizationField = (existing: unknown, scraped: unknown): string | undefined => {
  const existingValue = optionalScrapedString(existing);
  if (existingValue !== undefined) return existingValue;
  return optionalScrapedString(scraped);
};

const hasScrapedCompanyInformation = (offer: FilemakerJobBoardScrapedOffer): boolean =>
  [
    offer.companyProfile,
    offer.companyProfileUrl,
    offer.companyWebsiteUrl,
    offer.companyEmail,
    offer.companyPhone,
    offer.companyIndustry,
    offer.companySize,
    offer.companyLogoUrl,
    offer.companyTaxId,
    offer.companyKrs,
    offer.companyRegon,
    offer.companyAddress,
    offer.companyCity,
    offer.companyRegion,
    offer.companyPostalCode,
    offer.companyCountry,
    offer.sourceSite,
    offer.sourceUrl,
  ].some((value: unknown): boolean => normalizeString(value).length > 0);

const hasScrapedCompanyProfileInformation = (
  offer: FilemakerJobBoardScrapedOffer
): boolean =>
  [
    offer.companyProfile,
    offer.companyProfileUrl,
    offer.companyWebsiteUrl,
    offer.companyEmail,
    offer.companyPhone,
    offer.companyIndustry,
    offer.companySize,
    offer.companyLogoUrl,
    offer.companyTaxId,
    offer.companyKrs,
    offer.companyRegon,
    offer.companyAddress,
    offer.companyCity,
    offer.companyRegion,
    offer.companyPostalCode,
    offer.companyCountry,
  ].some((value: unknown): boolean => normalizeString(value).length > 0);

const normalizeCompanyIdentityValue = (value: unknown): string =>
  normalizeString(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const JOB_BOARD_COMPANY_IDENTITY_HOSTS = [
  'ashbyhq.com',
  'breezy.hr',
  'erecruiter.pl',
  'facebook.com',
  'greenhouse.io',
  'github.com',
  'gitlab.com',
  'instagram.com',
  'justjoin.it',
  'lever.co',
  'linkedin.com',
  'medium.com',
  'nofluffjobs.com',
  'nofluffjobs.pl',
  'pracuj.pl',
  'smartrecruiters.com',
  'teamtailor.com',
  'tiktok.com',
  'traffit.com',
  'twitter.com',
  'workable.com',
  'x.com',
  'youtube.com',
  'youtu.be',
] as const;

const isKnownJobBoardHost = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./u, '');
  return JOB_BOARD_COMPANY_IDENTITY_HOSTS.some(
    (host: string): boolean => hostname === host || hostname.endsWith(`.${host}`)
  );
};

const isPracujEmployerProfileUrlWithSlug = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./u, '');
  if (!/pracuj\.pl$/iu.test(hostname)) return true;
  const employerPathKeys = new Set([
    'firma',
    'firmy',
    'pracodawca',
    'pracodawcy',
    'profil pracodawcy',
    'profil pracodawcow',
    'profile pracodawcy',
    'profile pracodawcow',
  ]);
  const parts = url.pathname.split('/').filter(Boolean);
  const employerIndex = parts.findIndex((part: string): boolean =>
    employerPathKeys.has(normalizeNameForMatch(decodeURIComponent(part)))
  );
  return employerIndex >= 0 && normalizeString(parts[employerIndex + 1]).length > 0;
};

const titleCaseScrapedCompanyName = (value: string): string =>
  value
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\b[^\s]/gu, (letter: string): string => letter.toUpperCase());

const companyNameFromPracujEmployerProfileUrl = (value: unknown): string | null => {
  const normalized = normalizeJobBoardSourceUrl(value);
  if (normalized === null) return null;
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase().replace(/^www\./u, '');
    if (!/pracuj\.pl$/iu.test(hostname)) return null;
    if (!isPracujEmployerProfileUrlWithSlug(url)) return null;
    const employerPathKeys = new Set([
      'firma',
      'firmy',
      'pracodawca',
      'pracodawcy',
      'profil pracodawcy',
      'profil pracodawcow',
      'profile pracodawcy',
      'profile pracodawcow',
    ]);
    const parts = url.pathname.split('/').filter(Boolean);
    const employerIndex = parts.findIndex((part: string): boolean =>
      employerPathKeys.has(normalizeNameForMatch(decodeURIComponent(part)))
    );
    const slugPart = employerIndex >= 0 ? parts[employerIndex + 1] : undefined;
    const slug = decodeURIComponent(slugPart ?? '').split(',')[0] ?? '';
    const companyName = titleCaseScrapedCompanyName(slug);
    return companyName.length > 0 && !isSuspiciousJobBoardCompanyName(companyName)
      ? companyName
      : null;
  } catch {
    return null;
  }
};

const isDomainLikeCompanyName = (value: unknown): boolean =>
  /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/iu.test(normalizeString(value));

const shouldUseScrapedCompanyNameForOrganization = (
  organization: FilemakerOrganization,
  offer: FilemakerJobBoardScrapedOffer
): boolean => {
  if (isSuspiciousJobBoardCompanyName(offer.companyName)) return false;
  if (isSuspiciousJobBoardCompanyName(organization.name)) return true;
  if (isDomainLikeCompanyName(offer.companyName)) return false;
  return isDomainLikeCompanyName(organization.name);
};

const resolveScrapedCompanyDisplayName = (
  offer: FilemakerJobBoardScrapedOffer
): string | null => {
  const scrapedName = normalizeString(offer.companyName);
  if (
    offer.companyNameSource !== undefined &&
    scrapedName.length > 0 &&
    !isSuspiciousJobBoardCompanyName(scrapedName)
  ) {
    return scrapedName;
  }
  const profileName = companyNameFromPracujEmployerProfileUrl(offer.companyProfileUrl);
  if (profileName !== null) return profileName;
  if (scrapedName.length > 0 && !isSuspiciousJobBoardCompanyName(scrapedName)) {
    return scrapedName;
  }
  return null;
};

const offerWithResolvedCompanyName = (
  offer: FilemakerJobBoardScrapedOffer
): FilemakerJobBoardScrapedOffer => {
  const companyName = resolveScrapedCompanyDisplayName(offer);
  if (companyName === null || companyName === offer.companyName) return offer;
  return { ...offer, companyName, companyNameSource: offer.companyNameSource ?? 'profile_url' };
};

const normalizeCompanyIdentityUrl = (value: unknown): string => {
  const normalized = normalizeJobBoardSourceUrl(value);
  if (normalized === null) return '';
  try {
    const parsed = new URL(normalized);
    if (!isPracujEmployerProfileUrlWithSlug(parsed)) return '';
    if (isKnownJobBoardHost(parsed) && !/pracuj\.pl$/iu.test(parsed.hostname.replace(/^www\./u, ''))) {
      return '';
    }
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./u, '');
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/u, '');
    return parsed.toString().toLowerCase();
  } catch {
    return normalizeNameForMatch(normalized);
  }
};

const companyIdentityKeysFromUrl = (value: unknown): string[] => {
  const normalized = normalizeCompanyIdentityUrl(value);
  if (normalized.length === 0) return [];
  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./u, '');
    if (/pracuj\.pl$/iu.test(hostname)) return [`profile:${normalized}`];
    return [`website:${hostname}`];
  } catch {
    return [`website:${normalized}`];
  }
};

const buildScrapedCompanyIdentityKey = (offer: FilemakerJobBoardScrapedOffer): string => {
  const registryCandidates: Array<[string, unknown]> = [
    ['tax', offer.companyTaxId],
    ['krs', offer.companyKrs],
    ['regon', offer.companyRegon],
  ];
  for (const [kind, value] of registryCandidates) {
    const normalized = normalizeCompanyIdentityValue(value);
    if (normalized.length > 0) return `${kind}:${normalized}`;
  }
  const nameKey = normalizeNameForMatch(offer.companyName);
  const hasReliableSelectorName =
    offer.companyNameSource === 'employer_selector' &&
    nameKey.length >= 3 &&
    !isSuspiciousJobBoardCompanyName(offer.companyName);
  const profileName = companyNameFromPracujEmployerProfileUrl(offer.companyProfileUrl);
  const profileConflictsWithSelectorName =
    hasReliableSelectorName &&
    profileName !== null &&
    normalizeNameForMatch(profileName) !== nameKey;
  const profileUrlKey = companyIdentityKeysFromUrl(offer.companyProfileUrl).find(
    (key: string): boolean => key.startsWith('profile:')
  );
  if (profileUrlKey !== undefined && !profileConflictsWithSelectorName) {
    return profileUrlKey;
  }
  if (nameKey.length >= 3 && !isSuspiciousJobBoardCompanyName(offer.companyName)) {
    return `name:${nameKey}`;
  }
  return '';
};

const buildOrganizationCompanyIdentityKeys = (
  organization: FilemakerOrganization
): Set<string> => {
  const keys = new Set<string>();
  const tax = normalizeCompanyIdentityValue(organization.taxId);
  const krs = normalizeCompanyIdentityValue(organization.krs);
  const regon = normalizeCompanyIdentityValue(organization.regon);
  const nameKey = normalizeNameForMatch(organization.name);
  const tradingNameKey = normalizeNameForMatch(organization.tradingName ?? '');
  if (tax.length > 0) keys.add(`tax:${tax}`);
  if (krs.length > 0) keys.add(`krs:${krs}`);
  if (regon.length > 0) keys.add(`regon:${regon}`);
  companyIdentityKeysFromUrl(organization.jobBoardCompanyProfileUrl).forEach((key: string) => {
    if (key.startsWith('profile:')) keys.add(key);
  });
  if (nameKey.length > 0) keys.add(`name:${nameKey}`);
  if (tradingNameKey.length > 0) keys.add(`name:${tradingNameKey}`);
  return keys;
};

const organizationMatchesScrapedCompany = (input: {
  companyIdentityKey: string;
  companyNameKey: string;
  offer: FilemakerJobBoardScrapedOffer;
  organization: FilemakerOrganization;
}): boolean => {
  if (
    input.companyIdentityKey.length > 0 &&
    buildOrganizationCompanyIdentityKeys(input.organization).has(input.companyIdentityKey)
  ) {
    return true;
  }
  return (
    input.companyNameKey.length >= 3 &&
    !isSuspiciousJobBoardCompanyName(input.offer.companyName) &&
    buildOrganizationCompanyIdentityKeys(input.organization).has(`name:${input.companyNameKey}`)
  );
};

const hasPersistedJobBoardOrganizationIdentity = (
  organization: FilemakerOrganization
): boolean =>
  [
    organization.jobBoardCompanyProfileUrl,
    organization.jobBoardSourceUrl,
    organization.jobBoardScrapedAt,
    organization.taxId,
    organization.krs,
    organization.regon,
  ].some((value: unknown): boolean => normalizeString(value).length > 0);

const readMongoOrganizationIds = async (): Promise<Set<string>> => {
  try {
    const collection = await getFilemakerOrganizationsCollection();
    const documents = await collection.find({}).limit(10_000).toArray();
    return new Set(
      documents
        .map((document: unknown): string => normalizeString((document as { id?: unknown }).id))
        .filter((id: string): boolean => id.length > 0)
    );
  } catch {
    return new Set();
  }
};

const shouldConsiderOrganizationForScrapedMatch = (
  organization: FilemakerOrganization,
  mongoOrganizationIds: ReadonlySet<string>
): boolean =>
  mongoOrganizationIds.has(organization.id) ||
  hasPersistedJobBoardOrganizationIdentity(organization);

const ORGANIZATION_PROFILE_COMPARE_FIELDS = [
  'city',
  'country',
  'countryId',
  'jobBoardCompanyEmail',
  'jobBoardCompanyIndustry',
  'jobBoardCompanyLogoUrl',
  'jobBoardCompanyPhone',
  'jobBoardCompanyProfile',
  'jobBoardCompanyProfileScrapedAt',
  'jobBoardCompanyProfileUrl',
  'jobBoardCompanyAddress',
  'jobBoardCompanyRegion',
  'jobBoardCompanySize',
  'jobBoardCompanyWebsiteUrl',
  'jobBoardScrapedAt',
  'jobBoardSourceLabel',
  'jobBoardSourceSite',
  'jobBoardSourceUrl',
  'krs',
  'name',
  'postalCode',
  'regon',
  'street',
  'streetNumber',
  'taxId',
] as const satisfies readonly (keyof FilemakerOrganization)[];

const applyOfferProfileToOrganization = (
  organization: FilemakerOrganization,
  offer: FilemakerJobBoardScrapedOffer,
  now = new Date().toISOString()
): { changed: boolean; organization: FilemakerOrganization } => {
  if (!hasScrapedCompanyInformation(offer)) {
    return { changed: false, organization };
  }
  const parsedAddress = parseScrapedAddressPill(offer.companyAddress ?? '');
  const sourceLabel = resolveJobBoardOriginLabel({
    sourceSite: offer.sourceSite,
    sourceUrl: offer.sourceUrl,
  });
  const shouldReplaceName = shouldUseScrapedCompanyNameForOrganization(organization, offer);
  const next = createFilemakerOrganization({
    ...organization,
    name: shouldReplaceName ? offer.companyName : organization.name,
    street: fillEmptyOrganizationField(organization.street, parsedAddress?.street),
    streetNumber: fillEmptyOrganizationField(organization.streetNumber, parsedAddress?.streetNumber),
    city: fillEmptyOrganizationField(
      organization.city,
      optionalScrapedString(offer.companyCity) ?? parsedAddress?.city
    ),
    postalCode: fillEmptyOrganizationField(
      organization.postalCode,
      optionalScrapedString(offer.companyPostalCode) ?? parsedAddress?.postalCode
    ),
    country: fillEmptyOrganizationField(
      organization.country,
      optionalScrapedString(offer.companyCountry) ?? parsedAddress?.country
    ),
    countryId: fillEmptyOrganizationField(organization.countryId, parsedAddress?.countryId),
    taxId: fillEmptyOrganizationField(organization.taxId, offer.companyTaxId),
    krs: fillEmptyOrganizationField(organization.krs, offer.companyKrs),
    regon: fillEmptyOrganizationField(organization.regon, offer.companyRegon),
    jobBoardCompanyProfile: scrapedOrExisting(offer.companyProfile, organization.jobBoardCompanyProfile),
    jobBoardCompanyProfileUrl: scrapedOrExisting(
      offer.companyProfileUrl,
      organization.jobBoardCompanyProfileUrl
    ),
    jobBoardCompanyProfileScrapedAt: now,
    jobBoardCompanyAddress: scrapedOrExisting(
      offer.companyAddress,
      organization.jobBoardCompanyAddress
    ),
    jobBoardCompanyRegion: scrapedOrExisting(
      offer.companyRegion,
      organization.jobBoardCompanyRegion
    ),
    jobBoardCompanyWebsiteUrl: scrapedOrExisting(
      offer.companyWebsiteUrl,
      organization.jobBoardCompanyWebsiteUrl
    ),
    jobBoardCompanyEmail: scrapedOrExisting(offer.companyEmail, organization.jobBoardCompanyEmail),
    jobBoardCompanyPhone: scrapedOrExisting(offer.companyPhone, organization.jobBoardCompanyPhone),
    jobBoardCompanyIndustry: scrapedOrExisting(
      offer.companyIndustry,
      organization.jobBoardCompanyIndustry
    ),
    jobBoardCompanySize: scrapedOrExisting(offer.companySize, organization.jobBoardCompanySize),
    jobBoardCompanyLogoUrl: scrapedOrExisting(
      offer.companyLogoUrl,
      organization.jobBoardCompanyLogoUrl
    ),
    jobBoardScrapedAt: now,
    jobBoardSourceLabel: fillEmptyOrganizationField(
      organization.jobBoardSourceLabel,
      sourceLabel
    ),
    jobBoardSourceSite: fillEmptyOrganizationField(
      organization.jobBoardSourceSite,
      offer.sourceSite
    ),
    jobBoardSourceUrl: fillEmptyOrganizationField(
      organization.jobBoardSourceUrl,
      offer.sourceUrl
    ),
    updatedBy: 'filemaker:job-board-scrape',
    updatedAt: now,
  });
  return {
    changed: ORGANIZATION_PROFILE_COMPARE_FIELDS.some(
      (field): boolean => organization[field] !== next[field]
    ),
    organization: next,
  };
};

const applyOfferAddressToDatabaseOrganization = (
  database: FilemakerDatabase,
  organizationId: string,
  offer: FilemakerJobBoardScrapedOffer
): boolean => {
  const parsedAddress = parseScrapedAddressPill(offer.companyAddress ?? '');
  if (parsedAddress === null) return false;
  const organizationIndex = database.organizations.findIndex(
    (organization: FilemakerOrganization): boolean => organization.id === organizationId
  );
  if (organizationIndex < 0) return false;
  const organization = database.organizations[organizationIndex];
  if (organization === undefined) return false;
  const addressRecord = ensureAddressRecord(database, organizationId, parsedAddress);
  const shouldSetDefaultAddress = normalizeString(organization.addressId).length === 0;
  const linkChanged = ensureAddressLink({
    database,
    ownerKind: 'organization',
    ownerId: organizationId,
    addressId: addressRecord.address.id,
    isDefault: shouldSetDefaultAddress,
  });
  if (!shouldSetDefaultAddress) return addressRecord.created || linkChanged;
  const nextOrganization = createFilemakerOrganization({
    ...organization,
    addressId: addressRecord.address.id,
    city: addressRecord.address.city,
    country: addressRecord.address.country,
    countryId: addressRecord.address.countryId,
    postalCode: addressRecord.address.postalCode,
    street: addressRecord.address.street,
    streetNumber: addressRecord.address.streetNumber,
    updatedAt: new Date().toISOString(),
    updatedBy: 'filemaker:job-board-scrape',
  });
  const organizationChanged =
    organization.addressId !== nextOrganization.addressId ||
    ORGANIZATION_PROFILE_COMPARE_FIELDS.some(
      (field): boolean => organization[field] !== nextOrganization[field]
    );
  if (organizationChanged) {
    database.organizations.splice(organizationIndex, 1, nextOrganization);
  }
  return addressRecord.created || linkChanged || organizationChanged;
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
  if (result.changed) {
    database.organizations.splice(index, 1, result.organization);
  }
  const addressChanged = applyOfferAddressToDatabaseOrganization(database, organizationId, offer);
  return result.changed || addressChanged;
};

import { parseScrapedAddressPill } from './job-board-scrape/address';
import {
  applyOfferAddressToDatabaseJobListing,
  ensureAddressLink,
  ensureAddressRecord,
} from './job-board-scrape/address-apply';
import {
  applyOfferLexiconToListing,
  upsertClassifiedPillsToLexicon,
} from './job-board-scrape/lexicon-apply';


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
  mongoOrganizationIds: ReadonlySet<string>;
  offer: FilemakerJobBoardScrapedOffer;
}): Promise<{ candidate: ScrapedCompanyCandidate; created: boolean; profileUpdated: boolean }> => {
  const existingCandidate = args.createdCandidatesByCompanyKey.get(args.companyKey);
  if (existingCandidate !== undefined) {
    return { candidate: existingCandidate, created: false, profileUpdated: false };
  }

  const companyIdentityKey = buildScrapedCompanyIdentityKey(args.offer);
  const companyNameKey = normalizeNameForMatch(args.offer.companyName);
  const existingOrganizationIndex = args.database.organizations.findIndex(
    (organization: FilemakerOrganization): boolean =>
      shouldConsiderOrganizationForScrapedMatch(organization, args.mongoOrganizationIds) &&
      organizationMatchesScrapedCompany({
        companyIdentityKey,
        companyNameKey,
        offer: args.offer,
        organization,
      })
  );
  if (existingOrganizationIndex >= 0) {
    const existingOrganization = args.database.organizations[existingOrganizationIndex];
    if (existingOrganization !== undefined) {
      const profileResult = applyOfferProfileToOrganization(existingOrganization, args.offer);
      const organization = profileResult.organization;
      if (profileResult.changed) {
        args.database.organizations.splice(existingOrganizationIndex, 1, organization);
        await upsertMongoOrganizationForJobBoardImport(organization);
      }
      const candidate: ScrapedCompanyCandidate = { organization };
      args.createdCandidatesByCompanyKey.set(args.companyKey, candidate);
      return { candidate, created: false, profileUpdated: profileResult.changed };
    }
  }

  const createdOrganizationRecord = createUnmatchedOrganization(args.database, args.offer);
  const candidate: ScrapedCompanyCandidate = { organization: createdOrganizationRecord };
  args.createdCandidatesByCompanyKey.set(args.companyKey, candidate);
  await upsertMongoOrganizationForJobBoardImport(candidate.organization);
  return {
    candidate,
    created: true,
    profileUpdated: hasScrapedCompanyInformation(args.offer),
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
    jobBoardCompanyAddress: toOptionalMongoString(organization.jobBoardCompanyAddress),
    jobBoardCompanyRegion: toOptionalMongoString(organization.jobBoardCompanyRegion),
    jobBoardCompanyWebsiteUrl: toOptionalMongoString(organization.jobBoardCompanyWebsiteUrl),
    jobBoardCompanyEmail: toOptionalMongoString(organization.jobBoardCompanyEmail),
    jobBoardCompanyPhone: toOptionalMongoString(organization.jobBoardCompanyPhone),
    jobBoardCompanyIndustry: toOptionalMongoString(organization.jobBoardCompanyIndustry),
    jobBoardCompanySize: toOptionalMongoString(organization.jobBoardCompanySize),
    jobBoardCompanyLogoUrl: toOptionalMongoString(organization.jobBoardCompanyLogoUrl),
    jobBoardScrapedAt: toOptionalMongoString(organization.jobBoardScrapedAt),
    jobBoardSourceLabel: toOptionalMongoString(organization.jobBoardSourceLabel),
    jobBoardSourceSite: toOptionalMongoString(organization.jobBoardSourceSite),
    jobBoardSourceUrl: toOptionalMongoString(organization.jobBoardSourceUrl),
    name: organization.name,
    postalCode: toOptionalMongoString(organization.postalCode),
    regon: toOptionalMongoString(organization.regon),
    street: toOptionalMongoString(organization.street),
    taxId: toOptionalMongoString(organization.taxId),
    krs: toOptionalMongoString(organization.krs),
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

const upsertMongoOrganizationForJobBoardImportIfPresent = async (
  organization: FilemakerOrganization | undefined
): Promise<void> => {
  if (organization === undefined) return;
  await upsertMongoOrganizationForJobBoardImport(organization);
};

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
    companyWebsiteUrl: organization?.jobBoardCompanyWebsiteUrl ?? null,
    companyEmail: organization?.jobBoardCompanyEmail ?? null,
    companyPhone: organization?.jobBoardCompanyPhone ?? null,
    companyIndustry: organization?.jobBoardCompanyIndustry ?? '',
    companySize: organization?.jobBoardCompanySize ?? '',
    companyLogoUrl: organization?.jobBoardCompanyLogoUrl ?? null,
    companyTaxId: organization?.taxId ?? '',
    companyKrs: organization?.krs ?? '',
    companyRegon: organization?.regon ?? '',
    companyAddress:
      organization?.jobBoardCompanyAddress ??
      [
        organization?.street,
        organization?.streetNumber,
        organization?.postalCode,
        organization?.city,
        organization?.country,
      ]
        .map((value: unknown): string => normalizeString(value))
        .filter((value: string): boolean => value.length > 0)
        .join(', '),
    companyCity: organization?.city ?? '',
    companyRegion: organization?.jobBoardCompanyRegion ?? '',
    companyPostalCode: organization?.postalCode ?? '',
    companyCountry: organization?.country ?? '',
    description: listing.description,
    requirements: listing.requirements,
    responsibilities: listing.responsibilities,
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
  const listingMatchesOfferOrganization = (listing: FilemakerJobListing): boolean => {
    const organization = database.organizations.find(
      (entry: FilemakerOrganization): boolean => entry.id === listing.organizationId
    );
    if (organization === undefined) return false;
    const companyIdentityKey = buildScrapedCompanyIdentityKey(offer);
    if (companyIdentityKey.length === 0) return false;
    return organizationMatchesScrapedCompany({
      companyIdentityKey,
      companyNameKey: normalizeNameForMatch(offer.companyName),
      offer,
      organization,
    });
  };
  if (listingId !== null) {
    const explicitListing = database.jobListings.find(
      (listing: FilemakerJobListing): boolean => listing.id === listingId
    );
    if (explicitListing !== undefined && listingMatchesOfferOrganization(explicitListing)) {
      return explicitListing.id;
    }
  }
  const sourceIndexes = findExistingListingIndexesBySourceIdentity(database.jobListings, {
    sourceExternalId: offer.sourceExternalId,
    sourceSite: offer.sourceSite,
    sourceUrl: offer.sourceUrl,
  });
  const sourceListing = sourceIndexes
    .map((index: number): FilemakerJobListing | undefined => database.jobListings[index])
    .find(
      (listing: FilemakerJobListing | undefined): listing is FilemakerJobListing =>
        listing !== undefined && listingMatchesOfferOrganization(listing)
    );
  return sourceListing?.id ?? null;
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
  const offer = offerWithResolvedCompanyName(input.offer);
  const { database } = await loadFilemakerDatabase();
  const classificationResult = buildOfferWithClassifiedPills(
    database,
    offer,
    input.classifications
  );
  const resolvedListingId = resolveClassificationListingId(
    database,
    offer,
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
      JSON.stringify(toPersistedFilemakerDatabase(database))
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
  warnings: string[];
}> => {
  let changed = false;
  const counters: ImportCounters = { ...EMPTY_IMPORT_COUNTERS };
  const createdCandidatesByCompanyKey = new Map<string, ScrapedCompanyCandidate>();
  const results: FilemakerJobBoardScrapeOfferResult[] = [];
  const warnings: string[] = [];
  const mongoOrganizationIds = await readMongoOrganizationIds();

  for (const rawOffer of offers) {
    const offer = offerWithResolvedCompanyName(rawOffer);
    const existingSourceIndexes = findExistingListingIndexesBySourceIdentity(database.jobListings, {
      sourceExternalId: offer.sourceExternalId,
      sourceSite: offer.sourceSite,
      sourceUrl: offer.sourceUrl,
    });
    const companyNameKey = normalizeNameForMatch(offer.companyName);
    const companyKey = buildScrapedCompanyIdentityKey(offer);
    const isPracujSource = /pracuj/iu.test(
      `${normalizeString(offer.sourceSite)} ${normalizeString(offer.sourceUrl)}`
    );
    const isNameOnlyCompanyIdentity = companyKey.startsWith('name:');
    const isSelectorBackedCompanyIdentity = offer.companyNameSource === 'employer_selector';
    const hasEmployerProfileIdentity = buildScrapedCompanyIdentityKey({
      ...offer,
      companyName: '',
    }).startsWith('profile:');
    const isPracujNameOnlyWithoutReliableIdentity =
      isPracujSource &&
      isNameOnlyCompanyIdentity &&
      !hasEmployerProfileIdentity &&
      !isSelectorBackedCompanyIdentity;
    const existingSourceCandidates = existingSourceIndexes.flatMap((index: number) => {
      const listing = database.jobListings[index];
      if (listing === undefined) return [];
      const organization =
        database.organizations.find(
          (entry: FilemakerOrganization): boolean => entry.id === listing.organizationId
        ) ?? null;
      const organizationMatches =
        organization !== null &&
        organizationMatchesScrapedCompany({
          companyIdentityKey: companyKey,
          companyNameKey,
          offer,
          organization,
        });
      return [{ index, listing, organization, organizationMatches }];
    });
    const matchingExistingSourceCandidate =
      existingSourceCandidates.find((candidate): boolean => candidate.organizationMatches) ?? null;
    const selectedExistingSourceCandidate =
      matchingExistingSourceCandidate ?? existingSourceCandidates[0] ?? null;
    const existingSourceIndex = selectedExistingSourceCandidate?.index ?? -1;
    const existingSourceListing = selectedExistingSourceCandidate?.listing;
    const existingSourceOrganization = selectedExistingSourceCandidate?.organization ?? null;
    const existingSourceOrganizationMatches = matchingExistingSourceCandidate !== null;
    const existingSourceIndexForCompany = matchingExistingSourceCandidate?.index ?? -1;
    const mismatchedExistingSourceCount = existingSourceCandidates.filter(
      (candidate): boolean => !candidate.organizationMatches
    ).length;
    if (matchingExistingSourceCandidate !== null && mismatchedExistingSourceCount > 0) {
      warnings.push(
        `Found ${mismatchedExistingSourceCount} stale source duplicate${mismatchedExistingSourceCount === 1 ? '' : 's'} for ${offer.title} under another organisation.`
      );
    }
    if (existingSourceListing !== undefined && !existingSourceOrganizationMatches) {
      warnings.push(
        `Ignored existing source match for ${offer.title} because it belongs to a different organisation.`
      );
    }
    if (
      existingSourceListing !== undefined &&
      existingSourceOrganizationMatches &&
      existingSourceOrganization !== null &&
      options.duplicateStrategy === 'skip'
    ) {
      const duplicateListing = existingSourceListing;
      const profileUpdated =
        hasScrapedCompanyProfileInformation(offer) &&
        applyOfferProfileToDatabaseOrganization(database, existingSourceOrganization.id, offer);
      if (profileUpdated) {
        changed = true;
        counters.updatedOrganizations += 1;
        counters.profileUpdates += 1;
        const updatedOrganization = database.organizations.find(
          (organization: FilemakerOrganization): boolean =>
            organization.id === existingSourceOrganization.id
        );
        await upsertMongoOrganizationForJobBoardImportIfPresent(updatedOrganization);
        await emitWriteResult(
          onWrite,
          'organization_profile_updated',
          {
            listingId: duplicateListing.id,
            match: {
              confidence: 100,
              organizationId: existingSourceOrganization.id,
              organizationName: existingSourceOrganization.name,
              reason: 'existing listing source identity matched scraped employer',
            },
            offer,
            reason: null,
            status: 'updated',
          },
          true
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

    if (
      companyNameKey.length === 0 ||
      companyKey.length === 0 ||
      isPracujNameOnlyWithoutReliableIdentity ||
      isSuspiciousJobBoardCompanyName(offer.companyName)
    ) {
      let reason = 'Scraped employer name looks like job-board directory metadata, so no organisation was created.';
      if (companyNameKey.length === 0) {
        reason = 'Scraped employer name is empty, so no organisation was created.';
      } else if (companyKey.length === 0) {
        reason = 'Scraped employer identity is not reliable enough to create an organisation.';
      } else if (isPracujNameOnlyWithoutReliableIdentity) {
        reason =
          'Pracuj.pl employer identity is name-only with no employer profile URL, so no organisation was created.';
      }
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: null,
        match: null,
        offer,
        reason,
        status: 'unmatched',
      };
      warnings.push(`${offer.title}: ${reason}`);
      results.push(result);
      await emitWriteResult(onWrite, 'offer_unmatched', result, false);
      continue;
    }
    const companyCandidate = await getOrCreateScrapedCompanyCandidate({
      companyKey,
      createdCandidatesByCompanyKey,
      database,
      mongoOrganizationIds,
      offer,
    });
    let matchedCandidate = companyCandidate.candidate;
    let createdOrganization = companyCandidate.created;
    let createdOrganizationProfileUpdated = companyCandidate.profileUpdated;
    if (
      !organizationMatchesScrapedCompany({
        companyIdentityKey: companyKey,
        companyNameKey,
        offer,
        organization: matchedCandidate.organization,
      })
    ) {
      warnings.push(
        `Created a separate organisation for ${offer.title} because the matched organisation did not match the scraped employer.`
      );
      const createdOrganizationRecord = createUnmatchedOrganization(database, offer);
      matchedCandidate = { organization: createdOrganizationRecord };
      createdCandidatesByCompanyKey.set(companyKey, matchedCandidate);
      createdOrganization = true;
      createdOrganizationProfileUpdated = hasScrapedCompanyInformation(offer);
    }
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
      if (createdOrganizationProfileUpdated) {
        changed = true;
        counters.updatedOrganizations += 1;
        counters.profileUpdates += 1;
        await emitWriteResult(
          onWrite,
          'organization_profile_updated',
          { listingId: null, match, offer, reason: null, status: 'updated' },
          true
        );
      }
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
    const updatedOrganization = database.organizations.find(
      (organization: FilemakerOrganization): boolean => organization.id === match.organizationId
    );
    if (updatedOrganization !== undefined) {
      await upsertMongoOrganizationForJobBoardImport(updatedOrganization);
    }
    const sourceProvider = resolveJobBoardProvider(offer.sourceUrl, options.provider);
    const hasReliableDirectSourceUrl =
      sourceProvider !== null && isDirectOfferUrlForScrape(offer.sourceUrl, sourceProvider);
    if (
      existingSourceListing !== undefined &&
      !existingSourceOrganizationMatches &&
      hasReliableDirectSourceUrl
    ) {
      const relocatedListing = toJobListing({
        existing: existingSourceListing,
        offer,
        options,
        organizationId: match.organizationId,
      });
      database.jobListings.splice(existingSourceIndex, 1, relocatedListing);
      changed = true;
      const result: FilemakerJobBoardScrapeOfferResult = {
        listingId: relocatedListing.id,
        match,
        offer,
        reason: 'Moved existing listing from mismatched organisation to scraped employer.',
        status: 'updated',
      };
      results.push(result);
      warnings.push(
        `Moved ${offer.title} from a mismatched organisation to ${match.organizationName}.`
      );
      await emitWriteResult(onWrite, 'listing_updated', result, false);
      const addressApply = applyOfferAddressToDatabaseJobListing(
        database,
        relocatedListing.id,
        offer
      );
      if (addressApply.changed) {
        changed = true;
        counters.addressUpdates += 1;
        await emitWriteResult(onWrite, 'listing_address_updated', result, false);
      }
      const lexicon = applyOfferLexiconToListing(database, relocatedListing.id, offer);
      if (lexicon.changed) {
        counters.createdLexiconTerms += lexicon.createdTerms;
        counters.linkedLexiconTerms += lexicon.linkedTerms;
        await emitWriteResult(onWrite, 'listing_lexicon_linked', result, false);
      }
      continue;
    }
    const matchedExistingIndex = findExistingListingIndex(
      database.jobListings,
      match.organizationId,
      offer
    );
    const existingIndex =
      options.duplicateStrategy === 'update' && existingSourceIndexForCompany >= 0
        ? existingSourceIndexForCompany
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

  return { changed, counters, results, warnings: uniqueStrings(warnings) };
};

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
  if (urls.length === 0) {
    const deterministicCollected = await collectJobBoardOfferUrlsDeterministically(collectOptions);
    const deterministicUrls = uniqueStrings(
      deterministicCollected.links.map((link) => link.url)
    );
    if (deterministicUrls.length > 0) {
      return {
        provider,
        runId: collected.runId ?? deterministicCollected.runId,
        sourceSite: deterministicCollected.sourceSite,
        urls: deterministicUrls.slice(0, options.maxOffers),
        warnings: [
          ...collected.warnings,
          'Browser link collection returned no offer links; deterministic fallback was used.',
          ...deterministicCollected.warnings,
        ],
      };
    }
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
    if (progress.waitWhilePaused) {
      await progress.waitWhilePaused();
      throwIfScrapeAborted(signal);
    }
    if (options.duplicateStrategy === 'skip') {
      const existingSourceIndex = findExistingListingIndexesBySourceIdentity(database.jobListings, {
        sourceSite: collected.sourceSite,
        sourceUrl: url,
      })[0];
      const existingSourceListing =
        existingSourceIndex === undefined
          ? undefined
          : database.jobListings[existingSourceIndex];
      if (existingSourceListing !== undefined) {
        const result = buildExistingListingSkippedResult(
          database,
          existingSourceListing,
          collected.sourceSite,
          url
        );
        skippedResults.push(result);
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
    let probe: Awaited<ReturnType<typeof probeJobBoardOffer>> | null = null;
    try {
      probe = await probeJobBoardOfferWithRetry({
        attempts: 3,
        onWarning: progress.onWarning,
        probeArgs: {
          extractionPath: options.extractionPath,
          forcePlaywright: options.extractionPath !== 'deterministic',
          headless: options.headless,
          humanizeMouse: options.humanizeMouse,
          personaId: options.personaId,
          provider: collected.provider,
          sourceUrl: url,
          timeoutMs: options.timeoutMs,
        },
        signal,
        url,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      const message = error instanceof Error ? error.message : String(error);
      const warning = `Offer probe failed permanently for ${url}: ${message}.`;
      warnings.push(warning);
      await progress.onWarning?.(warning);
    }
    if (probe !== null) {
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
  for (const warning of imported.warnings) {
    await emitLiveEvent(onEvent, { type: 'warning', warning });
  }
  let verificationDatabase: FilemakerDatabase = database;
  if (imported.changed) {
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Persisting imported job listings.', type: 'status' });
    const persisted = await upsertFilemakerCampaignSettingValue(
      FILEMAKER_DATABASE_KEY,
      JSON.stringify(toPersistedFilemakerDatabase(database))
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
  const warnings = uniqueStrings([...imported.warnings, ...importVerification.warnings]);
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
      waitWhilePaused: runOptions.waitWhilePaused,
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
  let importWarnings: string[] = [];
  if (options.mode === 'import') {
    throwIfScrapeAborted(signal);
    await emitLiveEvent(onEvent, { message: 'Importing scraped offers.', type: 'status' });
    const imported = await applyImport({
      database,
      offers: scraped.offers,
      onWrite: (write) => emitLiveEvent(onEvent, { type: 'write', write }),
      options,
    });
    for (const warning of imported.warnings) {
      await emitLiveEvent(onEvent, { type: 'warning', warning });
    }
    importWarnings = imported.warnings;
    importCounters = imported.counters;
    results = [...scraped.skippedResults, ...imported.results];
    let verificationDatabase: FilemakerDatabase = database;
    if (imported.changed) {
      throwIfScrapeAborted(signal);
      await emitLiveEvent(onEvent, { message: 'Persisting imported job listings.', type: 'status' });
      const persisted = await upsertFilemakerCampaignSettingValue(
        FILEMAKER_DATABASE_KEY,
        JSON.stringify(toPersistedFilemakerDatabase(database))
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

  const warnings = uniqueStrings([
    ...scraped.warnings,
    ...importWarnings,
    ...importVerification.warnings,
  ]);

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
