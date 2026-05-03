import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  hasNonEmptyString,
  isCandidateSelectionRequiredSignal,
  isCaptchaSignal,
  isEvaluatorRejectSignal,
  isLensEmptySignal,
  isSelectorRotSignal,
  resolveCaptchaReason,
  summariseCaptchaRecovery,
  summariseCaptchaSteps,
  summariseEvaluation,
  toRecord,
} from './product-scan-amazon-classifier.helpers';

export type AmazonScanFailureKind =
  | 'captcha'
  | 'lens_empty'
  | 'selector_rot'
  | 'evaluator_reject'
  | 'healthy'
  | 'other';

export type AmazonScanFailureDetails = {
  reason: string;
  evidence: Record<string, unknown>;
  recovery?: {
    automaticRetryAttempted: boolean;
    automaticRetrySkipped: boolean;
    manualFallbackOpened: boolean;
    recoveryPath:
      | 'automatic_retry'
      | 'automatic_retry_skipped'
      | 'manual_fallback'
      | 'automatic_retry_then_manual_fallback'
      | 'automatic_retry_skipped_then_manual_fallback'
      | null;
    latestCaptchaStage: string | null;
  };
};

export type AmazonScanFailureClassification = {
  kind: AmazonScanFailureKind;
  details: AmazonScanFailureDetails;
};

const buildAmazonScanFailureEvidence = (
  scan: ProductScanRecord
): Record<string, unknown> => {
  const raw = toRecord(scan.rawResult);
  return {
    status: scan.status,
    asinUpdateStatus: scan.asinUpdateStatus,
    hasAsin: hasNonEmptyString(scan.asin),
    hasTitle: hasNonEmptyString(scan.title),
    candidateSelectionRequired: raw?.['candidateSelectionRequired'] ?? null,
    imageCandidateCount: scan.imageCandidates.length,
    stepCount: scan.steps.length,
    evaluation: summariseEvaluation(scan.amazonEvaluation),
  };
};

const classifyCaptchaScan = (
  scan: ProductScanRecord,
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => {
  const raw = toRecord(scan.rawResult);
  const recovery = summariseCaptchaRecovery(scan);
  return {
    kind: 'captcha',
    details: {
      reason: resolveCaptchaReason(recovery),
      evidence: {
        ...evidence,
        manualVerificationPending: raw?.['manualVerificationPending'] ?? null,
        captchaRetryStarted: raw?.['captchaRetryStarted'] ?? null,
        captchaStealthRetryStarted: raw?.['captchaStealthRetryStarted'] ?? null,
        captchaStealthRetrySkipped: recovery.automaticRetrySkipped,
        captchaSteps: summariseCaptchaSteps(scan),
        error: scan.error,
      },
      recovery,
    },
  };
};

const resolveEvaluatorRejectReason = (scan: ProductScanRecord): string => {
  const rejectionCategory = scan.amazonEvaluation?.rejectionCategory ?? null;
  if (rejectionCategory !== null && rejectionCategory.length > 0) {
    return `AI evaluator rejected candidate (${rejectionCategory}).`;
  }
  return 'AI evaluator rejected candidate.';
};

const classifyEvaluatorRejectScan = (
  scan: ProductScanRecord,
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'evaluator_reject',
  details: {
    reason: resolveEvaluatorRejectReason(scan),
    evidence,
  },
});

const classifyHealthyCandidateSelectionScan = (
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'healthy',
  details: {
    reason: 'Amazon candidates were collected and are waiting for manual selection.',
    evidence,
  },
});

const classifySelectorRotScan = (
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'selector_rot',
  details: {
    reason:
      'Candidates were found but ASIN/title could not be extracted — selector drift is the leading suspect.',
    evidence,
  },
});

const classifyLensEmptyScan = (
  scan: ProductScanRecord,
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'lens_empty',
  details: {
    reason:
      'Image-search pipeline returned no usable candidates (Google Lens or fallback provider).',
    evidence: {
      ...evidence,
      error: scan.error,
      providerHistory: toRecord(scan.rawResult)?.['imageSearchProviderHistory'] ?? null,
    },
  },
});

const classifyCompletedWithAsinScan = (
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'healthy',
  details: { reason: 'Scan completed with an ASIN.', evidence },
});

const classifyOtherScan = (
  scan: ProductScanRecord,
  evidence: Record<string, unknown>
): AmazonScanFailureClassification => ({
  kind: 'other',
  details: {
    reason: `Unclassified scan state (status=${scan.status}).`,
    evidence: { ...evidence, error: scan.error },
  },
});

/**
 * Classifies the most salient failure mode of a finished (or stuck-active) scan.
 * Precedence: captcha > evaluator_reject > selector_rot > lens_empty > other.
 * A scan that looks successful returns `healthy`.
 */
export function classifyAmazonScanFailure(
  scan: ProductScanRecord
): AmazonScanFailureClassification {
  const evidence = buildAmazonScanFailureEvidence(scan);
  if (isCaptchaSignal(scan)) return classifyCaptchaScan(scan, evidence);
  if (isEvaluatorRejectSignal(scan)) return classifyEvaluatorRejectScan(scan, evidence);
  if (isCandidateSelectionRequiredSignal(scan)) return classifyHealthyCandidateSelectionScan(evidence);
  if (isSelectorRotSignal(scan)) return classifySelectorRotScan(evidence);
  if (isLensEmptySignal(scan)) return classifyLensEmptyScan(scan, evidence);
  if (scan.status === 'completed' && hasNonEmptyString(scan.asin)) {
    return classifyCompletedWithAsinScan(evidence);
  }
  return classifyOtherScan(scan, evidence);
}
