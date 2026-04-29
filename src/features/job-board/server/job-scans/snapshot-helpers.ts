import 'server-only';

import type { JobScanEvaluation, JobScanStep } from '@/shared/contracts/job-board';

import type { JobBoardStructuredSnapshot } from '../providers/job-board-sync';

type SnapshotFallbackContext = {
  addressLine: string | null;
  applyUrl: string | null;
  city: string | null;
  companyName: string | null;
  companyProfile: NonNullable<JobBoardStructuredSnapshot['companyProfile']> | null;
  country: string | null;
  expiresAt: string | null;
  facts: Array<{ label: string; value: string }>;
  listingTitle: string | null;
  postalCode: string | null;
  postedAt: string | null;
  profileText: string | null;
  region: string | null;
  snapshot: JobBoardStructuredSnapshot;
  website: string | null;
};

export const normalizeProbeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

export const firstNonEmpty = (values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = normalizeProbeText(value);
    if (normalized.length > 0) return normalized;
  }
  return null;
};

export const clipProbeText = (value: unknown, max = 8_000): string | null => {
  const normalized = normalizeProbeText(value);
  if (normalized.length === 0) return null;
  return normalized.length > max ? `${normalized.slice(0, Math.max(0, max - 3))}...` : normalized;
};

const GENERIC_JOB_BOARD_COMPANY_NAME_KEYS = new Set([
  'company',
  'company profile',
  'employer',
  'employer profile',
  'employers',
  'firma',
  'hiring organization',
  'informacje i opinie o pracodawcach',
  'jobs',
  'nazwa firmy',
  'odkrywaj najlepsze miejsca pracy',
  'oferty pracy',
  'organization',
  'organisation',
  'praca',
  'pracodawca',
  'pracodawcy',
  'profil pracodawcow',
  'profile pracodawcow',
  'profile pracodawcy',
  'profil pracodawcy',
]);

const normalizeCompanyNameGuardKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isShortWeakCompanyName = (value: string): boolean => {
  const normalized = normalizeProbeText(value);
  const compactAlphaNumeric = normalized.replace(/[^\p{L}0-9]+/gu, '');
  return (
    /^[\p{L}]{1,2}$/u.test(compactAlphaNumeric) &&
    normalized !== normalized.toLocaleUpperCase()
  );
};

export const cleanCompanyProfileTitle = (value: unknown): string | null => {
  const normalized = normalizeProbeText(value)
    .replace(/\s*[-|]\s*(profil pracodawcy|pracodawca|kariera|career|jobs).*$/i, '')
    .trim();
  const key = normalizeCompanyNameGuardKey(normalized);
  if (
    isShortWeakCompanyName(normalized) ||
    GENERIC_JOB_BOARD_COMPANY_NAME_KEYS.has(key) ||
    key.startsWith('informacje i opinie o pracodawcach') ||
    key.startsWith('odkrywaj najlepsze miejsca pracy') ||
    key.startsWith('pracodawca ') ||
    key.startsWith('pracodawcy ') ||
    key.startsWith('profile pracodawcow')
  ) {
    return null;
  }
  return normalized.length > 0 ? normalized : null;
};

const cleanSnapshotCompanyName = (value: unknown): string | null => {
  const normalized = normalizeProbeText(value);
  if (normalized.length === 0) return null;
  const key = normalizeCompanyNameGuardKey(normalized);
  if (
    isShortWeakCompanyName(normalized) ||
    GENERIC_JOB_BOARD_COMPANY_NAME_KEYS.has(key) ||
    key.startsWith('informacje i opinie o pracodawcach') ||
    key.startsWith('odkrywaj najlepsze miejsca pracy') ||
    key.startsWith('pracodawca ') ||
    key.startsWith('pracodawcy ') ||
    key.startsWith('profile pracodawcow')
  ) {
    return null;
  }
  return normalized;
};

