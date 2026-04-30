import type { ProductScanStep } from '@/shared/contracts/product-scans';
import {
  formatResultCode,
  normalizeText,
  resolveInputSourceLabel,
  resolveStepDetailValue,
} from './ProductScanAmazonDetails.format';
import type {
  AmazonExtractionProvenance,
  AmazonRejectedCandidateBreakdown,
  AmazonRejectedCandidateHistoryEntry,
} from './ProductScanAmazonDetails.types';

export const resolveLatestAmazonEvaluationStep = (
  steps: readonly ProductScanStep[] | null | undefined
): ProductScanStep | null =>
  [...(steps ?? [])].reverse().find((step) => step.key === 'amazon_ai_evaluate') ?? null;

export const resolveAmazonExtractionProvenance = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonExtractionProvenance | null => {
  const reversedSteps = [...(steps ?? [])].reverse();
  if (reversedSteps.length === 0) return null;

  const amazonExtractStep = resolveAmazonExtractStep(reversedSteps);
  const googleUploadStep = resolveGoogleUploadStep(reversedSteps, amazonExtractStep);
  const provenance = buildAmazonExtractionProvenance(
    amazonExtractStep,
    googleUploadStep,
    reversedSteps
  );

  return hasAmazonExtractionProvenance(provenance) ? provenance : null;
};

const buildAmazonExtractionProvenance = (
  amazonExtractStep: ProductScanStep | undefined,
  googleUploadStep: ProductScanStep | undefined,
  reversedSteps: readonly ProductScanStep[]
): AmazonExtractionProvenance => ({
  candidateId: resolveCandidateId(amazonExtractStep, googleUploadStep),
  candidateRank: resolveCandidateRank(amazonExtractStep),
  extractionResultLabel: resolveExtractionResultLabel(amazonExtractStep, googleUploadStep),
  inputSourceLabel: resolveInputSourceLabel(googleUploadStep?.inputSource),
  retryOf: normalizeText(googleUploadStep?.retryOf),
  reusedProbe: reversedSteps.some(isReusedAmazonProbeStep),
});

const resolveExtractionResultLabel = (
  amazonExtractStep: ProductScanStep | undefined,
  googleUploadStep: ProductScanStep | undefined
): string | null =>
  formatResultCode(amazonExtractStep?.resultCode) ??
  formatResultCode(googleUploadStep?.resultCode);

const resolveAmazonExtractStep = (
  reversedSteps: readonly ProductScanStep[]
): ProductScanStep | undefined =>
  reversedSteps.find((step) => step.key === 'amazon_extract' && step.status === 'completed') ??
  reversedSteps.find((step) => step.key === 'amazon_extract');

const resolveGoogleUploadStep = (
  reversedSteps: readonly ProductScanStep[],
  amazonExtractStep: ProductScanStep | undefined
): ProductScanStep | undefined =>
  reversedSteps.find((step) => isMatchingGoogleUploadStep(step, amazonExtractStep)) ??
  reversedSteps.find((step) => step.key === 'google_upload' && step.status === 'completed') ??
  reversedSteps.find((step) => step.key === 'google_upload');

const isMatchingGoogleUploadStep = (
  step: ProductScanStep,
  amazonExtractStep: ProductScanStep | undefined
): boolean =>
  step.key === 'google_upload' &&
  step.status === 'completed' &&
  (normalizeText(amazonExtractStep?.candidateId) === null ||
    step.candidateId === amazonExtractStep?.candidateId);

const isReusedAmazonProbeStep = (step: ProductScanStep): boolean =>
  step.key === 'amazon_probe' && step.resultCode === 'probe_reused';

const resolveCandidateId = (
  amazonExtractStep: ProductScanStep | undefined,
  googleUploadStep: ProductScanStep | undefined
): string | null =>
  normalizeText(amazonExtractStep?.candidateId) ?? normalizeText(googleUploadStep?.candidateId);

const resolveCandidateRank = (step: ProductScanStep | undefined): number | null =>
  typeof step?.candidateRank === 'number' && Number.isFinite(step.candidateRank)
    ? step.candidateRank
    : null;

const hasAmazonExtractionProvenance = (provenance: AmazonExtractionProvenance): boolean =>
  provenance.candidateId !== null ||
  provenance.candidateRank !== null ||
  provenance.extractionResultLabel !== null ||
  provenance.inputSourceLabel !== null ||
  provenance.retryOf !== null ||
  provenance.reusedProbe;

export const resolveRejectedAmazonCandidateHistory = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonRejectedCandidateHistoryEntry[] =>
  (steps ?? [])
    .filter(isRejectedAmazonEvaluationStep)
    .map(resolveRejectedAmazonCandidateHistoryEntry)
    .sort((left, right) => left.attempt - right.attempt);

const isRejectedAmazonEvaluationStep = (step: ProductScanStep): boolean =>
  step.key === 'amazon_ai_evaluate' &&
  (step.resultCode === 'candidate_rejected' ||
    step.resultCode === 'candidate_language_rejected');

const resolveRejectedAmazonCandidateHistoryEntry = (
  step: ProductScanStep
): AmazonRejectedCandidateHistoryEntry => ({
  attempt: resolveStepAttempt(step),
  candidateId: normalizeText(step.candidateId),
  candidateRank: resolveCandidateRank(step),
  confidenceLabel: resolveStepDetailValue(step, 'Confidence'),
  message: normalizeText(step.message),
  mismatch: resolveStepDetailValue(step, 'Mismatch'),
  modelId: resolveStepDetailValue(step, 'Model'),
  reason:
    resolveStepDetailValue(step, 'Reason') ??
    resolveStepDetailValue(step, 'Language reason'),
  rejectionKind: step.resultCode === 'candidate_language_rejected' ? 'language' : 'product',
  url: normalizeText(step.url) ?? resolveStepDetailValue(step, 'Candidate URL'),
});

const resolveStepAttempt = (step: ProductScanStep): number =>
  typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1;

export const resolveRejectedAmazonCandidateBreakdown = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonRejectedCandidateBreakdown => {
  const history = resolveRejectedAmazonCandidateHistory(steps);
  const languageRejectedCount = history.filter((entry) => entry.rejectionKind === 'language').length;

  return {
    languageRejectedCount,
    productRejectedCount: history.length - languageRejectedCount,
    totalCount: history.length,
  };
};

export const resolveRejectedAmazonCandidateCount = (
  steps: readonly ProductScanStep[] | null | undefined
): number => resolveRejectedAmazonCandidateBreakdown(steps).totalCount;
