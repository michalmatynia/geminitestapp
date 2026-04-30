import 'server-only';

import type { ProductScanRecord, ProductScanStep } from '@/shared/contracts/product-scans';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import { getPlaywrightActionRunDetail } from '@/shared/lib/playwright/action-run-history-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mapSupplier1688ActionRunStepsToProductScanSteps } from './product-scans-1688-step-sequencer-bridge';

export const readRetained1688ActionRunProductSteps = async (
  engineRunId: string,
  scan: ProductScanRecord
): Promise<ProductScanStep[] | null> => {
  try {
    const detail = await getPlaywrightActionRunDetail(engineRunId);
    if (detail?.run.runtimeKey !== SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY) return null;
    if (!Array.isArray(detail.steps) || detail.steps.length === 0) return null;

    const mappedSteps = mapSupplier1688ActionRunStepsToProductScanSteps(detail.steps);
    if (mappedSteps.length === 0) return null;
    return mappedSteps;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronize1688ProductScan.readRetainedActionRun',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return null;
  }
};
