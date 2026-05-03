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
  PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH,
  PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH,
} from './product-scans-service.constants';
import {
  readOptionalString,
} from './product-scans-service.helpers.base';
import {
  resolvePersistedProductScanSteps,
  createPersistedProductScanStep,
} from './product-scans-service.helpers.steps';

const waitForPersistRetry = async (attempt: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100 * attempt);
  });
};

const updateProductScanWithRetry = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>,
  attempt: number = 1
): Promise<ProductScanRecord> => {
  try {
    const result = await updateProductScan(scan.id, updates);
    if (result === null) {
      throw new Error(`Product scan ${scan.id} could not be updated.`);
    }
    return normalizeProductScanRecord(result);
  } catch (error) {
    if (attempt >= PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS) {
      throw error;
    }
    await waitForPersistRetry(attempt);
    return await updateProductScanWithRetry(scan, updates, attempt + 1);
  }
};

const reportPersistFailure = (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>,
  error: unknown
): void => {
  const effectiveEngineRunId =
    readOptionalString(updates.engineRunId) ?? readOptionalString(scan.engineRunId);

  void ErrorSystem.captureException(error, {
    service: 'product-scans.service',
    action: 'persistSynchronizedScan',
    scanId: scan.id,
    productId: scan.productId,
    engineRunId: effectiveEngineRunId,
  });
};

const resolveQueuedScanSteps = (
  scan: ProductScanRecord,
  input: {
    stepKey?: string;
    stepLabel?: string;
    stepStatus?: ProductScanRecord['steps'][number]['status'];
    message?: string | null;
    asinUpdateMessage?: string | null;
  }
): ProductScanRecord['steps'] => {
  if (input.stepKey === undefined) {
    return scan.steps;
  }

  return resolvePersistedProductScanSteps(scan, [
    createPersistedProductScanStep({
      key: input.stepKey,
      label: input.stepLabel ?? 'Update',
      status: input.stepStatus ?? 'completed',
      message: input.message ?? input.asinUpdateMessage,
    }),
  ]);
};

const buildDirectQueuedScanUpdates = (
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
): Partial<ProductScanRecord> => ({
  status: input.status ?? scan.status,
  engineRunId: input.engineRunId ?? scan.engineRunId,
  error: input.error ?? scan.error,
  asinUpdateStatus: input.asinUpdateStatus ?? scan.asinUpdateStatus,
  asinUpdateMessage: input.asinUpdateMessage ?? scan.asinUpdateMessage,
  completedAt: input.completedAt ?? scan.completedAt,
  steps: resolveQueuedScanSteps(scan, input),
});

export const persistSynchronizedScan = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): Promise<ProductScanRecord> => {
  const truncatedUpdates = {
    ...updates,
    error: readOptionalString(updates.error, PRODUCT_SCAN_ERROR_MAX_LENGTH),
    url: readOptionalString(updates.url, PRODUCT_SCAN_URL_MAX_LENGTH),
    price: readOptionalString(updates.price, PRODUCT_SCAN_PRICE_MAX_LENGTH),
    title: readOptionalString(updates.title, PRODUCT_SCAN_TITLE_MAX_LENGTH),
    description: readOptionalString(updates.description, PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH),
    matchedImageId: readOptionalString(updates.matchedImageId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  };

  try {
    return await updateProductScanWithRetry(scan, truncatedUpdates);
  } catch (error) {
    reportPersistFailure(scan, updates, error);
    return normalizeProductScanRecord({ ...scan, ...truncatedUpdates });
  }
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

  return await persistSynchronizedScan(scan, buildDirectQueuedScanUpdates(scan, input));
};