export const cleanListingTitle = (value: unknown): string | null => {
  const normalized = normalizeProbeText(value)
    .replace(/\s*[-|]\s*(oferta pracy|job offer|praca).*$/i, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
};

export const snapshotFactValue = (
  facts: Array<{ label: string; value: string }> | undefined,
  patterns: RegExp[]
): string | null => {
  for (const fact of facts ?? []) {
    const label = normalizeProbeText(fact.label);
    if (patterns.some((pattern) => pattern.test(label))) {
      const value = normalizeProbeText(fact.value);
      if (value.length > 0) return value;
    }
  }
  return null;
};

export const firstSnapshotSectionText = (
  sections: Array<{ heading?: string | null; text: string }> | undefined
): string | null => {
  const selected =
    sections?.find((section) => /opis|description|requirements|wymagania|obowiazki|responsibil/i.test(
      `${section.heading ?? ''} ${section.text}`
    )) ?? sections?.[0];
  return clipProbeText(selected?.text, 8_000);
};

export const hostnameFromUrl = (value: string | null): string | null => {
  if (value === null) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const combinedFacts = (
  snapshot: JobBoardStructuredSnapshot
): Array<{ label: string; value: string }> => [
  ...(snapshot.facts ?? []),
  ...(snapshot.companyProfile?.facts ?? []),
];

const snapshotCompanyName = (
  facts: Array<{ label: string; value: string }>,
  companyProfile: SnapshotFallbackContext['companyProfile']
): string | null => {
  const profileTitle = cleanCompanyProfileTitle(companyProfile?.title);
  return firstNonEmpty([
    cleanSnapshotCompanyName(
      snapshotFactValue(facts, [/^pracodawca$/i, /^firma$/i, /^company$/i, /^employer$/i, /^nazwa$/i])
    ),
    cleanSnapshotCompanyName(profileTitle),
  ]);
};

const snapshotListingTitle = (snapshot: JobBoardStructuredSnapshot): string | null =>
  firstNonEmpty([
    cleanListingTitle(snapshot.headings?.[0]),
    cleanListingTitle(snapshot.ogTitle),
    cleanListingTitle(snapshot.title),
  ]);

const snapshotCity = (snapshot: JobBoardStructuredSnapshot): string | null =>
  snapshotFactValue(snapshot.facts, [/lokalizacja/i, /miejsce pracy/i, /city/i, /location/i]);

const snapshotAddressFields = (
  facts: Array<{ label: string; value: string }>
): Pick<SnapshotFallbackContext, 'addressLine' | 'country' | 'postalCode' | 'region'> => ({
  addressLine: snapshotFactValue(facts, [
    /^address$/i,
    /company address/i,
    /street address/i,
    /adres/i,
    /siedziba/i,
    /headquarters/i,
  ]),
  country: snapshotFactValue(facts, [/country/i, /kraj/i]),
  postalCode: snapshotFactValue(facts, [/postal/i, /kod pocztowy/i]),
  region: snapshotFactValue(facts, [/region/i, /wojew/i, /province/i]),
});

const snapshotDateFields = (
  facts: Array<{ label: string; value: string }>
): Pick<SnapshotFallbackContext, 'expiresAt' | 'postedAt'> => ({
  expiresAt: snapshotFactValue(facts, [
    /expires/i,
    /valid through/i,
    /valid until/i,
    /deadline/i,
    /wazna/i,
    /ważna/i,
    /termin/i,
  ]),
  postedAt: snapshotFactValue(facts, [
    /posted/i,
    /date posted/i,
    /publication/i,
    /opublikow/i,
    /data publikacji/i,
  ]),
});

const buildSnapshotFallbackContext = (
  snapshot: JobBoardStructuredSnapshot
): SnapshotFallbackContext => {
  const companyProfile = snapshot.companyProfile ?? null;
  const facts = combinedFacts(snapshot);
  const address = snapshotAddressFields(facts);
  const dates = snapshotDateFields(facts);
  return {
    ...address,
    ...dates,
    applyUrl: firstNonEmpty(snapshot.applyUrls ?? []),
    city: snapshotCity(snapshot),
    companyName: snapshotCompanyName(facts, companyProfile),
    companyProfile,
    facts,
    listingTitle: snapshotListingTitle(snapshot),
    profileText: clipProbeText(
      firstSnapshotSectionText(companyProfile?.sections) ?? companyProfile?.plainText,
      8_000
    ),
    snapshot,
    website: firstNonEmpty(companyProfile?.websiteUrls ?? []),
  };
};

const hasSnapshotFallbackData = (context: SnapshotFallbackContext): boolean =>
  context.listingTitle !== null || context.companyName !== null || context.profileText !== null;

const buildFallbackCompany = (context: SnapshotFallbackContext): Record<string, unknown> => ({
  addressLine: context.addressLine,
  city: context.city,
  country: context.country,
  description: context.profileText,
  domain: hostnameFromUrl(context.website),
  industry: snapshotFactValue(context.facts, [/industry/i, /branża/i, /branza/i]),
  name: context.companyName,
  postalCode: context.postalCode,
  profileUrl: context.companyProfile?.url ?? firstNonEmpty(context.snapshot.companyLinks ?? []),
  size: snapshotFactValue(context.facts, [/company size/i, /size/i, /employees/i, /pracownik/i]),
  website: context.website,
});

const buildFallbackListing = (context: SnapshotFallbackContext): Record<string, unknown> => ({
  applyUrl: context.applyUrl,
  benefits: [],
  city: context.city,
  country: 'Poland',
  description:
    firstSnapshotSectionText(context.snapshot.sections) ?? clipProbeText(context.snapshot.plainText),
  expiresAt: context.expiresAt,
  postedAt: context.postedAt,
  region: context.region,
  requirements: [],
  responsibilities: [],
  salary: null,
  technologies: [],
  title: context.listingTitle,
});

export const buildSnapshotFallbackEvaluation = (
  snapshot: JobBoardStructuredSnapshot | null,
  finalUrl: string,
  evaluatedAt: string
): JobScanEvaluation => {
  if (snapshot === null) return null;
  const context = buildSnapshotFallbackContext(snapshot);
  if (!hasSnapshotFallbackData(context)) return null;
  return {
    company: buildFallbackCompany(context),
    listing: buildFallbackListing(context),
    confidence: 0.62,
    modelId: 'job-board-snapshot-fallback',
    error: null,
    evaluatedAt,
  };
};

const hasUsefulValue = (value: unknown): boolean =>
  typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;

const mergeEvaluationRecord = (
  fallback: Record<string, unknown> | null,
  primary: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (fallback === null && primary === null) return null;
  const merged: Record<string, unknown> = { ...(fallback ?? {}) };
  Object.entries(primary ?? {}).forEach(([key, value]) => {
    if (hasUsefulValue(value)) merged[key] = value;
  });
  return merged;
};

const hasListingTitle = (listing: Record<string, unknown> | null): boolean => {
  const title = listing?.['title'];
  return typeof title === 'string' && title.trim().length > 0;
};

const mergedError = (
  primary: NonNullable<JobScanEvaluation>,
  fallback: NonNullable<JobScanEvaluation>,
  listing: Record<string, unknown> | null
): string | null => {
  if (hasListingTitle(listing)) return null;
  return primary.error ?? fallback.error;
};

export const mergeJobScanEvaluations = (
  primary: JobScanEvaluation,
  fallback: JobScanEvaluation
): JobScanEvaluation => {
  if (fallback === null) return primary;
  if (primary === null) return fallback;
  const listing = mergeEvaluationRecord(fallback.listing, primary.listing);
  const company = mergeEvaluationRecord(fallback.company, primary.company);
  return {
    company,
    listing,
    confidence: primary.confidence ?? fallback.confidence,
    modelId: primary.modelId ?? fallback.modelId,
    error: mergedError(primary, fallback, listing),
    evaluatedAt: primary.evaluatedAt ?? fallback.evaluatedAt,
  };
};

export const buildStep = (
  key: string,
  label: string,
  status: JobScanStep['status'],
  partial: Partial<JobScanStep> = {}
): JobScanStep => ({
  key,
  label,
  status,
  message: partial.message ?? null,
  startedAt: partial.startedAt ?? null,
  completedAt: partial.completedAt ?? null,
  durationMs: partial.durationMs ?? null,
});
