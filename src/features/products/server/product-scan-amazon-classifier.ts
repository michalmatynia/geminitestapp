import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

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
};

export type AmazonScanFailureClassification = {
  kind: AmazonScanFailureKind;
  details: AmazonScanFailureDetails;
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readLowerMessage = (...candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.toLowerCase();
    }
  }
  return '';
};

const CAPTCHA_MESSAGE_PATTERNS = [
  'captcha',
  'manual verification',
  'manual_verification',
  'solve the challenge',
  'cloudflare challenge',
  'unusual traffic',
  'verify you are human',
];

const CAPTCHA_STEP_KEY_PATTERNS = ['captcha', 'verification_review'];

const CAPTCHA_URL_PATTERNS = [
  'sorry/index',
  '/sorry/',
  'recaptcha',
  'challenge',
];

const LENS_EMPTY_MESSAGE_PATTERNS = [
  'no amazon candidates found',
  'did not contain any amazon product urls',
  'no_candidates',
  'google lens returned no',
  'no candidates',
];

const isCaptchaSignal = (scan: ProductScanRecord): boolean => {
  const raw = toRecord(scan.rawResult);
  if (raw?.['manualVerificationPending'] === true) return true;
  if (raw?.['captchaRetryStarted'] === true) return true;
  if (raw?.['captchaStealthRetryStarted'] === true) return true;
  const hasConcreteCaptchaStep = (scan.steps ?? []).some((step) => {
    const key = step.key?.trim().toLowerCase() ?? '';
    if (!CAPTCHA_STEP_KEY_PATTERNS.some((needle) => key.includes(needle))) {
      return false;
    }
    return (
      step.status !== 'pending' ||
      (step.resultCode?.trim().length ?? 0) > 0 ||
      (step.message?.trim().length ?? 0) > 0 ||
      (step.details?.length ?? 0) > 0
    );
  });
  if (hasConcreteCaptchaStep) return true;
  const joined = readLowerMessage(
    scan.error,
    scan.asinUpdateMessage,
    typeof raw?.['message'] === 'string' ? (raw['message'] as string) : null,
    typeof raw?.['manualVerificationMessage'] === 'string'
      ? (raw['manualVerificationMessage'] as string)
      : null
  );
  if (CAPTCHA_MESSAGE_PATTERNS.some((needle) => joined.includes(needle))) {
    return true;
  }
  const joinedUrl = readLowerMessage(
    typeof raw?.['currentUrl'] === 'string' ? (raw['currentUrl'] as string) : null,
    typeof raw?.['url'] === 'string' ? (raw['url'] as string) : null
  );
  return CAPTCHA_URL_PATTERNS.some((needle) => joinedUrl.includes(needle));
};

const isLensEmptySignal = (scan: ProductScanRecord): boolean => {
  if (scan.status !== 'failed') return false;
  const raw = toRecord(scan.rawResult);
  const steps = scan.steps ?? [];
  const anyNoCandidatesStep = steps.some(
    (step) => step.status === 'failed' && step.resultCode === 'no_candidates'
  );
  if (anyNoCandidatesStep) return true;
  const providerHistory = Array.isArray(raw?.['imageSearchProviderHistory'])
    ? (raw['imageSearchProviderHistory'] as unknown[])
    : [];
  const joined = readLowerMessage(scan.error, scan.asinUpdateMessage);
  const matchesLensMessage = LENS_EMPTY_MESSAGE_PATTERNS.some((needle) => joined.includes(needle));
  if (matchesLensMessage && providerHistory.length > 0) return true;
  return matchesLensMessage;
};

const isEvaluatorRejectSignal = (scan: ProductScanRecord): boolean => {
  const evaluation = scan.amazonEvaluation;
  if (!evaluation) return false;
  if (evaluation.status === 'rejected') return true;
  if (evaluation.proceed === false && evaluation.rejectionCategory !== null) return true;
  return false;
};

const isCandidateSelectionRequiredSignal = (scan: ProductScanRecord): boolean =>
  scan.status === 'completed' &&
  toRecord(scan.rawResult)?.['candidateSelectionRequired'] === true;

const isSelectorRotSignal = (scan: ProductScanRecord): boolean => {
  if (scan.status === 'completed' || scan.status === 'no_match') {
    const hasCandidates = (scan.imageCandidates?.length ?? 0) > 0;
    const missingAsin = !scan.asin || scan.asin.trim().length === 0;
    const missingTitle = !scan.title || scan.title.trim().length === 0;
    if (hasCandidates && missingAsin && missingTitle) return true;
    if (scan.status === 'no_match' && hasCandidates && missingAsin) return true;
  }
  return false;
};

