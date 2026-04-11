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
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  isProductScanActiveStatus,
  isProductScanTerminalStatus,
  normalizeProductScanRecord,
  productScanStepSchema,
  type ProductAmazonBatchScanItem,
  type ProductAmazonBatchScanResponse,
  type ProductScanRecord,
  type ProductScanStep,
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
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerHeadless,
} from './product-scanner-settings';
import {
  findLatestActiveProductScan,
  getProductScanById,
  listLatestProductScansByProductIds,
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
const PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS = 2;
const PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE =
  'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';

type AmazonScanScriptResult = {
  status: 'matched' | 'no_match' | 'failed' | 'captcha_required' | 'running';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
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

const resolveManualVerificationMessage = (value: unknown): string => {
  const normalized = normalizeErrorMessage(value, PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE);
  return /continue automatically/i.test(normalized)
    ? normalized
    : PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE;
};

const readOptionalPositiveInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
};

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

const resolveScanManualVerificationTimeoutMs = (
  settingsOrRawResult: { manualVerificationTimeoutMs?: unknown } | null | undefined
): number =>
  readOptionalPositiveInt(settingsOrRawResult?.manualVerificationTimeoutMs) ??
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;

const shouldAutoShowScannerCaptchaBrowser = (
  settings: { captchaBehavior?: unknown } | null | undefined
): boolean => settings?.captchaBehavior !== 'fail';

const normalizeParsedProductScanSteps = (value: unknown): ProductScanStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => productScanStepSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
};

const areProductScanStepsEqual = (
  left: ProductScanStep[] | null | undefined,
  right: ProductScanStep[] | null | undefined
): boolean => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);

const resolvePersistedProductScanSteps = (
  scan: Pick<ProductScanRecord, 'steps'>,
  parsedSteps: ProductScanStep[]
): ProductScanStep[] => (parsedSteps.length > 0 ? parsedSteps : scan.steps);

const parseAmazonScanScriptResult = (value: unknown): AmazonScanScriptResult => {
  const record = toRecord(value);
  const statusValue = readOptionalString(record?.['status']);
  const status =
    statusValue === 'matched' ||
    statusValue === 'no_match' ||
    statusValue === 'failed' ||
    statusValue === 'captcha_required' ||
    statusValue === 'running'
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
    steps: normalizeParsedProductScanSteps(record?.['steps']),
  };
};

const buildAmazonScanRequestInput = (input: {
  productId: string;
  productName: string | null;
  existingAsin: string | null | undefined;
  imageCandidates: ProductScanRecord['imageCandidates'];
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
}) => ({
  productId: input.productId,
  productName: input.productName,
  existingAsin: input.existingAsin ?? null,
  imageCandidates: input.imageCandidates,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
});

