import type { ProductScanRecord, ProductScanStatus } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import {
  isProductScanCandidateSelectionRequired,
  isProductScanGoogleManualFallbackOpen,
  PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
  PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_MESSAGE,
  isProductScanGoogleStealthRetrying,
  PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE,
} from '@/features/products/lib/product-scan-run-feedback';

type ScanMessages = {
  infoMessage: string | null;
  errorMessage: string | null;
};

export function resolveActiveStatusMessage(scan: ProductScanRecord): string | null {
  if (isProductScanGoogleStealthRetrying(scan)) {
    return PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE;
  }
  if (isProductScanGoogleManualFallbackOpen(scan)) {
    return PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_MESSAGE;
  }

  const { status } = scan;
  if (status === 'queued') return 'Amazon candidate search queued.';
  if (status === 'running') return 'Amazon candidate search running.';
  return null;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function renderScanMeta(scan: ProductScanRecord): React.JSX.Element | null {
  const asinPart = typeof scan.asin === 'string' && scan.asin !== '' ? `ASIN ${scan.asin}` : null;
  const pricePart = typeof scan.price === 'string' && scan.price !== '' ? `Price ${scan.price}` : null;
  const parts = [asinPart, pricePart].filter((p): p is string => p !== null);
  return parts.length > 0 ? <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p> : null;
}

const resolveCompletedMessages = (asin: string | null): ScanMessages => ({
  infoMessage: asin,
  errorMessage: null,
});

const resolveNoMatchMessages = (asin: string | null, error: string | null): ScanMessages => ({
  infoMessage: asin ?? error,
  errorMessage: null,
});

const resolveFailureMessages = (asin: string | null, error: string | null): ScanMessages => ({
  infoMessage: null,
  errorMessage: error ?? asin,
});

const resolveActiveMessages = (scan: ProductScanRecord): ScanMessages => ({
  infoMessage: scan.asinUpdateMessage ?? resolveActiveStatusMessage(scan),
  errorMessage: scan.error ?? null,
});

function resolveMessagesByStatus(
  status: ProductScanStatus,
  asin: string | null,
  error: string | null,
  scan: ProductScanRecord
): ScanMessages {
  if (status === 'completed') return resolveCompletedMessages(asin);
  if (status === 'no_match') return resolveNoMatchMessages(asin, error);
  if (status === 'conflict' || status === 'failed') return resolveFailureMessages(asin, error);
  if (isProductScanActiveStatus(status)) return resolveActiveMessages(scan);
  return { infoMessage: asin, errorMessage: error };
}

export function resolveScanMessages(scan: ProductScanRecord): ScanMessages {
  if (isProductScanCandidateSelectionRequired(scan)) {
    return {
      infoMessage: PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
      errorMessage: null,
    };
  }

  return resolveMessagesByStatus(
    scan.status,
    scan.asinUpdateMessage ?? null,
    scan.error ?? null,
    scan
  );
}
