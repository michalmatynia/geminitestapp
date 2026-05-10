import 'server-only';

import type { JobScanEvaluation, JobScanStep } from '@/shared/contracts/job-board';

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
