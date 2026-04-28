import 'server-only';

import type { JobScanEvaluation, JobScanStep } from '@/shared/contracts/job-board';

import type { JobBoardStructuredSnapshot } from '../providers/job-board-sync';

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

export const cleanCompanyProfileTitle = (value: unknown): string | null => {
  const normalized = normalizeProbeText(value)
    .replace(/\s*[-|]\s*(profil pracodawcy|pracodawca|kariera|career|jobs).*$/i, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
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

export const buildSnapshotFallbackEvaluation = (
  snapshot: JobBoardStructuredSnapshot | null,
  finalUrl: string,
  evaluatedAt: string
): JobScanEvaluation => {
  if (snapshot === null) return null;
  const companyProfile = snapshot.companyProfile ?? null;
  const profileText = clipProbeText(
    firstSnapshotSectionText(companyProfile?.sections) ?? companyProfile?.plainText,
    8_000
  );
  const profileTitle = cleanCompanyProfileTitle(companyProfile?.title);
  const companyName = firstNonEmpty([
    snapshotFactValue(snapshot.facts, [/pracodawca/i, /firma/i, /company/i, /employer/i]),
    snapshotFactValue(companyProfile?.facts, [/nazwa/i, /firma/i, /company/i, /employer/i]),
    profileTitle,
  ]);
  const listingTitle = firstNonEmpty([
    cleanListingTitle(snapshot.headings?.[0]),
    cleanListingTitle(snapshot.ogTitle),
    cleanListingTitle(snapshot.title),
  ]);
  const city = snapshotFactValue(snapshot.facts, [
    /lokalizacja/i,
    /miejsce pracy/i,
    /city/i,
    /location/i,
  ]);
  const applyUrl = firstNonEmpty(snapshot.applyUrls ?? []);
  const website = firstNonEmpty(companyProfile?.websiteUrls ?? []);

  if (listingTitle === null && companyName === null && profileText === null) return null;
  return {
    company: {
      name: companyName,
      description: profileText,
      profileUrl: companyProfile?.url ?? firstNonEmpty(snapshot.companyLinks ?? []),
      website,
      domain: hostnameFromUrl(website),
    },
    listing: {
      title: listingTitle,
      description: firstSnapshotSectionText(snapshot.sections) ?? clipProbeText(snapshot.plainText),
      city,
      country: 'Poland',
      salary: null,
      applyUrl,
      requirements: [],
      responsibilities: [],
      benefits: [],
      technologies: [],
    },
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

export const mergeJobScanEvaluations = (
  primary: JobScanEvaluation,
  fallback: JobScanEvaluation
): JobScanEvaluation => {
  if (fallback === null) return primary;
  if (primary === null) return fallback;
  const listing = mergeEvaluationRecord(fallback.listing, primary.listing);
  const company = mergeEvaluationRecord(fallback.company, primary.company);
  const hasTitle = typeof listing?.['title'] === 'string' && listing['title'].trim().length > 0;
  return {
    company,
    listing,
    confidence: primary.confidence ?? fallback.confidence,
    modelId: primary.modelId ?? fallback.modelId,
    error: hasTitle ? null : primary.error ?? fallback.error,
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
