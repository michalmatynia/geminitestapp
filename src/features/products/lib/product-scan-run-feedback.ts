import type {
  ProductScanAmazonEvaluationStatus,
  ProductScanRecord,
  ProductScanStatus,
  ProductScanSupplierEvaluationStatus,
} from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import type { TriggerButtonRunFeedbackPresentation } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

export type ProductScanRunFeedback = TriggerButtonRunFeedbackPresentation & {
  scanId: string;
  status: ProductScanStatus;
  updatedAt: string | null;
};

type ProductScanRawResultRecord = Record<string, unknown>;

type ProductScanRunFeedbackOptions = {
  manualVerificationPending?: boolean | null;
  manualVerificationMessage?: string | null;
  googleStealthRetrying?: boolean | null;
  googleManualFallbackOpen?: boolean | null;
  candidateSelectionRequired?: boolean | null;
  amazonEvaluationStatus?: ProductScanAmazonEvaluationStatus | null;
  amazonEvaluationLanguageAccepted?: boolean | null;
  supplierEvaluationStatus?: ProductScanSupplierEvaluationStatus | null;
};

export const PRODUCT_SCAN_CANDIDATE_SELECTION_LABEL = 'Awaiting Selection';
export const PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE =
  'Amazon candidates are ready for manual selection.';
export const PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_LABEL = 'Retrying Google';
export const PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE =
  'Retrying Google Lens automatically with a fresh proxy session before manual fallback.';
export const PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_LABEL = 'Manual Fallback';
export const PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_MESSAGE =
  'Opening a visible browser for Google captcha verification.';

const PRODUCT_SCAN_WARNING_BADGE_CLASS =
  'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25';
const PRODUCT_SCAN_AI_WARNING_BADGE_CLASS =
  'border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/25';

const PRODUCT_SCAN_RUN_FEEDBACK_PRESENTATIONS: Record<
  ProductScanStatus,
  TriggerButtonRunFeedbackPresentation
> = {
  enqueuing: {
    label: 'Enqueuing',
    variant: 'neutral',
    badgeClassName:
      'border-slate-500/40 bg-slate-500/20 text-slate-200 hover:bg-slate-500/25',
  },
  queued: {
    label: 'Queued',
    variant: 'pending',
    badgeClassName: PRODUCT_SCAN_WARNING_BADGE_CLASS,
  },
  running: {
    label: 'Running',
    variant: 'processing',
    badgeClassName:
      'border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/25',
  },
  completed: { label: 'Completed', variant: 'success' },
  no_match: {
    label: 'No Match',
    variant: 'warning',
    badgeClassName: PRODUCT_SCAN_WARNING_BADGE_CLASS,
  },
  conflict: {
    label: 'Conflict',
    variant: 'warning',
    badgeClassName: PRODUCT_SCAN_AI_WARNING_BADGE_CLASS,
  },
  failed: { label: 'Failed', variant: 'error' },
};

const GOOGLE_STEALTH_RETRY_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_LABEL,
  variant: 'warning',
  badgeClassName: PRODUCT_SCAN_WARNING_BADGE_CLASS,
};

const GOOGLE_MANUAL_FALLBACK_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_LABEL,
  variant: 'warning',
  badgeClassName:
    'border-sky-500/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/25',
};

const CANDIDATE_SELECTION_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: PRODUCT_SCAN_CANDIDATE_SELECTION_LABEL,
  variant: 'warning',
  badgeClassName: PRODUCT_SCAN_WARNING_BADGE_CLASS,
};

const AI_REJECTED_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: 'AI Rejected',
  variant: 'warning',
  badgeClassName: PRODUCT_SCAN_AI_WARNING_BADGE_CLASS,
};

const AI_LANGUAGE_REJECTED_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: 'AI Rejected: Language',
  variant: 'warning',
  badgeClassName: PRODUCT_SCAN_AI_WARNING_BADGE_CLASS,
};

const AI_FAILED_PRESENTATION: TriggerButtonRunFeedbackPresentation = {
  label: 'AI Failed',
  variant: 'error',
};

const toRawResultRecord = (rawResult: unknown): ProductScanRawResultRecord | null => {
  if (rawResult === null || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return null;
  }
  return rawResult as ProductScanRawResultRecord;
};

