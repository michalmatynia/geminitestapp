import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import type { AmazonScanFailureDetails } from './product-scan-amazon-classifier';

type CaptchaRecovery = NonNullable<AmazonScanFailureDetails['recovery']>;

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
const CAPTCHA_URL_PATTERNS = ['sorry/index', '/sorry/', 'recaptcha', 'challenge'];

const LENS_EMPTY_MESSAGE_PATTERNS = [
  'no amazon candidates found',
  'did not contain any amazon product urls',
  'no_candidates',
  'google lens returned no',
  'no candidates',
];

export const toRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const hasNonEmptyString = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const readRawString = (record: Record<string, unknown> | null, key: string): string | null => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const readLowerMessage = (...candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && hasNonEmptyString(candidate)) {
      return candidate.toLowerCase();
    }
  }
  return '';
};

const includesAnyPattern = (value: string, patterns: readonly string[]): boolean =>
  patterns.some((needle) => value.includes(needle));

const readStepDetailValue = (
  details: Array<{ label: string; value: string | null }> | null | undefined,
  label: string
): string | null => {
  if (!Array.isArray(details)) return null;
  const entry = details.find((detail) => detail.label === label);
  return typeof entry?.value === 'string' && hasNonEmptyString(entry.value) ? entry.value : null;
};

const hasRawCaptchaSignal = (raw: Record<string, unknown> | null): boolean =>
  raw?.['manualVerificationPending'] === true ||
  raw?.['captchaRetryStarted'] === true ||
  raw?.['captchaStealthRetryStarted'] === true;

const isConcreteCaptchaStep = (step: ProductScanRecord['steps'][number]): boolean => {
  const key = step.key.trim().toLowerCase();
  if (!includesAnyPattern(key, CAPTCHA_STEP_KEY_PATTERNS)) return false;
  return (
    step.status !== 'pending' ||
    hasNonEmptyString(step.resultCode) ||
    hasNonEmptyString(step.message) ||
    step.details.length > 0
  );
};

const hasCaptchaMessage = (
  scan: ProductScanRecord,
  raw: Record<string, unknown> | null
): boolean => {
  const joined = readLowerMessage(
    scan.error,
    scan.asinUpdateMessage,
    readRawString(raw, 'message'),
    readRawString(raw, 'manualVerificationMessage')
  );
  return includesAnyPattern(joined, CAPTCHA_MESSAGE_PATTERNS);
};

const hasCaptchaUrl = (raw: Record<string, unknown> | null): boolean => {
  const joinedUrl = readLowerMessage(readRawString(raw, 'currentUrl'), readRawString(raw, 'url'));
  return includesAnyPattern(joinedUrl, CAPTCHA_URL_PATTERNS);
};

export const isCaptchaSignal = (scan: ProductScanRecord): boolean => {
  const raw = toRecord(scan.rawResult);
  if (hasRawCaptchaSignal(raw)) return true;
  if (scan.steps.some(isConcreteCaptchaStep)) return true;
  if (hasCaptchaMessage(scan, raw)) return true;
  return hasCaptchaUrl(raw);
};

export const isLensEmptySignal = (scan: ProductScanRecord): boolean => {
  if (scan.status !== 'failed') return false;
  const anyNoCandidatesStep = scan.steps.some(
    (step) => step.status === 'failed' && step.resultCode === 'no_candidates'
  );
  if (anyNoCandidatesStep) return true;
  const joined = readLowerMessage(scan.error, scan.asinUpdateMessage);
  return includesAnyPattern(joined, LENS_EMPTY_MESSAGE_PATTERNS);
};

export const isEvaluatorRejectSignal = (scan: ProductScanRecord): boolean => {
  const evaluation = scan.amazonEvaluation;
  if (evaluation === null) return false;
  if (evaluation.status === 'rejected') return true;
  return evaluation.proceed === false && evaluation.rejectionCategory !== null;
};

export const isCandidateSelectionRequiredSignal = (scan: ProductScanRecord): boolean =>
  scan.status === 'completed' &&
  toRecord(scan.rawResult)?.['candidateSelectionRequired'] === true;

export const isSelectorRotSignal = (scan: ProductScanRecord): boolean => {
  const terminalWithoutMatch = scan.status === 'completed' || scan.status === 'no_match';
  if (!terminalWithoutMatch) return false;
  const hasCandidates = scan.imageCandidates.length > 0;
  const missingAsin = !hasNonEmptyString(scan.asin);
  const missingTitle = !hasNonEmptyString(scan.title);
  if (hasCandidates && missingAsin && missingTitle) return true;
  return scan.status === 'no_match' && hasCandidates && missingAsin;
};