const summariseEvaluation = (
  evaluation: ProductScanRecord['amazonEvaluation']
): Record<string, unknown> | null => {
  if (!evaluation) return null;
  return {
    status: evaluation.status,
    stage: evaluation.stage,
    rejectionCategory: evaluation.rejectionCategory,
    recommendedAction: evaluation.recommendedAction,
    confidence: evaluation.confidence,
    proceed: evaluation.proceed,
    reasons: evaluation.reasons,
  };
};

/**
 * Classifies the most salient failure mode of a finished (or stuck-active) scan.
 * Order of precedence when multiple signals fire:
 *   captcha > evaluator_reject > selector_rot > lens_empty > other
 * A scan that looks successful returns `healthy`.
 *
 * This function is deliberately pure so Phase 0.5 CLI and the
 * admin diagnostics drawer can both use it against persisted records.
 */
export function classifyAmazonScanFailure(
  scan: ProductScanRecord
): AmazonScanFailureClassification {
  const evidence: Record<string, unknown> = {
    status: scan.status,
    asinUpdateStatus: scan.asinUpdateStatus,
    hasAsin: Boolean(scan.asin && scan.asin.trim().length > 0),
    hasTitle: Boolean(scan.title && scan.title.trim().length > 0),
    candidateSelectionRequired: toRecord(scan.rawResult)?.['candidateSelectionRequired'] ?? null,
    imageCandidateCount: scan.imageCandidates?.length ?? 0,
    stepCount: scan.steps?.length ?? 0,
    evaluation: summariseEvaluation(scan.amazonEvaluation),
  };

  if (isCaptchaSignal(scan)) {
    return {
      kind: 'captcha',
      details: {
        reason:
          'Captcha / manual verification detected in rawResult or error message.',
        evidence: {
          ...evidence,
          manualVerificationPending:
            (toRecord(scan.rawResult)?.['manualVerificationPending'] ?? null),
          captchaRetryStarted:
            (toRecord(scan.rawResult)?.['captchaRetryStarted'] ?? null),
          captchaStealthRetryStarted:
            (toRecord(scan.rawResult)?.['captchaStealthRetryStarted'] ?? null),
          captchaSteps: (scan.steps ?? [])
            .filter((step) =>
              CAPTCHA_STEP_KEY_PATTERNS.some((needle) =>
                step.key?.trim().toLowerCase().includes(needle)
              )
            )
            .map((step) => ({
              key: step.key,
              status: step.status,
              resultCode: step.resultCode ?? null,
              message: step.message ?? null,
            })),
          error: scan.error,
        },
      },
    };
  }

  if (isEvaluatorRejectSignal(scan)) {
    return {
      kind: 'evaluator_reject',
      details: {
        reason:
          scan.amazonEvaluation?.rejectionCategory
            ? `AI evaluator rejected candidate (${scan.amazonEvaluation.rejectionCategory}).`
            : 'AI evaluator rejected candidate.',
        evidence,
      },
    };
  }

  if (isCandidateSelectionRequiredSignal(scan)) {
    return {
      kind: 'healthy',
      details: {
        reason: 'Amazon candidates were collected and are waiting for manual selection.',
        evidence,
      },
    };
  }

  if (isSelectorRotSignal(scan)) {
    return {
      kind: 'selector_rot',
      details: {
        reason:
          'Candidates were found but ASIN/title could not be extracted — selector drift is the leading suspect.',
        evidence,
      },
    };
  }

  if (isLensEmptySignal(scan)) {
    return {
      kind: 'lens_empty',
      details: {
        reason:
          'Image-search pipeline returned no usable candidates (Google Lens or fallback provider).',
        evidence: {
          ...evidence,
          error: scan.error,
          providerHistory:
            toRecord(scan.rawResult)?.['imageSearchProviderHistory'] ?? null,
        },
      },
    };
  }

  if (scan.status === 'completed' && scan.asin && scan.asin.trim().length > 0) {
    return {
      kind: 'healthy',
      details: { reason: 'Scan completed with an ASIN.', evidence },
    };
  }

  return {
    kind: 'other',
    details: {
      reason: `Unclassified scan state (status=${scan.status}).`,
      evidence: { ...evidence, error: scan.error ?? null },
    },
  };
}