const isQueuedOrRunning = (status: ProductScanStatus): boolean =>
  status === 'running' || status === 'queued';

const readRawResultFlag = (rawResult: unknown, key: string): boolean => {
  const record = toRawResultRecord(rawResult);
  if (record === null) return false;
  return record[key] === true;
};

const readRawResultString = (rawResult: unknown, key: string): string | null => {
  const record = toRawResultRecord(rawResult);
  const value = record?.[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
};

const isManualVerificationPending = (scan: Pick<ProductScanRecord, 'rawResult'>): boolean =>
  readRawResultFlag(scan.rawResult, 'manualVerificationPending');

const hasGoogleManualRetryStep = (scan: Pick<ProductScanRecord, 'steps'>): boolean =>
  Array.isArray(scan.steps) && scan.steps.some((step) => step.key === 'google_manual_retry');

export const isProductScanGoogleStealthRetrying = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult'> | null | undefined
): boolean => {
  if (scan === null || scan === undefined) return false;
  if (!isQueuedOrRunning(scan.status)) return false;
  return (
    readRawResultFlag(scan.rawResult, 'captchaStealthRetryStarted') &&
    !readRawResultFlag(scan.rawResult, 'manualVerificationPending') &&
    !readRawResultFlag(scan.rawResult, 'captchaManualRetryStarted')
  );
};

export const isProductScanGoogleManualFallbackOpen = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult' | 'steps'> | null | undefined
): boolean => {
  if (scan === null || scan === undefined) return false;
  if (!isQueuedOrRunning(scan.status)) return false;
  return (
    readRawResultFlag(scan.rawResult, 'captchaManualRetryStarted') ||
    hasGoogleManualRetryStep(scan)
  );
};

const getManualVerificationMessage = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'asinUpdateMessage'> | null | undefined
): string | null => {
  if (scan === null || scan === undefined) {
    return null;
  }
  const rawMessage = readRawResultString(scan.rawResult, 'manualVerificationMessage');
  if (rawMessage !== null) return rawMessage;
  return typeof scan.asinUpdateMessage === 'string' ? scan.asinUpdateMessage : null;
};

export const isProductScanCandidateSelectionRequired = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult'> | null | undefined
): boolean => {
  if (scan === null || scan === undefined) return false;
  if (scan.status !== 'completed') return false;
  return readRawResultFlag(scan.rawResult, 'candidateSelectionRequired');
};

const resolveManualVerificationPresentation = (
  message: string | null | undefined
): TriggerButtonRunFeedbackPresentation => ({
  label: /requested login/i.test(message ?? '') ? 'Login' : 'Captcha',
  variant: 'warning',
  badgeClassName: PRODUCT_SCAN_WARNING_BADGE_CLASS,
});

const resolveActiveScanPresentation = (
  status: ProductScanStatus,
  options: ProductScanRunFeedbackOptions
): TriggerButtonRunFeedbackPresentation | null => {
  if (!isQueuedOrRunning(status)) return null;
  if (options.googleStealthRetrying === true) return GOOGLE_STEALTH_RETRY_PRESENTATION;
  if (options.googleManualFallbackOpen === true) return GOOGLE_MANUAL_FALLBACK_PRESENTATION;
  if (status === 'running' && options.manualVerificationPending === true) {
    return resolveManualVerificationPresentation(options.manualVerificationMessage);
  }
  return null;
};

const resolveCompletedScanPresentation = (
  status: ProductScanStatus,
  options: ProductScanRunFeedbackOptions
): TriggerButtonRunFeedbackPresentation | null => {
  if (status !== 'completed') return null;
  if (options.candidateSelectionRequired !== true) return null;
  return CANDIDATE_SELECTION_PRESENTATION;
};

const resolveNoMatchPresentation = (
  status: ProductScanStatus,
  options: ProductScanRunFeedbackOptions
): TriggerButtonRunFeedbackPresentation | null => {
  if (status !== 'no_match') return null;
  if (
    options.amazonEvaluationStatus === 'rejected' &&
    options.amazonEvaluationLanguageAccepted === false
  ) {
    return AI_LANGUAGE_REJECTED_PRESENTATION;
  }
  if (options.amazonEvaluationStatus === 'rejected') return AI_REJECTED_PRESENTATION;
  if (options.supplierEvaluationStatus === 'rejected') return AI_REJECTED_PRESENTATION;
  return null;
};

