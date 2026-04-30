import 'server-only';

import type { ProductScanStep } from '@/shared/contracts/product-scans';
import {
  resolveProductScanStepGroup as resolveSharedProductScanStepGroup,
} from '@/features/playwright/scan-steps';

import {
  readOptionalPositiveInt,
  readOptionalString,
} from './product-scans-service.helpers.base';

export const normalizePersistedProductScanStepDetails = (
  details: ProductScanStep['details'] | null | undefined
): ProductScanStep['details'] => (Array.isArray(details) ? details.slice(0, 20) : []);

const normalizeProductScanStepIdentityText = (value: unknown): string | null =>
  readOptionalString(value);

const normalizeProductScanStepIdentityInt = (value: unknown): number | null =>
  readOptionalPositiveInt(value);

export const hasSameProductScanStepPersistenceIdentity = (
  existing: Pick<ProductScanStep, 'key' | 'candidateId' | 'candidateRank' | 'attempt' | 'retryOf'>,
  next: Pick<ProductScanStep, 'key' | 'candidateId' | 'candidateRank' | 'attempt' | 'retryOf'>
): boolean =>
  existing.key === next.key &&
  normalizeProductScanStepIdentityText(existing.candidateId) ===
    normalizeProductScanStepIdentityText(next.candidateId) &&
  normalizeProductScanStepIdentityInt(existing.candidateRank) ===
    normalizeProductScanStepIdentityInt(next.candidateRank) &&
  normalizeProductScanStepIdentityInt(existing.attempt) ===
    normalizeProductScanStepIdentityInt(next.attempt) &&
  normalizeProductScanStepIdentityText(existing.retryOf) ===
    normalizeProductScanStepIdentityText(next.retryOf);

const firstPresent = <TValue>(
  value: TValue | null | undefined,
  fallback: TValue | null | undefined,
  defaultValue: TValue
): TValue => value ?? fallback ?? defaultValue;

const firstNullable = <TValue>(
  value: TValue | null | undefined,
  fallback: TValue | null | undefined
): TValue | null => value ?? fallback ?? null;

const existingStepValue = <TKey extends keyof ProductScanStep>(
  existingStep: ProductScanStep | undefined,
  key: TKey
): ProductScanStep[TKey] | undefined =>
  existingStep === undefined ? undefined : existingStep[key];

const resolveUpsertedProductScanStep = (
  nextStep: Partial<ProductScanStep> & { key: string; label: string },
  existingStep: ProductScanStep | undefined
): ProductScanStep => ({
  ...nextStep,
  key: nextStep.key,
  label: nextStep.label,
  group: firstPresent(
    nextStep.group,
    existingStepValue(existingStep, 'group'),
    resolveSharedProductScanStepGroup(nextStep.key)
  ),
  status: firstPresent(nextStep.status, existingStepValue(existingStep, 'status'), 'pending'),
  resultCode: firstNullable(nextStep.resultCode, existingStepValue(existingStep, 'resultCode')),
  message: firstNullable(nextStep.message, existingStepValue(existingStep, 'message')),
  details: normalizePersistedProductScanStepDetails(
    firstNullable(nextStep.details, existingStepValue(existingStep, 'details'))
  ),
  candidateId: firstNullable(nextStep.candidateId, existingStepValue(existingStep, 'candidateId')),
  candidateRank: firstNullable(
    nextStep.candidateRank,
    existingStepValue(existingStep, 'candidateRank')
  ),
  url: firstNullable(nextStep.url, existingStepValue(existingStep, 'url')),
  attempt: firstNullable(nextStep.attempt, existingStepValue(existingStep, 'attempt')),
  retryOf: firstNullable(nextStep.retryOf, existingStepValue(existingStep, 'retryOf')),
  inputSource: firstPresent(
    nextStep.inputSource,
    existingStepValue(existingStep, 'inputSource'),
    'url'
  ),
  warning: firstNullable(nextStep.warning, existingStepValue(existingStep, 'warning')),
  startedAt: firstPresent(
    nextStep.startedAt,
    existingStepValue(existingStep, 'startedAt'),
    new Date().toISOString()
  ),
  completedAt: firstNullable(nextStep.completedAt, existingStepValue(existingStep, 'completedAt')),
  durationMs: firstNullable(nextStep.durationMs, existingStepValue(existingStep, 'durationMs')),
});

export const upsertPersistedProductScanStep = (
  steps: ProductScanStep[],
  nextStep: Partial<ProductScanStep> & { key: string; label: string }
): ProductScanStep[] => {
  const results = [...steps];
  const existingIndex = results.findIndex((step) =>
    hasSameProductScanStepPersistenceIdentity(step, {
      key: nextStep.key,
      candidateId: nextStep.candidateId ?? null,
      candidateRank: nextStep.candidateRank ?? null,
      attempt: nextStep.attempt ?? null,
      retryOf: nextStep.retryOf ?? null,
    })
  );
  const existingStep = existingIndex >= 0 ? results[existingIndex] : undefined;
  const mergedStep = resolveUpsertedProductScanStep(nextStep, existingStep);

  if (existingIndex >= 0) {
    results[existingIndex] = mergedStep;
  } else {
    results.push(mergedStep);
  }

  return results;
};
