import 'server-only';

import { randomUUID } from 'crypto';

import {
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  startPlaywrightConnectionEngineTask,
  startPlaywrightEngineTask,
  type ResolvedPlaywrightConnectionRuntime,
} from '@/features/playwright/server';
import {
  get1688DefaultConnectionId,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  isProductScanActiveStatus,
  type ProductAmazonBatchScanItem,
  type ProductAmazonBatchScanResponse,
  type ProductScanBatchResponse,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScanner1688CandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
  resolveProductScannerHeadless,
} from './product-scanner-settings';
import {
  findLatestActiveProductScan,
  upsertProductScan,
} from './product-scans-repository';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  toRecord,
  readOptionalString,
  hydrateProductScanImageCandidates,
  sanitizeProductScanImageCandidates,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  createAmazonScanStartedRawResult,
  createFailedBatchResult,
  resolveProductScanRequestSequenceInput,
  resolveScanEngineRunId,
  tryDirectQueuedScanUpdate,
} from './product-scans-service.helpers';
import {
  AMAZON_BATCH_SCAN_START_CONCURRENCY,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchProvider,
} from './product-scans-service.helpers.amazon';

import {
  SCANNER_1688_MISSING_PROFILE_MESSAGE,
  resolve1688ConnectionEngineSettings,
} from './product-scans-sync-1688';

type BatchScanQueueConfig = {
  provider: 'amazon' | '1688';
  runtime: ProductScanProviderRuntime;
  actionPrefix: string;
  alreadyRunningMessage: string;
  resultStatusLabel: string;
};

const AMAZON_QUEUE_CONFIG: BatchScanQueueConfig = {
  provider: 'amazon',
  runtime: AMAZON_PRODUCT_SCAN_PROVIDER.runtime!,
  actionPrefix: 'queueAmazonBatchProductScans',
  alreadyRunningMessage: 'Amazon reverse image scan is already running for this product.',
  resultStatusLabel: 'Amazon scan queued',
};

const SUPPLIER_1688_QUEUE_CONFIG: BatchScanQueueConfig = {
  provider: '1688',
  runtime: getProductScanProviderDefinition('1688').runtime!,
  actionPrefix: 'queue1688BatchProductScans',
  alreadyRunningMessage: '1688 supplier scan is already running for this product.',
  resultStatusLabel: '1688 supplier scan queued',
};

async function resolveAlreadyRunningBatchResult(input: {
  productId: string;
  provider: 'amazon' | '1688';
  alreadyRunningMessage: string;
  resultStatusLabel: string;
}): Promise<ProductAmazonBatchScanItem | null> {
  const latestScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });

  if (latestScan && isProductScanActiveStatus(latestScan.status)) {
    let currentStatus = latestScan.status;
    const runId = resolveScanEngineRunId(latestScan);
    if (runId) {
      try {
        const run = await readPlaywrightEngineRun(runId);
        if (run?.status === 'queued' || run?.status === 'running') {
          currentStatus = run.status;
          if (latestScan.status !== run.status) {
            await tryDirectQueuedScanUpdate(
              latestScan,
              {
                engineRunId: run.runId,
                status: run.status,
                error: null,
                asinUpdateStatus: 'pending',
                asinUpdateMessage: null,
                completedAt: null,
              },
              {
                action: `queue${input.provider}BatchProductScans.syncAlreadyRunning`,
                productId: input.productId,
                runId: run.runId,
              }
            );
          }
        }
      } catch {
        currentStatus = latestScan.status;
      }
    }

    const runningMessage =
      input.provider === '1688'
        ? '1688 supplier scan running.'
        : 'Amazon reverse image scan running.';
    const queuedMessage =
      input.provider === '1688'
        ? '1688 supplier scan already in progress for this product.'
        : 'Amazon scan already in progress for this product.';
    return {
      productId: input.productId,
      scanId: latestScan.id,
      runId,
      status: 'already_running',
      currentStatus,
      message: currentStatus === 'running' ? runningMessage : queuedMessage,
    };
  }

  return null;
}

async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += limit) {
    batches.push(items.slice(i, i + limit));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (!batch) continue;
    const batchResults = await Promise.all(
      batch.map((item, index) => fn(item, i * limit + index))
    );
    results.push(...batchResults);
  }

  return results;
}

const resolveConnectionByIdCompat = async (input: {
  connectionId: string;
  repository: any;
}) => {
  if (typeof input.repository?.getConnectionById === 'function') {
    return await input.repository.getConnectionById(input.connectionId);
  }
  if (typeof input.repository?.listConnections === 'function') {
    const connections = await input.repository.listConnections();
    return Array.isArray(connections)
      ? connections.find((connection) => connection?.id === input.connectionId) ?? null
      : null;
  }
  return null;
};

