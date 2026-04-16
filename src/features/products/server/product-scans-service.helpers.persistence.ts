import 'server-only';

import {
  normalizeProductScanRecord,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { updateProductScan } from './product-scans-repository';
import {
  PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS,
  PRODUCT_SCAN_ERROR_MAX_LENGTH,
  PRODUCT_SCAN_URL_MAX_LENGTH,
  PRODUCT_SCAN_PRICE_MAX_LENGTH,
  PRODUCT_SCAN_TITLE_MAX_LENGTH,
} from './product-scans-service.constants';
import {
  readOptionalString,
} from './product-scans-service.helpers.base';
import {
  resolvePersistedProductScanSteps,
  createPersistedProductScanStep,
} from './product-scans-service.helpers.steps';

export const persistSynchronizedScan = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): Promise<ProductScanRecord> => {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS) {
    try {
      const result = await updateProductScan(scan.id, {
        ...updates,
        error: readOptionalString(updates.error, PRODUCT_SCAN_ERROR_MAX_LENGTH),
        url: readOptionalString(updates.url, PRODUCT_SCAN_URL_MAX_LENGTH),
        price: readOptionalString(updates.price, PRODUCT_SCAN_PRICE_MAX_LENGTH),
        title: readOptionalString(updates.title, PRODUCT_SCAN_TITLE_MAX_LENGTH),
      });
      if (result === null) {
        throw new Error(`Product scan ${scan.id} could not be updated.`);
      }
      return normalizeProductScanRecord(result);
    } catch (error) {
      attempt++;
      lastError = error;
      if (attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  void ErrorSystem.captureException(lastError, {
    service: 'product-scans.service',
    action: 'persistSynchronizedScan',
    scanId: scan.id,
    productId: scan.productId,
    attempt,
  });

  throw lastError;
};

export const persistFailedSynchronization = async (
  scan: ProductScanRecord,
  error: string,
  asinUpdateMessage?: string | null
): Promise<ProductScanRecord> =>
  await persistSynchronizedScan(scan, {
    status: 'failed',
    error: readOptionalString(error, PRODUCT_SCAN_ERROR_MAX_LENGTH) ?? 'Sync failed',
    asinUpdateStatus: 'failed',
    asinUpdateMessage: readOptionalString(asinUpdateMessage ?? error),
    completedAt: new Date().toISOString(),
  });

export const tryDirectQueuedScanUpdate = async (
  scan: ProductScanRecord,
  input: {
    status?: ProductScanRecord['status'];
    engineRunId?: string | null;
    error?: string | null;
    asinUpdateStatus?: ProductScanRecord['asinUpdateStatus'];
    asinUpdateMessage?: string | null;
    completedAt?: string | null;
    message?: string | null;
    stepKey?: string;
    stepLabel?: string;
    stepStatus?: ProductScanRecord['steps'][number]['status'];
  }
): Promise<ProductScanRecord | null> => {
  if (scan.status !== 'queued') {
    return null;
  }

  const nextSteps = input.stepKey
    ? resolvePersistedProductScanSteps(scan, [
        createPersistedProductScanStep({
          key: input.stepKey,
          label: input.stepLabel ?? 'Update',
          status: input.stepStatus ?? 'completed',
          message: input.message ?? input.asinUpdateMessage,
        }),
      ])
    : scan.steps;

  return await persistSynchronizedScan(scan, {
    status: input.status ?? scan.status,
    engineRunId: input.engineRunId ?? scan.engineRunId,
    error: input.error ?? scan.error,
    asinUpdateStatus: input.asinUpdateStatus ?? scan.asinUpdateStatus,
    asinUpdateMessage: input.asinUpdateMessage ?? scan.asinUpdateMessage,
    completedAt: input.completedAt ?? scan.completedAt,
    steps: nextSteps,
  });
};
