import 'server-only';

import { randomUUID } from 'crypto';

import {
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  startPlaywrightConnectionEngineTask,
  startPlaywrightEngineTask,
  type ResolvedPlaywrightConnectionRuntime,
} from '@/features/playwright/server';
import { extractIntegrationConnectionPlaywrightSettingsOverrides } from '@/features/playwright/server/connection-settings-shared';
import {
  get1688DefaultConnectionId,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  resolveSupplier1688SelectorRegistryNativeRuntime,
  toSupplier1688SelectorRegistryResolutionSummary,
} from '@/features/integrations/services/supplier-1688-selector-registry';
import type {
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  isProductScanActiveStatus,
  type ProductScanBatchItem,
  type ProductScanBatchResponse,
} from '@/shared/contracts/product-scans';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
  requireProductScanNativeRuntime,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScanner1688CandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';
import {
  findLatestActiveProductScan,
  upsertProductScan,
} from './product-scans-repository';

import {
  PRODUCT_SCAN_TIMEOUT_MS,
  toRecord,
  readOptionalString,
  hydrateProductScanImageCandidates,
  sanitizeProductScanImageCandidates,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  createProductScanStartedRawResult,
  createFailedBatchResult,
  resolveProductScanRequestSequenceInput,
  resolveScanEngineRunId,
  tryDirectQueuedScanUpdate,
} from './product-scans-service.helpers';
import {
  PRODUCT_SCAN_BATCH_START_CONCURRENCY,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonScanRuntimeTimeoutMs,
} from './product-scans-service.helpers.amazon';

import {
  SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE,
  SCANNER_1688_MISSING_PROFILE_MESSAGE,
  resolve1688ConnectionEngineSettings,
} from './product-scans-sync-1688';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeActionName,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution';

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
  alreadyRunningMessage: 'Amazon candidate search is already running for this product.',
  resultStatusLabel: 'Amazon candidate search queued',
};

const SUPPLIER_1688_QUEUE_CONFIG: BatchScanQueueConfig = {
  provider: '1688',
  runtime: getProductScanProviderDefinition('1688').runtime!,
  actionPrefix: 'queue1688BatchProductScans',
  alreadyRunningMessage: '1688 supplier scan is already running for this product.',
  resultStatusLabel: '1688 supplier scan queued',
};

const AMAZON_RUNTIME_KEYS = new Set<string>([
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
]);

const resolveAmazonRuntimeKey = (
  value: unknown
): typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY =>
  typeof value === 'string' && AMAZON_RUNTIME_KEYS.has(value)
    ? (value as
        | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
        | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
        | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY)
    : AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;

const resolveQueuedProductName = (product: {
  name?: unknown;
  name_pl?: unknown;
  name_en?: unknown;
}): string => {
  const localizedName = toRecord(product.name);
  return (
    readOptionalString(localizedName?.['pl'], 500) ??
    readOptionalString(localizedName?.['en'], 500) ??
    readOptionalString(product.name_pl, 500) ??
    readOptionalString(product.name_en, 500) ??
    ''
  );
};

