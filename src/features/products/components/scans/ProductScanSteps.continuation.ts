import type { ProductScanStep } from '@/shared/contracts/product-scans';

import type {
  ProductScanContinuationContext,
  ProductScanContinuationSummary,
  ProductScanRejectedCandidateSummary,
} from './ProductScanSteps.types';
import {
  formatResultCode,
  getStepGroupLabel,
  resolveNonEmptyString,
  resolveStepAttempt,
  resolveStepDetailValue,
  resolveStepGroup,
  resolveStepUrl,
} from './ProductScanSteps.utils';

type ContinuationStep = Pick<ProductScanStep, 'key' | 'label'>;

export const resolveAmazonEvaluationRejectionKind = (
  step: Pick<ProductScanStep, 'resultCode' | 'details'>
): 'language' | 'product' | null => {
  if (step.resultCode === 'candidate_language_rejected') return 'language';
  if (step.resultCode === 'candidate_rejected') return 'product';
  const rejectionKind = resolveStepDetailValue(step, 'Rejection kind')?.toLowerCase() ?? null;
  if (rejectionKind === null) return null;
  if (rejectionKind.includes('language')) return 'language';
  return rejectionKind.includes('product') ? 'product' : null;
};

export const resolveSupplierEvaluationRejectionKind = (
  step: Pick<ProductScanStep, 'resultCode'>
): 'product' | null => (step.resultCode === 'candidate_rejected' ? 'product' : null);

export const isAmazonCandidateContinuationStep = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message'>
): boolean => {
  if (step.key !== 'queue_scan') return false;
  if (step.label === 'Continue with next Amazon candidate') return true;
  const message = step.message;
  if (typeof message !== 'string') return false;
  return (
    message.includes('next Amazon candidate after AI rejection') ||
    message.includes('next Amazon candidate after language rejection')
  );
};

const isGoogleStealthRetryContinuationStep = (step: ContinuationStep): boolean =>
  step.key === 'google_stealth_retry' ||
  step.label === 'Retry Google candidate search with fresh proxy session';

const isGoogleStealthRetrySkippedContinuationStep = (step: ContinuationStep): boolean =>
  step.key === 'google_stealth_retry_skipped' || step.label === 'Skip automatic Google retry';

const isGoogleManualRetryContinuationStep = (step: ContinuationStep): boolean =>
  step.key === 'google_manual_retry' ||
  step.label === 'Open Google candidate search in visible browser';

const resolveAmazonCandidateContinuationRejectionKind = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message' | 'resultCode' | 'details'>
): 'language' | 'product' | null => {
  const explicitKind = resolveAmazonEvaluationRejectionKind(step);
  if (explicitKind !== null) return explicitKind;
  const message = step.message;
  if (typeof message === 'string' && message.includes('language rejection')) return 'language';
  return isAmazonCandidateContinuationStep(step) ? 'product' : null;
};

const buildBaseContinuationSummary = (
  step: ProductScanStep
): Pick<
  ProductScanContinuationSummary,
  'phaseLabel' | 'stepLabel' | 'message' | 'resultCodeLabel' | 'attempt'
> => ({
  phaseLabel: getStepGroupLabel(resolveStepGroup(step)),
  stepLabel: step.label,
  message: resolveNonEmptyString(step.message),
  resultCodeLabel: formatResultCode(step.resultCode),
  attempt: resolveStepAttempt(step),
});

const resolveContinuationFallbackUrl = (
  step: ProductScanStep,
  detailLabel: string
): string | null => resolveStepDetailValue(step, detailLabel) ?? resolveStepUrl(step);

const buildStealthRetrySummary = (step: ProductScanStep): ProductScanContinuationSummary => ({
  ...buildBaseContinuationSummary(step),
  badgeLabel: 'Automatic retry',
  contextLabel: 'After captcha block',
  nextUrl: resolveContinuationFallbackUrl(step, 'Blocked URL'),
  nextUrlLabel: 'Blocked at',
  rejectedUrl: null,
  rejectedUrlLabel: null,
  rejectionKind: null,
});

const buildSkippedRetrySummary = (step: ProductScanStep): ProductScanContinuationSummary => ({
  ...buildBaseContinuationSummary(step),
  badgeLabel: 'Automatic retry skipped',
  contextLabel: resolveStepDetailValue(step, 'Skip reason') ?? 'Proxy unavailable',
  nextUrl: resolveContinuationFallbackUrl(step, 'Blocked URL'),
  nextUrlLabel: 'Blocked at',
  rejectedUrl: null,
  rejectedUrlLabel: null,
  rejectionKind: null,
});

