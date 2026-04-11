import 'server-only';

import { randomUUID } from 'crypto';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import {
  isProductScanActiveStatus,
  isProductScanTerminalStatus,
  normalizeProductScanRecord,
  type ProductAmazonBatchScanItem,
  type ProductAmazonBatchScanResponse,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { AMAZON_REVERSE_IMAGE_SCAN_SCRIPT } from './product-scan-amazon-script';
import {
  resolveDetectedAmazonAsinOutcome,
  resolveProductScanDisplayName,
  resolveProductScanImageCandidates,
} from './product-scan-amazon.helpers';
import {
  findLatestActiveProductScan,
  getProductScanById,
  listProductScans,
  updateProductScan,
  upsertProductScan,
} from './product-scans-repository';

const AMAZON_SCAN_TIMEOUT_MS = 180_000;
const PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS = 60_000;
const PRODUCT_SCAN_ERROR_MAX_LENGTH = 2_000;
const PRODUCT_SCAN_BATCH_MESSAGE_MAX_LENGTH = 1_000;
const PRODUCT_SCAN_TITLE_MAX_LENGTH = 1_000;
const PRODUCT_SCAN_PRICE_MAX_LENGTH = 200;
const PRODUCT_SCAN_URL_MAX_LENGTH = 4_000;
const PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH = 8_000;
const PRODUCT_SCAN_ASIN_MAX_LENGTH = 40;
const PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH = 160;

type AmazonScanScriptResult = {
  status: 'matched' | 'no_match' | 'failed';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readOptionalString = (value: unknown, maxLength?: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
};

const normalizeErrorMessage = (
  value: unknown,
  fallback: string
): string => readOptionalString(value, PRODUCT_SCAN_ERROR_MAX_LENGTH) ?? fallback;

const resolvePersistableScanUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = readOptionalString(value, PRODUCT_SCAN_URL_MAX_LENGTH);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const resolveIsoAgeMs = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Date.now() - parsed;
};

const resolveScanEngineRunId = (scan: ProductScanRecord): string | null =>
  readOptionalString(scan.engineRunId, 160) ??
  readOptionalString(toRecord(scan.rawResult)?.['runId'], 160);

const parseAmazonScanScriptResult = (value: unknown): AmazonScanScriptResult => {
  const record = toRecord(value);
  const statusValue = readOptionalString(record?.['status']);
  const status =
    statusValue === 'matched' || statusValue === 'no_match' || statusValue === 'failed'
      ? statusValue
      : 'failed';

  return {
    status,
    asin: readOptionalString(record?.['asin'], PRODUCT_SCAN_ASIN_MAX_LENGTH),
    title: readOptionalString(record?.['title'], PRODUCT_SCAN_TITLE_MAX_LENGTH),
    price: readOptionalString(record?.['price'], PRODUCT_SCAN_PRICE_MAX_LENGTH),
    url: readOptionalString(record?.['url'], PRODUCT_SCAN_URL_MAX_LENGTH),
    description: readOptionalString(record?.['description'], PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH),
    matchedImageId: readOptionalString(
      record?.['matchedImageId'],
      PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH
    ),
    message: readOptionalString(record?.['message'], PRODUCT_SCAN_ERROR_MAX_LENGTH),
    currentUrl: readOptionalString(record?.['currentUrl'], PRODUCT_SCAN_URL_MAX_LENGTH),
    stage: readOptionalString(record?.['stage']),
  };
};

const createAmazonProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    provider: 'amazon',
    scanType: 'google_reverse_image',
    status: input.status,
    productName: input.productName,
    engineRunId: null,
    imageCandidates: input.imageCandidates,
    matchedImageId: null,
    asin: null,
    title: null,
    price: null,
    url: null,
    description: null,
    rawResult: null,
    error: input.error ?? null,
    asinUpdateStatus: input.status === 'failed' ? 'not_needed' : 'pending',
    asinUpdateMessage: null,
    createdBy: input.userId?.trim() || null,
    updatedBy: input.userId?.trim() || null,
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
  });

const createFailedBatchResult = (
  productId: string,
  message: string,
  scanId: string | null = null
): ProductAmazonBatchScanItem => ({
  productId,
  scanId,
  runId: null,
  status: 'failed',
  message: readOptionalString(message, PRODUCT_SCAN_BATCH_MESSAGE_MAX_LENGTH),
});

