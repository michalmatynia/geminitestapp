import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { readOptionalString, resolveScanEngineRunId } from './product-scans-service.helpers';
import {
  sync1688ProductScanWithRun,
  syncMissing1688EngineRun,
} from './product-scans-sync-1688-run';

export {
  normalize1688ScanFailureMessage,
  resolve1688ConnectionEngineSettings,
  resolve1688ManualVerificationMessage,
  SCANNER_1688_DEFAULT_LOCALE,
  SCANNER_1688_DEFAULT_SLOW_MO_MS,
  SCANNER_1688_DEFAULT_TIMEZONE_ID,
  SCANNER_1688_MANUAL_VERIFICATION_MESSAGE,
  SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE,
  SCANNER_1688_MISSING_PROFILE_MESSAGE,
  SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN,
} from './product-scans-sync-1688-settings';

export async function synchronize1688ProductScan(
  scan: ProductScanRecord
): Promise<ProductScanRecord> {
  const engineRunId = readOptionalString(resolveScanEngineRunId(scan));

  if (engineRunId === null) {
    return await syncMissing1688EngineRun(scan);
  }

  try {
    return await sync1688ProductScanWithRun(scan, engineRunId);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronize1688ProductScan.catch',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return scan;
  }
}