const buildManualRetrySummary = (step: ProductScanStep): ProductScanContinuationSummary => ({
  ...buildBaseContinuationSummary(step),
  badgeLabel: 'Manual fallback',
  contextLabel: resolveStepDetailValue(step, 'Recovery path') ?? 'After captcha block',
  nextUrl: resolveContinuationFallbackUrl(step, 'Opened URL'),
  nextUrlLabel: 'Opened at',
  rejectedUrl: null,
  rejectedUrlLabel: null,
  rejectionKind: null,
});

const buildAmazonCandidateSummary = (step: ProductScanStep): ProductScanContinuationSummary => {
  const rejectionKind = resolveAmazonCandidateContinuationRejectionKind(step);
  return {
    ...buildBaseContinuationSummary(step),
    badgeLabel: 'Candidate continuation',
    contextLabel: rejectionKind === 'language' ? 'After language rejection' : 'After AI rejection',
    nextUrl: resolveStepDetailValue(step, 'Next candidate URL'),
    nextUrlLabel: 'Next up',
    rejectedUrl: resolveStepDetailValue(step, 'Rejected candidate URL'),
    rejectedUrlLabel: 'Rejected',
    rejectionKind,
  };
};

const isContinuationStep = (step: ProductScanStep): boolean =>
  isAmazonCandidateContinuationStep(step) ||
  isGoogleStealthRetryContinuationStep(step) ||
  isGoogleStealthRetrySkippedContinuationStep(step) ||
  isGoogleManualRetryContinuationStep(step);

export const resolveProductScanContinuationSummary = (
  steps: ProductScanStep[]
): ProductScanContinuationSummary | null => {
  const continuationStep = [...steps].reverse().find(isContinuationStep) ?? null;
  if (continuationStep === null) return null;
  if (isGoogleStealthRetryContinuationStep(continuationStep)) {
    return buildStealthRetrySummary(continuationStep);
  }
  if (isGoogleStealthRetrySkippedContinuationStep(continuationStep)) {
    return buildSkippedRetrySummary(continuationStep);
  }
  if (isGoogleManualRetryContinuationStep(continuationStep)) {
    return buildManualRetrySummary(continuationStep);
  }
  return buildAmazonCandidateSummary(continuationStep);
};

const isRejectedEvaluationStep = (step: ProductScanStep): boolean =>
  (step.key === 'amazon_ai_evaluate' &&
    (step.resultCode === 'candidate_rejected' ||
      step.resultCode === 'candidate_language_rejected')) ||
  (step.key === 'supplier_ai_evaluate' && step.resultCode === 'candidate_rejected');

const resolveLatestRejectedReason = (step: ProductScanStep): string | null =>
  resolveStepDetailValue(step, 'Reason') ??
  resolveStepDetailValue(step, 'Mismatch') ??
  resolveStepDetailValue(step, 'Language reason') ??
  resolveNonEmptyString(step.message);

export const resolveProductScanRejectedCandidateSummary = (
  steps: ProductScanStep[]
): ProductScanRejectedCandidateSummary | null => {
  const rejectedEvaluationSteps = steps.filter(isRejectedEvaluationStep);
  const latestRejectedStep = [...rejectedEvaluationSteps].reverse()[0] ?? null;
  if (latestRejectedStep === null) return null;
  const languageRejectedCount = rejectedEvaluationSteps.filter(
    (step) => resolveAmazonEvaluationRejectionKind(step) === 'language'
  ).length;
  return {
    rejectedCount: rejectedEvaluationSteps.length,
    languageRejectedCount,
    latestRejectedUrl:
      resolveStepUrl(latestRejectedStep) ??
      resolveStepDetailValue(latestRejectedStep, 'Candidate URL'),
    latestReason: resolveLatestRejectedReason(latestRejectedStep),
    latestRejectionKind:
      resolveAmazonEvaluationRejectionKind(latestRejectedStep) ??
      resolveSupplierEvaluationRejectionKind(latestRejectedStep),
  };
};

export const resolveContinuationContexts = (
  steps: ProductScanStep[]
): Map<number, ProductScanContinuationContext> => {
  const contexts = new Map<number, ProductScanContinuationContext>();
  for (const step of steps) {
    const attempt = resolveStepAttempt(step);
    if (!isAmazonCandidateContinuationStep(step) || attempt === null) continue;
    contexts.set(attempt, {
      step,
      rejectedUrl: resolveStepDetailValue(step, 'Rejected candidate URL'),
      nextUrl: resolveStepDetailValue(step, 'Next candidate URL'),
      rejectionKind: resolveAmazonCandidateContinuationRejectionKind(step),
    });
  }
  return contexts;
};
