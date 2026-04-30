import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { resolveAmazonRuntimeOperationLabel } from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  persistFailedSynchronization,
  resolveIsoAgeMs,
  resolveScanEngineRunId,
} from './product-scans-service.helpers';
import { synchronizeAmazonProductScanEngineRun } from './product-scans-sync-amazon-run';
import { resolveAmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';

const resolveMissingEngineRunAgeMs = (scan: ProductScanRecord): number | null =>
  resolveIsoAgeMs(scan.updatedAt) ??
  resolveIsoAgeMs(scan.createdAt) ??
  resolveIsoAgeMs(scan.completedAt);

const synchronizeAmazonScanWithoutEngineRun = async (
  scan: ProductScanRecord
): Promise<ProductScanRecord> => {
  const ageMs = resolveMissingEngineRunAgeMs(scan);
  if (ageMs !== null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
    return await persistFailedSynchronization(
      scan,
      'Amazon scan is missing its Playwright engine run id.'
    );
  }
  return scan;
};

const resolveAmazonSynchronizationFailureMessage = (
  scan: ProductScanRecord,
  error: unknown
): string =>
  error instanceof Error
    ? error.message
    : `Failed to synchronize ${resolveAmazonRuntimeOperationLabel(resolveAmazonScanRuntimeKey(scan))}.`;

export async function synchronizeAmazonProductScan(
  scan: ProductScanRecord
): Promise<ProductScanRecord> {
  const engineRunId = resolveScanEngineRunId(scan);
  if (engineRunId === null) {
    return await synchronizeAmazonScanWithoutEngineRun(scan);
  }

  try {
    return await synchronizeAmazonProductScanEngineRun(scan, engineRunId);
  } catch (error) {
    return await persistFailedSynchronization(
      scan,
      resolveAmazonSynchronizationFailureMessage(scan, error)
    );
  }
}