const resolveAlreadyRunningBatchResult = async (
  productId: string
): Promise<ProductAmazonBatchScanItem | null> => {
  const existingActiveScan = await findLatestActiveProductScan({
    productId,
    provider: 'amazon',
  });
  if (!existingActiveScan) {
    return null;
  }

  const synchronized = await synchronizeProductScan(existingActiveScan);
  if (!isProductScanActiveStatus(synchronized.status)) {
    return null;
  }

  return {
    productId,
    scanId: synchronized.id,
    runId: synchronized.engineRunId,
    status: 'already_running',
    message: 'Amazon scan already in progress for this product.',
  };
};

const buildSynchronizedScanRecord = (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): ProductScanRecord =>
  normalizeProductScanRecord({
    ...scan,
    ...updates,
    id: scan.id,
    productId: scan.productId,
  });

const persistSynchronizedScan = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): Promise<ProductScanRecord> => {
  try {
    return (await updateProductScan(scan.id, updates)) ?? buildSynchronizedScanRecord(scan, updates);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'persistSynchronizedScan',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId: scan.engineRunId,
    });
    return buildSynchronizedScanRecord(scan, updates);
  }
};

const persistFailedSynchronization = async (
  scan: ProductScanRecord,
  message: string
): Promise<ProductScanRecord> => {
  const normalizedMessage = normalizeErrorMessage(message, 'Amazon reverse image scan failed.');

  return await persistSynchronizedScan(scan, {
    status: 'failed',
    error: normalizedMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: normalizedMessage,
    completedAt: new Date().toISOString(),
  });
};

