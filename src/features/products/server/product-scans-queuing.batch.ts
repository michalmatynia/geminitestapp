import 'server-only';

import type {
  ProductScanBatchItem,
  ProductScanBatchResponse,
} from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  createFailedBatchResult,
} from './product-scans-service.helpers';
import {
  PRODUCT_SCAN_BATCH_START_CONCURRENCY,
} from './product-scans-service.helpers.amazon';
import {
  persistQueuedProductScan,
  prepareQueuedProductScanItem,
  startQueuedProductScanRun,
} from './product-scans-queuing.core';
import {
  loadProductScannerSettings,
  mapWithConcurrencyLimit,
  resolveAlreadyRunningBatchResult,
  resolveSupplierConnectionContext,
  summarizeBatchResults,
  type ProductScannerSettings,
  type QueueBatchProductScansInput,
  type SupplierConnectionContext,
} from './product-scans-queuing.shared';

const queueProductScanItem = async (input: {
  productId: string;
  batchInput: QueueBatchProductScansInput;
  requestInput: Record<string, unknown>;
  scannerSettings: ProductScannerSettings;
  supplierConnectionContext: SupplierConnectionContext;
}): Promise<ProductScanBatchItem> => {
  try {
    const alreadyRunning = await resolveAlreadyRunningBatchResult({
      productId: input.productId,
      provider: input.batchInput.config.provider,
    });
    if (alreadyRunning !== null) return alreadyRunning;

    const prepared = await prepareQueuedProductScanItem({
      config: input.batchInput.config,
      productId: input.productId,
      requestInput: input.requestInput,
      scannerSettings: input.scannerSettings,
      supplierConnectionContext: input.supplierConnectionContext,
    });
    if (prepared.kind === 'failed') return prepared.result;

    const runtime = await startQueuedProductScanRun({
      config: input.batchInput.config,
      forceVisible: input.batchInput.forceVisible,
      item: prepared.item,
      ownerUserId: input.batchInput.ownerUserId,
      scannerSettings: input.scannerSettings,
      supplierConnectionContext: input.supplierConnectionContext,
    });
    if ('status' in runtime) return runtime;
    return persistQueuedProductScan({
      config: input.batchInput.config,
      item: prepared.item,
      ownerUserId: input.batchInput.ownerUserId,
      runtime,
    });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.batchInput.config.actionPrefix}.item`,
      productId: input.productId,
    });
    return createFailedBatchResult(input.productId, 'Failed to queue scan.');
  }
};

export async function queueBatchProductScans(
  input: QueueBatchProductScansInput
): Promise<ProductScanBatchResponse> {
  const productIds = Array.from(new Set(input.productIds));
  if (productIds.length === 0) {
    return { queued: 0, running: 0, alreadyRunning: 0, failed: 0, results: [] };
  }

  const requestInput = input.requestInput ?? {};
  const scannerSettings = await loadProductScannerSettings(input.config.actionPrefix);
  const supplierConnectionContext = await resolveSupplierConnectionContext({
    config: input.config,
    requestInput,
  });
  const results = await mapWithConcurrencyLimit(
    productIds,
    PRODUCT_SCAN_BATCH_START_CONCURRENCY,
    async (productId): Promise<ProductScanBatchItem> =>
      queueProductScanItem({
        productId,
        batchInput: input,
        requestInput,
        scannerSettings,
        supplierConnectionContext,
      })
  );

  return summarizeBatchResults(results);
}