const resolveFailedPresentation = (
  status: ProductScanStatus,
  options: ProductScanRunFeedbackOptions
): TriggerButtonRunFeedbackPresentation | null => {
  if (status !== 'failed') return null;
  if (options.amazonEvaluationStatus === 'failed') return AI_FAILED_PRESENTATION;
  if (options.supplierEvaluationStatus === 'failed') return AI_FAILED_PRESENTATION;
  return null;
};

export const resolveProductScanRunFeedbackPresentation = (
  status: ProductScanStatus,
  options: ProductScanRunFeedbackOptions = {}
): TriggerButtonRunFeedbackPresentation => {
  const activePresentation = resolveActiveScanPresentation(status, options);
  if (activePresentation !== null) return activePresentation;
  const completedPresentation = resolveCompletedScanPresentation(status, options);
  if (completedPresentation !== null) return completedPresentation;
  const noMatchPresentation = resolveNoMatchPresentation(status, options);
  if (noMatchPresentation !== null) return noMatchPresentation;
  const failedPresentation = resolveFailedPresentation(status, options);
  if (failedPresentation !== null) return failedPresentation;
  return PRODUCT_SCAN_RUN_FEEDBACK_PRESENTATIONS[status];
};

const getAmazonEvaluationStatus = (
  scan: ProductScanRecord
): ProductScanAmazonEvaluationStatus | null => {
  if (scan.amazonEvaluation === null) return null;
  return scan.amazonEvaluation.status;
};

const getAmazonEvaluationLanguageAccepted = (scan: ProductScanRecord): boolean | null => {
  if (scan.amazonEvaluation === null) return null;
  return scan.amazonEvaluation.languageAccepted ?? null;
};

const getSupplierEvaluationStatus = (
  scan: ProductScanRecord
): ProductScanSupplierEvaluationStatus | null => {
  if (scan.supplierEvaluation === null) return null;
  return scan.supplierEvaluation.status;
};

const getProductScanFeedbackUpdatedAt = (scan: ProductScanRecord): string | null => {
  if (typeof scan.updatedAt === 'string') return scan.updatedAt;
  if (typeof scan.completedAt === 'string') return scan.completedAt;
  if (typeof scan.createdAt === 'string') return scan.createdAt;
  return null;
};

const buildProductScanRunFeedbackOptions = (
  scan: ProductScanRecord
): ProductScanRunFeedbackOptions => ({
  manualVerificationPending: isManualVerificationPending(scan),
  manualVerificationMessage: getManualVerificationMessage(scan),
  googleStealthRetrying: isProductScanGoogleStealthRetrying(scan),
  googleManualFallbackOpen: isProductScanGoogleManualFallbackOpen(scan),
  candidateSelectionRequired: isProductScanCandidateSelectionRequired(scan),
  amazonEvaluationStatus: getAmazonEvaluationStatus(scan),
  amazonEvaluationLanguageAccepted: getAmazonEvaluationLanguageAccepted(scan),
  supplierEvaluationStatus: getSupplierEvaluationStatus(scan),
});

export const buildProductScanRunFeedbackFromRecord = (
  scan: ProductScanRecord
): ProductScanRunFeedback => ({
  scanId: scan.id,
  status: scan.status,
  updatedAt: getProductScanFeedbackUpdatedAt(scan),
  ...resolveProductScanRunFeedbackPresentation(
    scan.status,
    buildProductScanRunFeedbackOptions(scan)
  ),
});

const getProductScanFeedbackTimestamp = (scan: ProductScanRecord): string => {
  return getProductScanFeedbackUpdatedAt(scan) ?? '';
};

export const resolveProductScanFeedbackAgeMs = (
  scan: ProductScanRecord,
  now = Date.now()
): number => {
  const timestamp = Date.parse(getProductScanFeedbackTimestamp(scan));
  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, now - timestamp);
};

export const shouldShowProductScanRunFeedback = (
  scan: ProductScanRecord,
  now = Date.now(),
  terminalTtlMs = 15_000
): boolean => {
  if (isProductScanActiveStatus(scan.status)) {
    return true;
  }
  return resolveProductScanFeedbackAgeMs(scan, now) <= terminalTtlMs;
};