export const summariseEvaluation = (
  evaluation: ProductScanRecord['amazonEvaluation']
): Record<string, unknown> | null => {
  if (evaluation === null) return null;
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

const findLatestStep = (
  scan: ProductScanRecord,
  key: string
): ProductScanRecord['steps'][number] | null =>
  [...scan.steps].reverse().find((step) => step.key === key) ?? null;

const resolveCaptchaRecoveryPath = (input: {
  automaticRetryAttempted: boolean;
  automaticRetrySkipped: boolean;
  manualFallbackOpened: boolean;
}): CaptchaRecovery['recoveryPath'] => {
  if (input.manualFallbackOpened && input.automaticRetryAttempted) {
    return 'automatic_retry_then_manual_fallback';
  }
  if (input.manualFallbackOpened && input.automaticRetrySkipped) {
    return 'automatic_retry_skipped_then_manual_fallback';
  }
  if (input.manualFallbackOpened) return 'manual_fallback';
  if (input.automaticRetryAttempted) return 'automatic_retry';
  if (input.automaticRetrySkipped) return 'automatic_retry_skipped';
  return null;
};

const resolveLatestCaptchaStage = (input: {
  manualRetryStep: ProductScanRecord['steps'][number] | null;
  raw: Record<string, unknown> | null;
  stealthRetrySkippedStep: ProductScanRecord['steps'][number] | null;
  stealthRetryStep: ProductScanRecord['steps'][number] | null;
}): string | null =>
  readStepDetailValue(input.manualRetryStep?.details, 'Blocked stage') ??
  readStepDetailValue(input.stealthRetryStep?.details, 'Blocked stage') ??
  readStepDetailValue(input.stealthRetrySkippedStep?.details, 'Blocked stage') ??
  readRawString(input.raw, 'stage');

const hasAutomaticRetryAttempted = (
  raw: Record<string, unknown> | null,
  stealthRetryStep: ProductScanRecord['steps'][number] | null
): boolean => raw?.['captchaStealthRetryStarted'] === true || stealthRetryStep !== null;

const hasManualFallbackOpened = (
  raw: Record<string, unknown> | null,
  manualRetryStep: ProductScanRecord['steps'][number] | null
): boolean =>
  raw?.['captchaManualRetryStarted'] === true ||
  raw?.['manualVerificationPending'] === true ||
  manualRetryStep !== null;

export const summariseCaptchaRecovery = (scan: ProductScanRecord): CaptchaRecovery => {
  const raw = toRecord(scan.rawResult);
  const stealthRetryStep = findLatestStep(scan, 'google_stealth_retry');
  const stealthRetrySkippedStep = findLatestStep(scan, 'google_stealth_retry_skipped');
  const manualRetryStep = findLatestStep(scan, 'google_manual_retry');
  const automaticRetryAttempted = hasAutomaticRetryAttempted(raw, stealthRetryStep);
  const automaticRetrySkipped = stealthRetrySkippedStep !== null;
  const manualFallbackOpened = hasManualFallbackOpened(raw, manualRetryStep);

  return {
    automaticRetryAttempted,
    automaticRetrySkipped,
    manualFallbackOpened,
    recoveryPath: resolveCaptchaRecoveryPath({
      automaticRetryAttempted,
      automaticRetrySkipped,
      manualFallbackOpened,
    }),
    latestCaptchaStage: resolveLatestCaptchaStage({
      manualRetryStep,
      raw,
      stealthRetrySkippedStep,
      stealthRetryStep,
    }),
  };
};

export const summariseCaptchaSteps = (
  scan: ProductScanRecord
): Array<{ key: string; message: string | null; resultCode: string | null; status: string }> =>
  scan.steps
    .filter((step) => includesAnyPattern(step.key.trim().toLowerCase(), CAPTCHA_STEP_KEY_PATTERNS))
    .map((step) => ({
      key: step.key,
      status: step.status,
      resultCode: step.resultCode ?? null,
      message: step.message,
    }));

export const resolveCaptchaReason = (recovery: CaptchaRecovery): string => {
  switch (recovery.recoveryPath) {
    case 'automatic_retry_then_manual_fallback':
      return 'Captcha detected after automatic retry escalated to manual fallback.';
    case 'automatic_retry_skipped_then_manual_fallback':
      return 'Captcha detected, automatic retry was skipped because no proxy was configured, then manual fallback opened.';
    case 'manual_fallback':
      return 'Captcha detected and reopened in a visible browser for manual verification.';
    case 'automatic_retry':
      return 'Captcha detected and automatic retry with a fresh proxy session started.';
    case 'automatic_retry_skipped':
      return 'Captcha detected and automatic retry was skipped because no proxy was configured.';
    default:
      return 'Captcha / manual verification detected in rawResult or error message.';
  }
};