async function resolveAlreadyRunningBatchResult(input: {
  productId: string;
  provider: 'amazon' | '1688';
  alreadyRunningMessage: string;
  resultStatusLabel: string;
}): Promise<ProductScanBatchItem | null> {
  const latestScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });

  if (latestScan === null || !isProductScanActiveStatus(latestScan.status)) {
    return null;
  }

  let currentStatus = latestScan.status;
  const runId = resolveScanEngineRunId(latestScan);
  if (runId !== null) {
    try {
      const run = await readPlaywrightEngineRun(runId);
      if (run !== null && (run.status === 'queued' || run.status === 'running')) {
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
            }
          );
        }
      }
    } catch {
      // Keep current status if run cannot be read
    }
  }

  const runningMessage =
    input.provider === '1688'
      ? '1688 supplier scan running.'
      : 'Amazon candidate search running.';
  const queuedMessage =
    input.provider === '1688'
      ? '1688 supplier scan already in progress for this product.'
      : 'Amazon candidate search already in progress for this product.';

  return {
    productId: input.productId,
    scanId: latestScan.id,
    runId,
    status: 'already_running',
    currentStatus,
    message: currentStatus === 'running' ? runningMessage : queuedMessage,
  };
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
  repository: IntegrationRepository;
}): Promise<IntegrationConnectionRecord | null> => {
  if (typeof input.repository.getConnectionById === 'function') {
    return await input.repository.getConnectionById(input.connectionId);
  }
  if (typeof input.repository.listConnections === 'function') {
    const connections = (await input.repository.listConnections(''));
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
  return (runId !== null && status !== null) ? { runId, status } : null;
};

async function queueBatchProductScans(input: {
  productIds: string[];
  config: BatchScanQueueConfig;
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
}): Promise<ProductScanBatchResponse> {
  const productIds = Array.from(new Set(input.productIds));
  if (productIds.length === 0) {
    return { queued: 0, running: 0, alreadyRunning: 0, failed: 0, results: [] };
  }
  const requestInput = input.requestInput ?? {};
  const requested1688ConnectionId =
    input.config.provider === '1688'
      ? readOptionalString(requestInput['connectionId'], 160)
      : null;

  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

  const supplierConnectionContext: {
    integrationId: string;
    connection: IntegrationConnectionRecord;
  } | null =
    input.config.provider === '1688'
      ? await (
          requested1688ConnectionId !== null
            ? Promise.resolve(requested1688ConnectionId)
            : get1688DefaultConnectionId()
        )
          .then(async (connectionId) => {
            if (connectionId === null || connectionId === '') return null;
            const repository = await getIntegrationRepository();
            const connection = await resolveConnectionByIdCompat({
              connectionId,
              repository,
            });
            return connection !== null ? { integrationId: connection.integrationId, connection } : null;
          })
          .catch(async (error) => {
            await ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.resolve1688Connection`,
            });
            return null;
          })
      : null;

  const results = await mapWithConcurrencyLimit(
    productIds,
    PRODUCT_SCAN_BATCH_START_CONCURRENCY,
    async (productId, _batchIndex): Promise<ProductScanBatchItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult({
          productId,
          provider: input.config.provider,
          alreadyRunningMessage: input.config.alreadyRunningMessage,
          resultStatusLabel: input.config.resultStatusLabel,
        });
        if (alreadyRunningResult !== null) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (product === null) {
          return createFailedBatchResult(productId, 'Product not found.');
        }
        const productName = resolveQueuedProductName(product);

        const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(requestInput);
        const amazonRuntimeKey =
          input.config.provider === 'amazon'
            ? resolveAmazonRuntimeKey(
                requestInput['runtimeKey'] ?? input.config.runtime.runtimeKey
              )
            : null;
        const hasDirectAmazonCandidateInput =
          input.config.provider === 'amazon' &&
          (
            readOptionalString(requestInput['directAmazonCandidateUrl'], 4_000) !== null ||
            (
              Array.isArray(requestInput['directAmazonCandidateUrls']) &&
              requestInput['directAmazonCandidateUrls'].some(
                (value) => readOptionalString(value, 4_000) !== null
              )
            )
          );

        const hydratedImageCandidates = await hydrateProductScanImageCandidates({
          product,
          imageCandidates: input.config.runtime.resolveImageCandidates(product),
        });

        const connection = supplierConnectionContext?.connection;
        const allow1688UrlImageSearchFallback =
          input.config.provider === '1688'
            ? (
                (connection?.scanner1688AllowUrlImageSearchFallback ??
                scannerSettings.scanner1688?.allowUrlImageSearchFallback) ?? true
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

        if (imageCandidates.length === 0 && !hasDirectAmazonCandidateInput) {
          let missingImageMessage = 'No usable product images for scanning.';
          if (input.config.provider === 'amazon') {
            missingImageMessage = 'No usable product images for Amazon candidate search.';
          } else if (input.config.provider === '1688') {
            missingImageMessage = SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE;
          }
          return createFailedBatchResult(productId, missingImageMessage);
        }

        if (input.config.provider === '1688' && supplierConnectionContext === null) {
          return createFailedBatchResult(productId, SCANNER_1688_MISSING_PROFILE_MESSAGE);
        }

        const playwrightStorageState = readOptionalString(connection?.playwrightStorageState);
        if (
          input.config.provider === '1688' &&
          (playwrightStorageState === null || playwrightStorageState === '')
        ) {
          return createFailedBatchResult(
            productId,
            `1688 login required for profile ${connection?.name ?? 'Unknown profile'}. Refresh the saved browser session before scanning.`
          );
        }

        const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(amazonRuntimeKey);
        const amazonSelectorProfile =
          input.config.provider === 'amazon' &&
          typeof requestInput['selectorProfile'] === 'string' &&
          requestInput['selectorProfile'].trim().length > 0
            ? requestInput['selectorProfile'].trim()
            : 'amazon';
        const scannerEngineRequestOptions =
          buildProductScannerEngineRequestOptions(scannerSettings);
        const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
          scannerSettings
        );

        let run;
        if (input.config.provider === 'amazon') {
          if (input.config.runtime.executionMode !== 'native') {
            return createFailedBatchResult(productId, 'Scanner runtime is not configured.');
          }

          const shouldAutoShowCaptchaBrowser =
            shouldAutoShowScannerCaptchaBrowser(scannerSettings);
          const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
            scannerSettings,
            scannerEngineRequestOptions,
            actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
            actionPersonaId: amazonRuntimeAction?.personaId ?? null,
          });
          const imageSearchProvider =
            resolveAmazonImageSearchProvider(requestInput, scannerSettings);
          const imageSearchPageUrl =
            resolveAmazonImageSearchPageUrl(requestInput, scannerSettings);
          const triageEvaluatorEnabled = (
            await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings)
          ).enabled;
          const probeEvaluatorEnabled = (
            await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
          ).enabled;
          const isCandidateSearchRuntime =
            amazonRuntimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY;
          const isCandidateExtractionRuntime =
            amazonRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;
          run = await startPlaywrightEngineTask({
            request: {
              runtimeKey: amazonRuntimeKey ?? AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
              actionId: amazonRuntimeAction?.id ?? null,
              actionName:
                amazonRuntimeAction?.name ??
                resolveAmazonRuntimeActionName(amazonRuntimeKey),
              selectorProfile: amazonSelectorProfile,
              input: input.config.runtime.buildRequestInput({
                productId: product.id,
                productName,
                existingAsin: product.asin,
                imageCandidates,
                runtimeKey: amazonRuntimeKey,
                imageSearchProvider,
                imageSearchPageUrl,
                selectorProfile: amazonSelectorProfile,
                allowManualVerification:
                  shouldAutoShowCaptchaBrowser,
                manualVerificationTimeoutMs,
                triageOnlyOnAmazonCandidates:
                  isCandidateSearchRuntime || isCandidateExtractionRuntime
                    ? false
                    : triageEvaluatorEnabled,
                collectAmazonCandidatePreviews: isCandidateSearchRuntime,
                probeOnlyOnAmazonMatch:
                  isCandidateSearchRuntime || isCandidateExtractionRuntime
                    ? false
                    : probeEvaluatorEnabled,
                skipAmazonProbe:
                  requestInput['skipAmazonProbe'] === true,
                directAmazonCandidateUrl:
                  typeof requestInput['directAmazonCandidateUrl'] === 'string'
                    ? requestInput['directAmazonCandidateUrl']
                    : null,
                directAmazonCandidateUrls:
                  Array.isArray(requestInput['directAmazonCandidateUrls'])
                    ? (requestInput['directAmazonCandidateUrls'] as string[])
                    : null,
                directMatchedImageId:
                  typeof requestInput['directMatchedImageId'] === 'string'
                    ? requestInput['directMatchedImageId']
                    : null,
                directAmazonCandidateRank:
                  typeof requestInput['directAmazonCandidateRank'] === 'number'
                    ? requestInput['directAmazonCandidateRank']
                    : null,
                ...requestedStepSequenceInput,
              }),
              timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
                allowManualVerification: shouldAutoShowCaptchaBrowser,
                manualVerificationTimeoutMs,
              }),
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
        } else if (supplierConnectionContext !== null) {
          const supplier1688Runtime = requireProductScanNativeRuntime(
            getProductScanProviderDefinition('1688')
          );
          const { integrationId, connection: supplierConnection } = supplierConnectionContext;
          const supplier1688RuntimeAction = getPlaywrightRuntimeActionSeed(
            SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
          );
          const selectorNativeRuntimeResolution = await resolveSupplier1688SelectorRegistryNativeRuntime({
            profile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
          }).catch(async (error) => {
            await ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.resolve1688SelectorRegistryRuntime`,
                      productId,
            });
            return null;
          });
          run = await startPlaywrightConnectionEngineTask({
            connection: supplierConnection,
            request: {
              runtimeKey: supplier1688Runtime.runtimeKey,
              actionId: supplier1688RuntimeAction?.id ?? null,
              actionName: supplier1688RuntimeAction?.name ?? '1688 Supplier Probe Scan',
              selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
              input: supplier1688Runtime.buildRequestInput({
                productId: product.id,
                productName,
                imageCandidates,
                integrationId,
                connectionId: supplierConnection.id,
                actionId: supplier1688RuntimeAction?.id ?? null,
                actionName: supplier1688RuntimeAction?.name ?? '1688 Supplier Probe Scan',
                action: supplier1688RuntimeAction,
                blocks: supplier1688RuntimeAction?.blocks ?? [],
                runtimeKey: supplier1688Runtime.runtimeKey,
                selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
                selectorRegistryResolution: toSupplier1688SelectorRegistryResolutionSummary(
                  selectorNativeRuntimeResolution
                ),
                selectorRuntime: selectorNativeRuntimeResolution?.selectorRuntime ?? null,
                scanner1688StartUrl:
                  supplierConnection.scanner1688StartUrl ?? null,
                scanner1688LoginMode:
                  supplierConnection.scanner1688LoginMode ?? null,
                scanner1688DefaultSearchMode:
                  supplierConnection.scanner1688DefaultSearchMode ?? null,
                candidateResultLimit:
                  supplierConnection.scanner1688CandidateResultLimit ?? null,
                minimumCandidateScore:
                  supplierConnection.scanner1688MinimumCandidateScore ?? null,
                maxExtractedImages:
                  supplierConnection.scanner1688MaxExtractedImages ?? null,
                allowUrlImageSearchFallback:
                  supplierConnection.scanner1688AllowUrlImageSearchFallback ??
                  scannerSettings.scanner1688?.allowUrlImageSearchFallback ??
                  true,
                manualVerificationTimeoutMs,
                evaluatorConfig: await resolveProductScanner1688CandidateEvaluatorConfig(
                  scannerSettings
                ),
                ...requestedStepSequenceInput,
              }),
              timeoutMs: PRODUCT_SCAN_TIMEOUT_MS,
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
                  ...toRecord(runtime.settings),
                  ...extractIntegrationConnectionPlaywrightSettingsOverrides(supplierConnection),
                },
                { forceVisible: input.forceVisible ?? false }
              ),
            }),
            ownerUserId: input.ownerUserId ?? null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: '1688 product scan',
              tags: ['product', '1688', 'scan', 'batch'],
              connectionId: supplierConnection.id,
              integrationId,
            }),
          });
        } else {
          return createFailedBatchResult(productId, 'Failed to queue scan: missing connection.');
        }

        const startedRun = resolveStartedRun(run);
        if (startedRun === null) {
          return createFailedBatchResult(productId, 'Failed to queue scan.');
        }

        const scan = await upsertProductScan({
          id: randomUUID(),
          productId,
          provider: input.config.provider,
          scanType: 'supplier_reverse_image',
          status: startedRun.status,
          engineRunId: startedRun.runId,
          productName,
          asin: product.asin,
          imageCandidates,
          asinUpdateStatus: 'pending',

          asinUpdateMessage:
            startedRun.status === 'running' ? 'Product scan running.' : 'Product scan queued.',
          rawResult: createProductScanStartedRawResult({
            runId: startedRun.runId,
            status: startedRun.status,
            runtimeKey:
              input.config.provider === '1688'
                ? SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
                : amazonRuntimeKey !== null
                  ? amazonRuntimeKey
                  : input.config.runtime.executionMode === 'native'
                    ? input.config.runtime.runtimeKey
                  : null,
            actionId:
              input.config.provider === '1688'
                ? `runtime_action__${SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY}`
                : amazonRuntimeAction?.id ?? null,
            selectorProfile:
              input.config.provider === '1688'
                ? SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE
                : input.config.provider === 'amazon'
                  ? amazonSelectorProfile
                  : null,
            imageSearchProvider:
              input.config.provider === 'amazon'
                ? (resolveAmazonImageSearchProvider(requestInput, scannerSettings) ?? 'google_images_upload')
                : 'google_images_upload',
            imageSearchPageUrl:
              input.config.provider === 'amazon'
                ? resolveAmazonImageSearchPageUrl(requestInput, scannerSettings)
                : null,
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
            input.config.provider === '1688'
              ? startedRun.status === 'running'
                ? '1688 supplier scan running.'
                : '1688 supplier scan queued.'
              : startedRun.status === 'running'
                ? 'Amazon candidate search running.'
                : 'Amazon candidate search queued.',
        };
      } catch (error) {
        await ErrorSystem.captureException(error, {
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
  userId?: string | null;
  stepSequenceKey?: string | null;
  stepSequence?: any[] | null;
}): Promise<ProductScanBatchResponse> {
  const requestInput = input.requestInput ?? {
    runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
    collectAmazonCandidatePreviews: true,
    ...((input.stepSequenceKey ?? '') !== '' ? { stepSequenceKey: input.stepSequenceKey } : {}),
    ...(input.stepSequence !== null && input.stepSequence !== undefined ? { stepSequence: input.stepSequence } : {}),
  };

  return await queueBatchProductScans({
    productIds: input.productIds,
    config: AMAZON_QUEUE_CONFIG,
    requestInput:
      input.requestInput !== undefined
        ? {
            runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
            collectAmazonCandidatePreviews: true,
            ...input.requestInput,
          }
        : requestInput,
    ownerUserId: input.ownerUserId ?? input.userId,
  });
}

export async function queue1688BatchProductScans(input: {
  productIds: string[];
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
  userId?: string | null;
  stepSequenceKey?: string | null;
  stepSequence?: any[] | null;
}): Promise<ProductScanBatchResponse> {
  return await queueBatchProductScans({
    productIds: input.productIds,
    config: SUPPLIER_1688_QUEUE_CONFIG,
    forceVisible: input.forceVisible,
    requestInput: input.requestInput ?? {
      ...((input.stepSequenceKey ?? '') !== '' ? { stepSequenceKey: input.stepSequenceKey } : {}),
      ...(input.stepSequence !== null && input.stepSequence !== undefined ? { stepSequence: input.stepSequence } : {}),
    },
    ownerUserId: input.ownerUserId ?? input.userId,
  });
}
