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

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseAmazonScanScriptResult = (value: unknown): AmazonScanScriptResult => {
  const record = toRecord(value);
  const statusValue = readOptionalString(record?.['status']);
  const status =
    statusValue === 'matched' || statusValue === 'no_match' || statusValue === 'failed'
      ? statusValue
      : 'failed';

  return {
    status,
    asin: readOptionalString(record?.['asin']),
    title: readOptionalString(record?.['title']),
    price: readOptionalString(record?.['price']),
    url: readOptionalString(record?.['url']),
    description: readOptionalString(record?.['description']),
    matchedImageId: readOptionalString(record?.['matchedImageId']),
    message: readOptionalString(record?.['message']),
    currentUrl: readOptionalString(record?.['currentUrl']),
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
  message,
});

export async function synchronizeProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  if (!scan.engineRunId || isProductScanTerminalStatus(scan.status)) {
    return scan;
  }

  const run = await readPlaywrightEngineRun(scan.engineRunId);
  if (!run) {
    const message = `Playwright engine run ${scan.engineRunId} was not found.`;
    return (
      (await updateProductScan(scan.id, {
        status: 'failed',
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: new Date().toISOString(),
      })) ?? scan
    );
  }

  if ((run.status === 'queued' || run.status === 'running') && scan.status !== run.status) {
    return (
      (await updateProductScan(scan.id, {
        status: run.status,
      })) ?? scan
    );
  }

  if (run.status === 'failed') {
    const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
    return (
      (await updateProductScan(scan.id, {
        status: 'failed',
        error: failureMessages[0] ?? 'Amazon reverse image scan failed.',
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessages[0] ?? 'Amazon reverse image scan failed.',
        completedAt: run.completedAt ?? new Date().toISOString(),
      })) ?? scan
    );
  }

  if (run.status !== 'completed') {
    return scan;
  }

  const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
  const parsedResult = parseAmazonScanScriptResult(resultValue);

  if (parsedResult.status === 'no_match') {
    return (
      (await updateProductScan(scan.id, {
        status: 'no_match',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: parsedResult.url ?? parsedResult.currentUrl ?? finalUrl,
        description: parsedResult.description,
        rawResult: resultValue,
        error: parsedResult.message,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: parsedResult.message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      })) ?? scan
    );
  }

  if (parsedResult.status !== 'matched') {
    const failureMessage =
      parsedResult.message ||
      collectPlaywrightEngineRunFailureMessages(run)[0] ||
      'Amazon reverse image scan failed.';
    return (
      (await updateProductScan(scan.id, {
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: parsedResult.url ?? parsedResult.currentUrl ?? finalUrl,
        description: parsedResult.description,
        rawResult: resultValue,
        error: failureMessage,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      })) ?? scan
    );
  }

  const product = await productService.getProductById(scan.productId);
  if (!product) {
    const message = 'Product not found while finalizing the Amazon scan.';
    return (
      (await updateProductScan(scan.id, {
        status: 'failed',
        asin: parsedResult.asin,
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: parsedResult.url ?? parsedResult.currentUrl ?? finalUrl,
        description: parsedResult.description,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      })) ?? scan
    );
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
      updateFailureMessage =
        error instanceof Error ? error.message : 'Failed to update product ASIN.';
    }
  }

  const nextStatus = updateFailureMessage ? 'failed' : asinOutcome.scanStatus;
  const nextAsinUpdateStatus = updateFailureMessage ? 'failed' : asinOutcome.asinUpdateStatus;
  const nextMessage = updateFailureMessage ?? asinOutcome.message;

  return (
    (await updateProductScan(scan.id, {
      status: nextStatus,
      asin: asinOutcome.normalizedDetectedAsin,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: parsedResult.url ?? parsedResult.currentUrl ?? finalUrl,
      description: parsedResult.description,
      rawResult: resultValue,
      error: nextStatus === 'failed' || nextStatus === 'conflict' ? nextMessage : null,
      asinUpdateStatus: nextAsinUpdateStatus,
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    })) ?? scan
  );
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
        const existingActiveScan = await findLatestActiveProductScan({
          productId,
          provider: 'amazon',
        });
        if (existingActiveScan) {
          const synchronized = await synchronizeProductScan(existingActiveScan);
          if (isProductScanActiveStatus(synchronized.status)) {
            return {
              productId,
              scanId: synchronized.id,
              runId: synchronized.engineRunId,
              status: 'already_running',
              message: 'Amazon scan already in progress for this product.',
            };
          }
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

        const savedBaseRecord = await upsertProductScan(baseRecord);
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

          const saved = await upsertProductScan(
            normalizeProductScanRecord({
              ...savedBaseRecord,
              engineRunId: run.runId,
              status: run.status === 'running' ? 'running' : 'queued',
              rawResult: {
                runId: run.runId,
                status: run.status,
              },
            })
          );

          return {
            productId,
            scanId: saved.id,
            runId: run.runId,
            status: 'queued',
            message: 'Amazon reverse image scan queued.',
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to enqueue Amazon reverse image scan.';
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
        const message =
          error instanceof Error ? error.message : 'Failed to queue Amazon reverse image scan.';
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
