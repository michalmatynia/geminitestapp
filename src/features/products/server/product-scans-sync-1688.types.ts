import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import type { ProductScanRecord, ProductScanStep } from '@/shared/contracts/product-scans';

import type { SupplierScanRuntimeResult } from './product-scans-service.helpers';

export type ProductScan1688SyncContext = {
  scan: ProductScanRecord;
  engineRunId: string;
  run: PlaywrightEngineRunRecord;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
  parsedResult: SupplierScanRuntimeResult;
  productScanStepSource: ProductScanStep[];
};
