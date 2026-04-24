import type {
  ProductScanAmazonEvaluationStatus,
  ProductScanRecord,
  ProductScanSupplierEvaluationStatus,
  ProductScanStatus,
} from '@/shared/contracts/product-scans';
import type { TriggerButtonRunFeedbackPresentation } from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';

export type ProductScanRunFeedback = TriggerButtonRunFeedbackPresentation & {
  scanId: string;
  status: ProductScanStatus;
  updatedAt: string | null;
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
    badgeClassName:
      'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
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
    badgeClassName:
      'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
  },
  conflict: {
    label: 'Conflict',
    variant: 'warning',
    badgeClassName:
      'border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/25',
  },
  failed: { label: 'Failed', variant: 'error' },
};

const isManualVerificationPending = (scan: Pick<ProductScanRecord, 'rawResult'>): boolean => {
  const rawResult = scan.rawResult;
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['manualVerificationPending'] === true;
};

export const isProductScanGoogleStealthRetrying = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult'> | null | undefined
): boolean => {
  if (scan?.status !== 'running' && scan?.status !== 'queued') {
    return false;
  }

  const rawResult = scan.rawResult;
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  const result = rawResult as Record<string, unknown>;
  return (
    result['captchaStealthRetryStarted'] === true &&
    result['manualVerificationPending'] !== true &&
    result['captchaManualRetryStarted'] !== true
  );
};

export const isProductScanGoogleManualFallbackOpen = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult' | 'steps'> | null | undefined
): boolean => {
  if (scan?.status !== 'running' && scan?.status !== 'queued') {
    return false;
  }

  const rawResult = scan.rawResult;
  const rawResultRecord =
    rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult)
      ? (rawResult as Record<string, unknown>)
      : null;
  const hasManualRetryFlag = rawResultRecord?.['captchaManualRetryStarted'] === true;
  const hasManualRetryStep =
    Array.isArray(scan.steps) &&
    scan.steps.some((step) => step.key === 'google_manual_retry');

  return hasManualRetryFlag || hasManualRetryStep;
};

const getManualVerificationMessage = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'asinUpdateMessage'> | null | undefined
): string | null => {
  if (!scan) {
    return null;
  }
  const rawResult = scan.rawResult;
  if (rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult)) {
    const msg = (rawResult as Record<string, unknown>)['manualVerificationMessage'];
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }
  }
  return typeof scan.asinUpdateMessage === 'string' ? scan.asinUpdateMessage : null;
};

export const isProductScanCandidateSelectionRequired = (
  scan: Pick<ProductScanRecord, 'status' | 'rawResult'> | null | undefined
): boolean => {
  if (scan?.status !== 'completed') {
    return false;
  }

  const rawResult = scan.rawResult;
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['candidateSelectionRequired'] === true;
};

export const resolveProductScanRunFeedbackPresentation = (
  status: ProductScanStatus,
  options?: {
    manualVerificationPending?: boolean | null;
    manualVerificationMessage?: string | null;
    googleStealthRetrying?: boolean | null;
    googleManualFallbackOpen?: boolean | null;
    candidateSelectionRequired?: boolean | null;
    amazonEvaluationStatus?: ProductScanAmazonEvaluationStatus | null;
    amazonEvaluationLanguageAccepted?: boolean | null;
    supplierEvaluationStatus?: ProductScanSupplierEvaluationStatus | null;
  }
): TriggerButtonRunFeedbackPresentation =>
  (status === 'running' || status === 'queued') && options?.googleStealthRetrying
    ? {
        label: PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_LABEL,
        variant: 'warning',
        badgeClassName:
          'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
      }
    : (status === 'running' || status === 'queued') && options?.googleManualFallbackOpen
    ? {
        label: PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_LABEL,
        variant: 'warning',
        badgeClassName:
          'border-sky-500/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/25',
      }
    : status === 'running' && options?.manualVerificationPending
    ? {
        label: /requested login/i.test(options?.manualVerificationMessage ?? '') ? 'Login' : 'Captcha',
        variant: 'warning',
        badgeClassName:
          'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
      }
    : status === 'completed' && options?.candidateSelectionRequired
      ? {
          label: PRODUCT_SCAN_CANDIDATE_SELECTION_LABEL,
          variant: 'warning',
          badgeClassName:
            'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
        }
    : status === 'no_match' &&
        options?.amazonEvaluationStatus === 'rejected' &&
        options?.amazonEvaluationLanguageAccepted === false
      ? {
          label: 'AI Rejected: Language',
          variant: 'warning',
          badgeClassName:
            'border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/25',
        }
    : status === 'no_match' && options?.amazonEvaluationStatus === 'rejected'
      ? {
          label: 'AI Rejected',
          variant: 'warning',
          badgeClassName:
            'border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/25',
        }
      : status === 'no_match' && options?.supplierEvaluationStatus === 'rejected'
        ? {
            label: 'AI Rejected',
            variant: 'warning',
            badgeClassName:
              'border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/25',
          }
      : status === 'failed' && options?.amazonEvaluationStatus === 'failed'
        ? {
            label: 'AI Failed',
            variant: 'error',
          }
        : status === 'failed' && options?.supplierEvaluationStatus === 'failed'
          ? {
              label: 'AI Failed',
              variant: 'error',
            }
        : PRODUCT_SCAN_RUN_FEEDBACK_PRESENTATIONS[status] ?? {
            label: status,
            variant: 'neutral',
          };

export const buildProductScanRunFeedbackFromRecord = (
  scan: ProductScanRecord
): ProductScanRunFeedback => ({
  scanId: scan.id,
  status: scan.status,
  updatedAt: scan.updatedAt ?? scan.completedAt ?? scan.createdAt ?? null,
  ...resolveProductScanRunFeedbackPresentation(scan.status, {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: getManualVerificationMessage(scan),
    googleStealthRetrying: isProductScanGoogleStealthRetrying(scan),
    googleManualFallbackOpen: isProductScanGoogleManualFallbackOpen(scan),
    candidateSelectionRequired: isProductScanCandidateSelectionRequired(scan),
    amazonEvaluationStatus: scan.amazonEvaluation?.status ?? null,
    amazonEvaluationLanguageAccepted: scan.amazonEvaluation?.languageAccepted ?? null,
    supplierEvaluationStatus: scan.supplierEvaluation?.status ?? null,
  }),
});

export const resolveProductScanFeedbackAgeMs = (
  scan: ProductScanRecord,
  now = Date.now()
): number => {
  const timestamp = Date.parse(scan.updatedAt ?? scan.completedAt ?? scan.createdAt ?? '');
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