const resolveStartedRun = (
  value: unknown
): {
  runId: string;
  status: 'queued' | 'running';
} | null => {
  const record = toRecord(value);
  const runRecord = toRecord(record?.['run']) ?? record;
  const runId = typeof runRecord?.['runId'] === 'string' ? runRecord['runId'] : null;
  const statusValue = runRecord?.['status'];
  const status =
    statusValue === 'running' || statusValue === 'queued' ? statusValue : null;
  return runId && status ? { runId, status } : null;
};

async function queueBatchProductScans(input: {
  productIds: string[];
  config: BatchScanQueueConfig;
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  const productIds = Array.from(new Set(input.productIds));
  if (productIds.length === 0) {
    return { queued: 0, running: 0, alreadyRunning: 0, failed: 0, results: [] };
  }

  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  try {
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

  const supplierConnectionContext =
    input.config.provider === '1688'
      ? await get1688DefaultConnectionId()
          .then(async (connectionId) => {
            if (!connectionId) return null;
            const repository = await getIntegrationRepository();
            const connection = await resolveConnectionByIdCompat({
              connectionId,
              repository,
            });
            return connection ? { integrationId: connection.integrationId, connection } : null;
          })
          .catch((error) => {
            void ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.resolve1688Connection`,
            });
            return null;
          })
      : null;

  const results = await mapWithConcurrencyLimit(
    productIds,
    AMAZON_BATCH_SCAN_START_CONCURRENCY,
    async (productId, _batchIndex): Promise<ProductAmazonBatchScanItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult({
          productId,
          provider: input.config.provider,
          alreadyRunningMessage: input.config.alreadyRunningMessage,
          resultStatusLabel: input.config.resultStatusLabel,
        });
        if (alreadyRunningResult) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (!product) {
          return createFailedBatchResult(productId, 'Product not found.');
        }

        const hydratedImageCandidates = await hydrateProductScanImageCandidates({
          product,
          imageCandidates: input.config.runtime.resolveImageCandidates(product),
        });
        const allow1688UrlImageSearchFallback =
          input.config.provider === '1688'
            ? (
                supplierConnectionContext?.connection?.scanner1688AllowUrlImageSearchFallback ??
                scannerSettings.scanner1688?.allowUrlImageSearchFallback
              ) !== false
            : true;
        const imageCandidates = await sanitizeProductScanImageCandidates(
          hydratedImageCandidates,
          {
            materializeUrlCandidates: input.config.provider === '1688',
            requireLocalFile:
              input.config.provider === '1688' && !allow1688UrlImageSearchFallback,
          }
        );

        if (imageCandidates.length === 0) {
          return createFailedBatchResult(productId, 'No usable product images for scanning.');
        }

        if (input.config.provider === '1688' && !supplierConnectionContext) {
          return createFailedBatchResult(productId, SCANNER_1688_MISSING_PROFILE_MESSAGE);
        }

        if (
          input.config.provider === '1688' &&
          !readOptionalString(supplierConnectionContext?.connection?.playwrightStorageState)
        ) {
          return createFailedBatchResult(
            productId,
            `1688 login required for profile ${supplierConnectionContext?.connection?.name ?? 'Unknown profile'}. Refresh the saved browser session before scanning.`
          );
        }

        const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(
          input.requestInput
        );
        const scannerEngineRequestOptions =
          buildProductScannerEngineRequestOptions(scannerSettings);
        const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
          scannerSettings
        );

        let run;
        if (input.config.provider === 'amazon') {
          const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
            scannerSettings,
            scannerEngineRequestOptions,
          });
          const imageSearchProvider =
            resolveAmazonImageSearchProvider(input.requestInput, scannerSettings);
          run = await startPlaywrightEngineTask({
            request: {
              script: input.config.runtime.script,
              input: input.config.runtime.buildRequestInput({
                productId: product.id,
                productName: product.name['pl'] || product.name['en'] || '',
                existingAsin: product.asin,
                imageCandidates,
                imageSearchProvider,
                allowManualVerification:
                  shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                manualVerificationTimeoutMs,
                triageOnlyOnAmazonCandidates:
                  (await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(
                    scannerSettings
                  )).enabled,
                probeOnlyOnAmazonMatch:
                  (await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(
                    scannerSettings
                  )).enabled,
                ...requestedStepSequenceInput,
              }),
              timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
              browserEngine: 'chromium',
              ...scannerRuntimeOptions,
              capture: {
                screenshot: true,
                html: true,
              },
              preventNewPages: true,
            },
            ownerUserId: input.ownerUserId ?? null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: 'Amazon product scan',
              tags: ['product', 'amazon', 'scan', 'batch'],
            }),
          });
        } else {
          run = await startPlaywrightConnectionEngineTask({
            connection: supplierConnectionContext!.connection,
            request: {
              script: input.config.runtime.script,
              input: input.config.runtime.buildRequestInput({
                productId: product.id,
                productName: product.name['pl'] || product.name['en'] || '',
                imageCandidates,
                integrationId: supplierConnectionContext!.integrationId,
                connectionId: supplierConnectionContext!.connection.id,
                scanner1688StartUrl:
                  supplierConnectionContext!.connection.scanner1688StartUrl ?? null,
                scanner1688LoginMode:
                  supplierConnectionContext!.connection.scanner1688LoginMode ?? null,
                scanner1688DefaultSearchMode:
                  supplierConnectionContext!.connection.scanner1688DefaultSearchMode ?? null,
                candidateResultLimit:
                  supplierConnectionContext!.connection.scanner1688CandidateResultLimit ?? null,
                minimumCandidateScore:
                  supplierConnectionContext!.connection.scanner1688MinimumCandidateScore ?? null,
                maxExtractedImages:
                  supplierConnectionContext!.connection.scanner1688MaxExtractedImages ?? null,
                allowUrlImageSearchFallback:
                  supplierConnectionContext!.connection.scanner1688AllowUrlImageSearchFallback ??
                  scannerSettings.scanner1688?.allowUrlImageSearchFallback ??
                  true,
                manualVerificationTimeoutMs,
                evaluatorConfig: await resolveProductScanner1688CandidateEvaluatorConfig(
                  scannerSettings
                ),
                ...requestedStepSequenceInput,
              }),
              timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
              capture: {
                screenshot: true,
                html: true,
              },
              preventNewPages: true,
            },
            resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => ({
              browserPreference: runtime.browserPreference ?? null,
              settings: resolve1688ConnectionEngineSettings(
                {
                  ...toRecord(runtime?.settings),
                  ...toRecord(supplierConnectionContext?.connection?.settings),
                },
                { forceVisible: input.forceVisible ?? false }
              ),
            }),
            ownerUserId: input.ownerUserId ?? null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: '1688 product scan',
              tags: ['product', '1688', 'scan', 'batch'],
              connectionId: supplierConnectionContext!.connection.id,
              integrationId: supplierConnectionContext!.integrationId,
            }),
          });
        }

        const startedRun = resolveStartedRun(run);
        if (!startedRun) {
          return createFailedBatchResult(productId, 'Failed to queue scan.');
        }

        const scan = await upsertProductScan({
          id: randomUUID(),
          productId,
          provider: input.config.provider,
          scanType: 'supplier_reverse_image',
          status: startedRun.status,
          engineRunId: startedRun.runId,
          productName: product.name['pl'] || product.name['en'] || '',
          asin: product.asin,
          imageCandidates,
          asinUpdateStatus: 'pending',

          asinUpdateMessage:
            startedRun.status === 'running' ? 'Product scan running.' : 'Product scan queued.',
          rawResult: createAmazonScanStartedRawResult({
            runId: startedRun.runId,
            status: startedRun.status,
            imageSearchProvider:
              input.config.provider === 'amazon'
                ? (resolveAmazonImageSearchProvider(input.requestInput, scannerSettings) ?? 'google_images_upload')
                : 'google_images_upload',
            allowManualVerification: shouldAutoShowScannerCaptchaBrowser(scannerSettings),
            manualVerificationTimeoutMs,
            ...requestedStepSequenceInput,
          }),
          updatedBy: input.ownerUserId ?? null,
        });

        return {
          productId,
          scanId: scan.id,
          runId: startedRun.runId,
          status: startedRun.status,
          currentStatus: startedRun.status,
          message:
            startedRun.status === 'running'
              ? `${input.config.provider === '1688' ? '1688 supplier' : 'Amazon reverse image'} scan running.`
              : `${input.config.provider === '1688' ? '1688 supplier' : 'Amazon reverse image'} scan queued.`,
        };
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: `${input.config.actionPrefix}.item`,
          productId,
        });
        return createFailedBatchResult(productId, 'Failed to queue scan.');
      }
    }
  );

  return {
    queued: results.filter((r) => r.status === 'queued').length,
    running: results.filter((r) => r.status === 'running').length,
    alreadyRunning: results.filter((r) => r.status === 'already_running').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  return await queueBatchProductScans({
    productIds: input.productIds,
    config: AMAZON_QUEUE_CONFIG,
    requestInput: input.requestInput,
    ownerUserId: input.ownerUserId,
  });
}

export async function queue1688BatchProductScans(input: {
  productIds: string[];
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
}): Promise<ProductScanBatchResponse> {
  return await queueBatchProductScans({
    productIds: input.productIds,
    config: SUPPLIER_1688_QUEUE_CONFIG,
    forceVisible: input.forceVisible,
    requestInput: input.requestInput,
    ownerUserId: input.ownerUserId,
  });
}
