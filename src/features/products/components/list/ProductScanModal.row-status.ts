import {
  isProductScanCandidateSelectionRequired,
  isProductScanGoogleManualFallbackOpen,
  isProductScanGoogleStealthRetrying,
  PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
  resolveProductScanRunFeedbackPresentation,
} from '@/features/products/lib/product-scan-run-feedback';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import type { ScanModalRow } from './ProductScanModal.types';

export const PRODUCT_SCAN_ROW_STATUS_LABELS: Record<ScanModalRow['status'], string> = {
  enqueuing: 'Enqueuing',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

export const PRODUCT_SCAN_ROW_STATUS_CLASSES: Record<ScanModalRow['status'], string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

export type ProductScanRowMessages = {
  infoMessage: string | null;
  errorMessage: string | null;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const normalizeText = (value: unknown): string | null => (hasText(value) ? value : null);

const normalizeBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const firstText = (values: unknown[]): string | null => {
  for (const value of values) {
    if (hasText(value)) return value;
  }
  return null;
};

const isManualVerificationPending = (
  scan: Pick<ProductScanRecord, 'rawResult'> | null
): boolean => {
  const rawResult = scan?.rawResult;
  if (
    rawResult === null ||
    rawResult === undefined ||
    typeof rawResult !== 'object' ||
    Array.isArray(rawResult)
  ) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['manualVerificationPending'] === true;
};

const resolveAmazonEvaluationStatus = (row: ScanModalRow): string | null =>
  row.scan?.amazonEvaluation?.status ?? null;

const resolveAmazonEvaluationLanguageAccepted = (row: ScanModalRow): boolean | null =>
  normalizeBoolean(row.scan?.amazonEvaluation?.languageAccepted);

const resolveSupplierEvaluationStatus = (row: ScanModalRow): string | null =>
  row.scan?.supplierEvaluation?.status ?? null;

const buildRunFeedbackContext = (
  row: ScanModalRow
): Parameters<typeof resolveProductScanRunFeedbackPresentation>[1] => ({
  manualVerificationPending: isManualVerificationPending(row.scan),
  manualVerificationMessage: normalizeText(row.scan?.asinUpdateMessage),
  googleStealthRetrying: isProductScanGoogleStealthRetrying(row.scan),
  googleManualFallbackOpen: isProductScanGoogleManualFallbackOpen(row.scan),
  candidateSelectionRequired: isProductScanCandidateSelectionRequired(row.scan),
  amazonEvaluationStatus: resolveAmazonEvaluationStatus(row),
  amazonEvaluationLanguageAccepted: resolveAmazonEvaluationLanguageAccepted(row),
  supplierEvaluationStatus: resolveSupplierEvaluationStatus(row),
});

export const resolveRowStatusLabel = (row: ScanModalRow): string => {
  if (row.status === 'enqueuing') return PRODUCT_SCAN_ROW_STATUS_LABELS[row.status];
  return resolveProductScanRunFeedbackPresentation(row.status, buildRunFeedbackContext(row)).label;
};

export const resolveRowStatusClassName = (row: ScanModalRow): string => {
  if (row.status === 'enqueuing') return PRODUCT_SCAN_ROW_STATUS_CLASSES[row.status];
  return (
    resolveProductScanRunFeedbackPresentation(row.status, buildRunFeedbackContext(row))
      .badgeClassName ?? PRODUCT_SCAN_ROW_STATUS_CLASSES[row.status]
  );
};

const resolveNoScanMessages = (row: ScanModalRow): ProductScanRowMessages => {
  if (row.status === 'failed') {
    return { infoMessage: null, errorMessage: row.message };
  }
  return { infoMessage: row.message, errorMessage: null };
};

const resolveNoMatchMessages = (row: ScanModalRow): ProductScanRowMessages => ({
  infoMessage: firstText([row.scan?.asinUpdateMessage, row.scan?.error, row.message]),
  errorMessage: null,
});

const resolveErrorStatusMessages = (row: ScanModalRow): ProductScanRowMessages => ({
  infoMessage: null,
  errorMessage: firstText([row.scan?.error, row.scan?.asinUpdateMessage, row.message]),
});

const resolveScanStatusMessages = (row: ScanModalRow): ProductScanRowMessages => {
  switch (row.scan?.status) {
    case 'completed':
      return { infoMessage: row.message, errorMessage: null };
    case 'no_match':
      return resolveNoMatchMessages(row);
    case 'conflict':
    case 'failed':
      return resolveErrorStatusMessages(row);
    default:
      return {
        infoMessage: row.message,
        errorMessage: normalizeText(row.scan?.error),
      };
  }
};

export const resolveRowDisplayMessages = (row: ScanModalRow): ProductScanRowMessages => {
  if (row.scan === null) return resolveNoScanMessages(row);
  if (isProductScanCandidateSelectionRequired(row.scan)) {
    return {
      infoMessage: PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
      errorMessage: null,
    };
  }
  return resolveScanStatusMessages(row);
};