export async function synchronizeProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  if (isProductScanTerminalStatus(scan.status)) {
    return scan;
  }

  const engineRunId = resolveScanEngineRunId(scan);

  if (!engineRunId) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (
      ageMs != null &&
      ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS
    ) {
      return await persistFailedSynchronization(
        scan,
        'Amazon scan is missing its Playwright engine run id.'
      );
    }

    return scan;
  }

  try {
    const run = await readPlaywrightEngineRun(engineRunId);
    if (!run) {
      const message = `Playwright engine run ${engineRunId} was not found.`;
      return await persistFailedSynchronization(scan, message);
    }

    if (
      (run.status === 'queued' || run.status === 'running') &&
      (scan.status !== run.status || scan.engineRunId !== engineRunId)
    ) {
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: run.status,
      });
    }

    if (run.status === 'failed') {
      const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
      const failureMessage = normalizeErrorMessage(
        failureMessages[0],
        'Amazon reverse image scan failed.'
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        error: failureMessage,
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (run.status !== 'completed') {
      return scan;
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parseAmazonScanScriptResult(resultValue);

    if (parsedResult.status === 'no_match') {
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'no_match',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        rawResult: resultValue,
        error: parsedResult.message,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: parsedResult.message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (parsedResult.status !== 'matched') {
      const failureMessage = normalizeErrorMessage(
        parsedResult.message || collectPlaywrightEngineRunFailureMessages(run)[0],
        'Amazon reverse image scan failed.'
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        rawResult: resultValue,
        error: failureMessage,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const product = await productService.getProductById(scan.productId);
    if (!product) {
      const message = 'Product not found while finalizing the Amazon scan.';
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: parsedResult.asin,
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const asinOutcome = resolveDetectedAmazonAsinOutcome({
      existingAsin: product.asin,
      detectedAsin: parsedResult.asin,
    });

    let updateFailureMessage: string | null = null;
    if (asinOutcome.asinUpdateStatus === 'updated' && asinOutcome.normalizedDetectedAsin) {
      try {
        await productService.updateProduct(
          product.id,
          { asin: asinOutcome.normalizedDetectedAsin },
          scan.updatedBy ? { userId: scan.updatedBy } : undefined
        );
        CachedProductService.invalidateProduct(product.id);
      } catch (error) {
        updateFailureMessage = normalizeErrorMessage(error instanceof Error ? error.message : error, 'Failed to update product ASIN.');
      }
    }

    const nextStatus = updateFailureMessage ? 'failed' : asinOutcome.scanStatus;
    const nextAsinUpdateStatus = updateFailureMessage ? 'failed' : asinOutcome.asinUpdateStatus;
    const nextMessage = updateFailureMessage ?? asinOutcome.message;

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      asin: asinOutcome.normalizedDetectedAsin,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
      description: parsedResult.description,
      rawResult: resultValue,
      error: nextStatus === 'failed' || nextStatus === 'conflict' ? nextMessage : null,
      asinUpdateStatus: nextAsinUpdateStatus,
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to synchronize Amazon reverse image scan.';
    return await persistFailedSynchronization(scan, message);
  }
}

export async function synchronizeProductScans(
  scans: ProductScanRecord[]
): Promise<ProductScanRecord[]> {
  if (scans.length === 0) {
    return scans;
  }

  return await Promise.all(
    scans.map(async (scan) =>
      isProductScanActiveStatus(scan.status) ? await synchronizeProductScan(scan) : scan
    )
  );
}

export async function listProductScansWithSync(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listProductScans({
      ids: input.ids,
      productId: input.productId,
      productIds: input.productIds,
      limit: input.limit,
    })
  );
}

export async function getProductScanByIdWithSync(
  id: string
): Promise<ProductScanRecord | null> {
  const scan = await getProductScanById(id);
  if (!scan) {
    return null;
  }
  return await synchronizeProductScan(scan);
}

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  const productIds = Array.from(
    new Set(
      input.productIds
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

  const results = await Promise.all(
    productIds.map(async (productId): Promise<ProductAmazonBatchScanItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult(productId);
        if (alreadyRunningResult) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (!product) {
          return createFailedBatchResult(productId, 'Product not found.');
        }

        const imageCandidates = resolveProductScanImageCandidates(product);
        const productName = resolveProductScanDisplayName(product);
        const baseRecord = createAmazonProductScanBaseRecord({
          productId,
          productName,
          userId: input.userId,
          imageCandidates,
          status: imageCandidates.length > 0 ? 'queued' : 'failed',
          error:
            imageCandidates.length > 0
              ? null
              : 'No product image available for Amazon reverse image scan.',
        });

        let savedBaseRecord: ProductScanRecord;
        try {
          savedBaseRecord = await upsertProductScan(baseRecord);
        } catch (error) {
          const recoveredAlreadyRunningResult =
            await resolveAlreadyRunningBatchResult(productId);
          if (recoveredAlreadyRunningResult) {
            return recoveredAlreadyRunningResult;
          }

          throw error;
        }
        if (imageCandidates.length === 0) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ?? 'No product image available for Amazon reverse image scan.',
            savedBaseRecord.id
          );
        }

        try {
          const run = await startPlaywrightEngineTask({
            request: {
              script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
              input: {
                productId: product.id,
                productName,
                existingAsin: product.asin,
                imageCandidates,
              },
              timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
              browserEngine: 'chromium',
              capture: {
                screenshot: true,
                html: true,
              },
              preventNewPages: true,
            },
            ownerUserId: input.userId?.trim() || null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: 'Amazon reverse image ASIN scan',
              tags: ['product', 'amazon', 'scan', 'google-reverse-image'],
            }),
          });

          const queuedRunStatus = run.status === 'running' ? 'running' : 'queued';
          const startedRunRawResult = {
            runId: run.runId,
            status: run.status,
          };

          let saved: ProductScanRecord;
          try {
            saved = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                engineRunId: run.runId,
                status: queuedRunStatus,
                rawResult: startedRunRawResult,
              })
            );
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: 'queueAmazonBatchProductScans.persistRunLink',
              productId,
              scanId: savedBaseRecord.id,
              runId: run.runId,
            });

            try {
              saved = await upsertProductScan(
                normalizeProductScanRecord({
                  ...savedBaseRecord,
                  status: queuedRunStatus,
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      'Failed to persist Amazon scan run link.'
                    ),
                  },
                })
              );
            } catch (fallbackError) {
              void ErrorSystem.captureException(fallbackError, {
                service: 'product-scans.service',
                action: 'queueAmazonBatchProductScans.persistRunFallback',
                productId,
                scanId: savedBaseRecord.id,
                runId: run.runId,
              });

              return createFailedBatchResult(
                productId,
                'Amazon scan started, but the scan record could not be updated with its run link.',
                savedBaseRecord.id
              );
            }
          }

          return {
            productId,
            scanId: saved.id,
            runId: run.runId,
            status: 'queued',
            message: 'Amazon reverse image scan queued.',
          };
        } catch (error) {
          const message = normalizeErrorMessage(
            error instanceof Error ? error.message : error,
            'Failed to enqueue Amazon reverse image scan.'
          );
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: 'queueAmazonBatchProductScans.startRun',
            productId,
          });
          const failed = await upsertProductScan(
            normalizeProductScanRecord({
              ...savedBaseRecord,
              status: 'failed',
              error: message,
              asinUpdateStatus: 'failed',
              asinUpdateMessage: message,
              completedAt: new Date().toISOString(),
            })
          );

          return createFailedBatchResult(productId, message, failed.id);
        }
      } catch (error) {
        const message = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
          'Failed to queue Amazon reverse image scan.'
        );
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: 'queueAmazonBatchProductScans.product',
          productId,
        });
        return createFailedBatchResult(productId, message);
      }
    })
  );

  return {
    queued: results.filter((result) => result.status === 'queued').length,
    alreadyRunning: results.filter((result) => result.status === 'already_running').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}