const createAmazonScanStartedRawResult = (input: {
  runId: string;
  status: string;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  previousRunId?: string | null;
  previousResult?: unknown;
  manualVerificationPending?: boolean;
  manualVerificationMessage?: string | null;
}) => ({
  runId: input.runId,
  status: input.status,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  ...(input.previousRunId ? { previousRunId: input.previousRunId } : {}),
  ...(input.previousResult !== undefined ? { previousResult: input.previousResult } : {}),
  ...(input.manualVerificationPending
    ? {
        manualVerificationPending: true,
        manualVerificationMessage:
          input.manualVerificationMessage ?? PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE,
      }
    : {}),
});

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
  scanId: string | null = null,
  currentStatus: ProductScanRecord['status'] | null = scanId ? 'failed' : null
): ProductAmazonBatchScanItem => ({
  productId,
  scanId,
  runId: null,
  status: 'failed',
  currentStatus,
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
    runId: resolveScanEngineRunId(synchronized),
    status: 'already_running',
    currentStatus: synchronized.status,
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
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS; attempt += 1) {
    try {
      return (
        (await updateProductScan(scan.id, updates)) ?? buildSynchronizedScanRecord(scan, updates)
      );
    } catch (error) {
      lastError = error;
    }
  }

  void ErrorSystem.captureException(lastError, {
    service: 'product-scans.service',
    action: 'persistSynchronizedScan',
    scanId: scan.id,
    productId: scan.productId,
    engineRunId: scan.engineRunId,
  });

  return buildSynchronizedScanRecord(scan, updates);
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

const tryDirectQueuedScanUpdate = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>,
  context: {
    action: string;
    productId: string;
    runId?: string | null;
  }
): Promise<ProductScanRecord | null> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS; attempt += 1) {
    try {
      const updated = await updateProductScan(scan.id, updates);
      if (updated) {
        return updated;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    void ErrorSystem.captureException(lastError, {
      service: 'product-scans.service',
      action: context.action,
      scanId: scan.id,
      productId: context.productId,
      runId: context.runId ?? null,
    });
  }

  return null;
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
    let run;
    try {
      run = await readPlaywrightEngineRun(engineRunId);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.readRun',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
      return scan;
    }

    if (!run) {
      const message = `Playwright engine run ${engineRunId} was not found.`;
      return await persistFailedSynchronization(scan, message);
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parseAmazonScanScriptResult(resultValue);

    if (run.status === 'queued' || run.status === 'running') {
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
        existingRawResult
      );
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const activeMessage =
        parsedResult.status === 'captcha_required'
          ? resolveManualVerificationMessage(parsedResult.message)
          : null;
      const nextRawResult =
        parsedResult.status === 'captcha_required'
          ? {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: true,
              manualVerificationMessage: activeMessage,
              manualVerificationTimeoutMs,
            }
          : {
              ...existingRawResult,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: false,
              manualVerificationMessage: null,
              manualVerificationTimeoutMs,
            };
      const shouldPersistActiveState =
        scan.status !== run.status ||
        scan.engineRunId !== engineRunId ||
        !areProductScanStepsEqual(scan.steps, nextSteps) ||
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (parsedResult.status === 'captcha_required' &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (parsedResult.status !== 'captcha_required' &&
          (existingRawResult['manualVerificationPending'] === true ||
            readOptionalString(existingRawResult['manualVerificationMessage']) != null));

      if (shouldPersistActiveState) {
        return await persistSynchronizedScan(scan, {
          engineRunId,
          status: run.status,
          steps: nextSteps,
          rawResult: nextRawResult,
          error: null,
          asinUpdateStatus: 'pending',
          asinUpdateMessage: activeMessage,
          completedAt: null,
        });
      }

      return scan;
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

    if (parsedResult.status === 'captcha_required') {
      const manualVerificationMessage = resolveManualVerificationMessage(
        parsedResult.message
      );
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);

      if (existingRawResult['captchaRetryStarted'] === true) {
        return await persistFailedSynchronization(
          scan,
          'Google Lens captcha verification was still required after reopening the browser.'
        );
      }

      const product = await productService.getProductById(scan.productId);
      if (!product) {
        return await persistFailedSynchronization(
          scan,
          'Product not found while reopening the Amazon scan for captcha verification.'
        );
      }

      let scannerSettings = createDefaultProductScannerSettings();
      try {
        scannerSettings = await getProductScannerSettings();
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: 'synchronizeProductScan.loadScannerSettingsForCaptchaRetry',
          scanId: scan.id,
          productId: scan.productId,
          engineRunId,
        });
      }

      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
        scannerSettings
      );
      if (!shouldAutoShowScannerCaptchaBrowser(scannerSettings)) {
        return await persistFailedSynchronization(
          scan,
          'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.'
        );
      }

      const claimedScan = await persistSynchronizedScan(scan, {
        engineRunId: null,
        status: 'running',
        steps: nextSteps,
        rawResult: {
          ...existingRawResult,
          ...resultValue,
          previousRunId: engineRunId,
          captchaRetryStarted: true,
          manualVerificationPending: true,
          manualVerificationMessage,
          manualVerificationTimeoutMs,
        },
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: manualVerificationMessage,
        completedAt: null,
      });

      try {
        const scannerEngineRequestOptions =
          buildProductScannerEngineRequestOptions(scannerSettings);
        const runRetry = await startPlaywrightEngineTask({
          request: {
            script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
            input: buildAmazonScanRequestInput({
              productId: product.id,
              productName: claimedScan.productName,
              existingAsin: product.asin,
              imageCandidates: claimedScan.imageCandidates,
              allowManualVerification: true,
              manualVerificationTimeoutMs,
            }),
            timeoutMs: Math.max(
              AMAZON_SCAN_TIMEOUT_MS,
              manualVerificationTimeoutMs + 60_000
            ),
            browserEngine: 'chromium',
            ...scannerEngineRequestOptions,
            settingsOverrides: {
              ...(scannerEngineRequestOptions.settingsOverrides ?? {}),
              headless: false,
            },
            capture: {
              screenshot: true,
              html: true,
            },
            preventNewPages: true,
          },
          ownerUserId: claimedScan.updatedBy?.trim() || null,
          instance: createCustomPlaywrightInstance({
            family: 'scrape',
            label: 'Amazon reverse image ASIN scan',
            tags: ['product', 'amazon', 'scan', 'google-reverse-image', 'manual-verification'],
          }),
        });

        const retryRunStatus = runRetry.status === 'running' ? 'running' : 'queued';
        const retryManualVerificationPending = retryRunStatus === 'running';

        return await persistSynchronizedScan(claimedScan, {
          engineRunId: runRetry.runId,
          status: retryRunStatus,
          steps: claimedScan.steps,
          rawResult: {
            ...toRecord(claimedScan.rawResult),
            ...createAmazonScanStartedRawResult({
              runId: runRetry.runId,
              status: runRetry.status,
              allowManualVerification: true,
              manualVerificationTimeoutMs,
              previousRunId: engineRunId,
              previousResult: resultValue,
              manualVerificationPending: retryManualVerificationPending,
              manualVerificationMessage: retryManualVerificationPending
                ? manualVerificationMessage
                : null,
            }),
            captchaRetryStarted: true,
            ...(retryManualVerificationPending
              ? {
                  manualVerificationPending: true,
                  manualVerificationMessage,
                }
              : {
                  manualVerificationPending: false,
                  manualVerificationMessage: null,
                }),
          },
          error: null,
          asinUpdateStatus: 'pending',
          asinUpdateMessage: retryManualVerificationPending
            ? manualVerificationMessage
            : null,
          completedAt: null,
        });
      } catch (error) {
        const message = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
          'Failed to reopen the Amazon scan in a visible browser for captcha verification.'
        );
        return await persistSynchronizedScan(claimedScan, {
          status: 'failed',
          steps: claimedScan.steps,
          rawResult: {
            ...toRecord(claimedScan.rawResult),
            retryStartError: message,
          },
          error: message,
          asinUpdateStatus: 'failed',
          asinUpdateMessage: message,
          completedAt: new Date().toISOString(),
        });
      }
    }

    if (parsedResult.status === 'no_match') {
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'no_match',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
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
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
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
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
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
      steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
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

export async function listLatestProductScansByProductIdsWithSync(input: {
  productIds: string[];
}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listLatestProductScansByProductIds({
      productIds: input.productIds,
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
  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'queueAmazonBatchProductScans.loadScannerSettings',
    });
  }

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
          const scannerEngineRequestOptions =
            buildProductScannerEngineRequestOptions(scannerSettings);
          const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
            scannerSettings
          );
          const allowManualVerification =
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless;
          const run = await startPlaywrightEngineTask({
            request: {
              script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
              input: buildAmazonScanRequestInput({
                productId: product.id,
                productName,
                existingAsin: product.asin,
                imageCandidates,
                allowManualVerification,
                manualVerificationTimeoutMs,
              }),
              timeoutMs: allowManualVerification
                ? Math.max(
                    AMAZON_SCAN_TIMEOUT_MS,
                    manualVerificationTimeoutMs + 60_000
                  )
                : AMAZON_SCAN_TIMEOUT_MS,
              browserEngine: 'chromium',
              ...scannerEngineRequestOptions,
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
          const startedRunRawResult = createAmazonScanStartedRawResult({
            runId: run.runId,
            status: run.status,
            allowManualVerification,
            manualVerificationTimeoutMs,
          });

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

            const recovered = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                engineRunId: run.runId,
                status: queuedRunStatus,
                rawResult: {
                  ...startedRunRawResult,
                  linkError: normalizeErrorMessage(
                    error instanceof Error ? error.message : error,
                    'Failed to persist Amazon scan run link.'
                  ),
                  fallbackError: normalizeErrorMessage(
                    fallbackError instanceof Error ? fallbackError.message : fallbackError,
                    'Failed to persist Amazon scan run link fallback.'
                  ),
                },
              },
              {
                action: 'queueAmazonBatchProductScans.persistRunFallbackUpdate',
                productId,
                runId: run.runId,
              }
            );
            if (recovered) {
              return {
                productId,
                scanId: recovered.id,
                runId: run.runId,
                status: queuedRunStatus,
                currentStatus: queuedRunStatus,
                message:
                  queuedRunStatus === 'running'
                    ? 'Amazon reverse image scan running.'
                    : 'Amazon reverse image scan queued.',
              };
            }

            const failureMessage =
              'Amazon scan started, but the scan record could not be updated with its run link.';
            const failedRecord = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                status: 'failed',
                rawResult: {
                  ...startedRunRawResult,
                  linkError: normalizeErrorMessage(
                    error instanceof Error ? error.message : error,
                    'Failed to persist Amazon scan run link.'
                  ),
                  fallbackError: normalizeErrorMessage(
                    fallbackError instanceof Error ? fallbackError.message : fallbackError,
                    'Failed to persist Amazon scan run link fallback.'
                  ),
                },
                error: failureMessage,
                asinUpdateStatus: 'failed',
                asinUpdateMessage: failureMessage,
                completedAt: new Date().toISOString(),
              },
              {
                action: 'queueAmazonBatchProductScans.persistRunFallbackFailed',
                productId,
                runId: run.runId,
              }
            );

            return createFailedBatchResult(
              productId,
              failureMessage,
              failedRecord?.id ?? savedBaseRecord.id
            );
          }
        }

          return {
            productId,
            scanId: saved.id,
            runId: run.runId,
            status: queuedRunStatus,
            currentStatus: queuedRunStatus,
            message:
              queuedRunStatus === 'running'
                ? 'Amazon reverse image scan running.'
                : 'Amazon reverse image scan queued.',
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
          let failed: ProductScanRecord;
          try {
            failed = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                status: 'failed',
                error: message,
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              })
            );
          } catch (persistFailureError) {
            void ErrorSystem.captureException(persistFailureError, {
              service: 'product-scans.service',
              action: 'queueAmazonBatchProductScans.persistStartRunFailure',
              productId,
              scanId: savedBaseRecord.id,
            });

            const failedRecord = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                status: 'failed',
                error: message,
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              },
              {
                action: 'queueAmazonBatchProductScans.persistStartRunFailureUpdate',
                productId,
              }
            );

            return createFailedBatchResult(
              productId,
              message,
              failedRecord?.id ?? savedBaseRecord.id
            );
          }

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
    running: results.filter((result) => result.status === 'running').length,
    alreadyRunning: results.filter((result) => result.status === 'already_running').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}
