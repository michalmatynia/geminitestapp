import type {
  ProductScanAmazonEvaluationStatus,
  ProductScanRecord,
  ProductScanStatus,
} from '@/shared/contracts/product-scans';
import type { TriggerButtonRunFeedbackPresentation } from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';

export type ProductScanRunFeedback = TriggerButtonRunFeedbackPresentation & {
  scanId: string;
  status: ProductScanStatus;
  updatedAt: string | null;
};

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

export const resolveProductScanRunFeedbackPresentation = (
  status: ProductScanStatus,
  options?: {
    manualVerificationPending?: boolean | null;
    amazonEvaluationStatus?: ProductScanAmazonEvaluationStatus | null;
    amazonEvaluationLanguageAccepted?: boolean | null;
  }
): TriggerButtonRunFeedbackPresentation =>
  status === 'running' && options?.manualVerificationPending
    ? {
        label: 'Captcha',
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
      : status === 'failed' && options?.amazonEvaluationStatus === 'failed'
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
    amazonEvaluationStatus: scan.amazonEvaluation?.status ?? null,
    amazonEvaluationLanguageAccepted: scan.amazonEvaluation?.languageAccepted ?? null,
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
