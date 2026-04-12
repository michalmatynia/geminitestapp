import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightConnectionEngineTask,
  startPlaywrightEngineTask,
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
  normalizeProductScanRecord,
  type ProductAmazonBatchScanItem,
  type ProductAmazonBatchScanResponse,
  type ProductScanBatchResponse,
  type ProductScanProvider,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  getProductScanProviderDefinition,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerHeadless,
} from './product-scanner-settings';
import {
  findLatestActiveProductScan,
  upsertProductScan,
} from './product-scans-repository';
import {
  AMAZON_SCAN_TIMEOUT_MS,
  toRecord,
  normalizeErrorMessage,
  resolveScanEngineRunId,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  upsertPersistedProductScanStep,
  createAmazonScanStartedRawResult,
  createFailedBatchResult,
  tryDirectQueuedScanUpdate,
  sanitizeProductScanImageCandidates,
} from './product-scans-service.helpers';
import {
  buildAmazonScannerRequestRuntimeOptions,
  mapWithConcurrencyLimit,
} from './product-scans-start-helpers';
import {
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';
import {
  synchronizeProductScan,
} from './product-scans-service'; // Use the original service for recursion

type Resolved1688ScanConnectionContext = {
  integrationId: string;
  connection: IntegrationConnectionRecord;
};

type BatchQueueProviderConfig = {
  provider: ProductScanProvider;
  runtime: ProductScanProviderRuntime;
  actionPrefix: string;
  instanceLabel: string;
  instanceTags: string[];
  resultStatusLabel: string;
  noImageMessage: string;
  alreadyRunningMessage: string;
  queueFailureMessage: string;
  enqueueFailureMessage: string;
  buildRequestInput: (input: {
    product: Awaited<ReturnType<typeof productService.getProductById>>;
    productName: string;
    imageCandidates: ProductScanRecord['imageCandidates'];
    batchIndex: number;
    allowManualVerification: boolean;
    manualVerificationTimeoutMs: number;
    amazonCandidateEvaluatorEnabled: boolean;
    scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
    resolvedConnection: Resolved1688ScanConnectionContext | null;
  }) => Record<string, unknown>;
};

const queueStatusMessage = (
  queuedRunStatus: ProductScanRecord['status'],
  resultStatusLabel: string
): string =>
  queuedRunStatus === 'running'
    ? `${resultStatusLabel} running.`
    : `${resultStatusLabel} queued.`;

const resolveAlreadyRunningBatchResult = async (input: {
  productId: string;
  provider: ProductScanProvider;
  alreadyRunningMessage: string;
  resultStatusLabel: string;
}
): Promise<ProductAmazonBatchScanItem | null> => {
  const existingActiveScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });
  if (!existingActiveScan) {
    return null;
  }

  const synchronized = await synchronizeProductScan(existingActiveScan);
  if (!isProductScanActiveStatus(synchronized.status)) {
    return null;
  }

  return {
    productId: input.productId,
    scanId: synchronized.id,
    runId: resolveScanEngineRunId(synchronized),
    status: 'already_running',
    currentStatus: synchronized.status,
    message:
      synchronized.status === 'running'
        ? `${input.resultStatusLabel} running.`
        : input.alreadyRunningMessage,
  };
};

const createUniformFailedBatchResponse = (
  productIds: string[],
  message: string
): ProductScanBatchResponse => {
  const results = productIds.map((productId) => createFailedBatchResult(productId, message));
  return {
    queued: 0,
    running: 0,
    alreadyRunning: 0,
    failed: results.length,
    results,
  };
};

const resolve1688ScanConnectionContext = async (
  requestedConnectionId?: string | null
): Promise<Resolved1688ScanConnectionContext> => {
  const repo = await getIntegrationRepository();
  const integration = (await repo.listIntegrations()).find((entry) => entry.slug === '1688') ?? null;
  if (!integration) {
    throw new Error('1688 integration is not configured.');
  }

  const connections = await repo.listConnections(integration.id);
  if (connections.length === 0) {
    throw new Error('Create a 1688 browser profile before running 1688 scans.');
  }

  const normalizedRequestedConnectionId = requestedConnectionId?.trim() || null;
  if (normalizedRequestedConnectionId) {
    const requestedConnection =
      connections.find((connection) => connection.id === normalizedRequestedConnectionId) ?? null;
    if (!requestedConnection) {
      throw new Error('Selected 1688 profile was not found.');
    }
    if (!requestedConnection.playwrightStorageState?.trim()) {
      throw new Error(
        `1688 login required for "${requestedConnection.name}". Open the login window and save a browser session first.`
      );
    }
    return {
      integrationId: integration.id,
      connection: requestedConnection,
    };
  }

  const defaultConnectionId = (await get1688DefaultConnectionId())?.trim() || null;
  const resolvedConnection =
    (defaultConnectionId
      ? connections.find((connection) => connection.id === defaultConnectionId) ?? null
      : null) ?? connections[0] ?? null;

  if (!resolvedConnection) {
    throw new Error('No 1688 browser profile is available.');
  }
  if (!resolvedConnection.playwrightStorageState?.trim()) {
    throw new Error(
      `1688 login required for "${resolvedConnection.name}". Open the login window and save a browser session first.`
    );
  }

  return {
    integrationId: integration.id,
    connection: resolvedConnection,
  };
};

const queueProviderBatchProductScans = async (input: {
  productIds: string[];
  userId?: string | null;
  connectionId?: string | null;
  config: BatchQueueProviderConfig;
}): Promise<ProductScanBatchResponse> => {
  const productIds = Array.from(
    new Set(
      input.productIds
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
  let resolved1688Connection: Resolved1688ScanConnectionContext | null = null;
  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  let amazonCandidateEvaluatorEnabled = false;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
    if (input.config.provider === 'amazon') {
      amazonCandidateEvaluatorEnabled = (
        await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
      ).enabled;
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

  if (input.config.provider === '1688') {
    try {
      resolved1688Connection = await resolve1688ScanConnectionContext(input.connectionId);
    } catch (error) {
      const message = normalizeErrorMessage(
        error instanceof Error ? error.message : error,
        '1688 profile is required before starting 1688 scans.'
      );
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: `${input.config.actionPrefix}.resolveConnection`,
        connectionId: input.connectionId?.trim() || null,
      });
      return createUniformFailedBatchResponse(productIds, message);
    }
  }

  const results = await mapWithConcurrencyLimit(
    productIds,
    1, // SEQUENCE start to prevent race conditions on same product
    async (productId, batchIndex): Promise<ProductAmazonBatchScanItem> => {
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

        const imageCandidates = sanitizeProductScanImageCandidates(
          input.config.runtime.resolveImageCandidates(product)
        );
        const productName = input.config.runtime.resolveDisplayName(product);
        const baseRecord = input.config.runtime.createBaseRecord({
          productId,
          productName,
          integrationId: resolved1688Connection?.integrationId ?? null,
          connectionId: resolved1688Connection?.connection.id ?? null,
          userId: input.userId,
          imageCandidates,
          status: imageCandidates.length > 0 ? 'queued' : 'failed',
          error: imageCandidates.length > 0 ? null : input.config.noImageMessage,
        });

        let savedBaseRecord: ProductScanRecord;
        try {
          savedBaseRecord = await upsertProductScan(baseRecord);
        } catch (error) {
          const recoveredAlreadyRunningResult = await resolveAlreadyRunningBatchResult({
            productId,
            provider: input.config.provider,
            alreadyRunningMessage: input.config.alreadyRunningMessage,
            resultStatusLabel: input.config.resultStatusLabel,
          });
          if (recoveredAlreadyRunningResult) {
            return recoveredAlreadyRunningResult;
          }

          throw error;
        }
        if (imageCandidates.length === 0) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ?? input.config.noImageMessage,
            savedBaseRecord.id
          );
        }

        try {
          const scannerEngineRequestOptions =
            buildProductScannerEngineRequestOptions(scannerSettings);
          const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
            scannerSettings,
            scannerEngineRequestOptions,
          });
          const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
            scannerSettings
          );
          const allowManualVerification =
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless;
          const requestInput = input.config.buildRequestInput({
            product,
            productName,
            imageCandidates,
            batchIndex,
            allowManualVerification,
            manualVerificationTimeoutMs,
            amazonCandidateEvaluatorEnabled,
            scannerSettings,
            resolvedConnection: resolved1688Connection,
          });
          const timeoutMs = allowManualVerification
            ? Math.max(AMAZON_SCAN_TIMEOUT_MS, manualVerificationTimeoutMs + 60_000)
            : AMAZON_SCAN_TIMEOUT_MS;
          const instance = createCustomPlaywrightInstance({
            family: 'scrape',
            label: input.config.instanceLabel,
            tags: input.config.instanceTags,
          });
          const run =
            input.config.provider === '1688' && resolved1688Connection
              ? (
                  await startPlaywrightConnectionEngineTask({
                    connection: resolved1688Connection.connection,
                    request: {
                      script: input.config.runtime.script,
                      input: requestInput,
                      timeoutMs,
                      capture: {
                        screenshot: true,
                        html: true,
                      },
                      preventNewPages: true,
                    },
                    ownerUserId: input.userId?.trim() || null,
                    instance,
                    resolveEngineRequestConfig: (runtime) => ({
                      settings: {
                        ...runtime.settings,
                        headless: scannerHeadless,
                      },
                      browserPreference: runtime.browserPreference,
                    }),
                  })
                ).run
              : await startPlaywrightEngineTask({
                  request: {
                    script: input.config.runtime.script,
                    input: requestInput,
                    timeoutMs,
                    browserEngine: 'chromium',
                    ...scannerRuntimeOptions,
                    capture: {
                      screenshot: true,
                      html: true,
                    },
                    preventNewPages: true,
                  },
                  ownerUserId: input.userId?.trim() || null,
                  instance,
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
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'completed',
                  resultCode:
                    queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                  message:
                    queuedRunStatus === 'running'
                      ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                      : `Playwright ${input.config.resultStatusLabel} queued.`,
                  details: [
                    { label: 'Run status', value: queuedRunStatus },
                    { label: 'Run id', value: run.runId },
                  ],
                  url: null,
                }),
                rawResult: startedRunRawResult,
              })
            );
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistRunLink`,
              productId,
              scanId: savedBaseRecord.id,
              runId: run.runId,
            });

            try {
              saved = await upsertProductScan(
                normalizeProductScanRecord({
                  ...savedBaseRecord,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                  },
                })
              );
            } catch (fallbackError) {
              void ErrorSystem.captureException(fallbackError, {
                service: 'product-scans.service',
                action: `${input.config.actionPrefix}.persistRunFallback`,
                productId,
                scanId: savedBaseRecord.id,
                runId: run.runId,
              });

              const recovered = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  engineRunId: run.runId,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackUpdate`,
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
                  message: queueStatusMessage(
                    queuedRunStatus,
                    input.config.resultStatusLabel
                  ),
                };
              }

              const failureMessage =
                `${input.config.resultStatusLabel} started, but the scan record could not be updated with its run link.`;
              const failedRecord = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  status: 'failed',
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'failed',
                    resultCode: 'run_link_failed',
                    message: failureMessage,
                    details: [{ label: 'Run id', value: run.runId }],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                  error: failureMessage,
                  asinUpdateStatus: 'failed',
                  asinUpdateMessage: failureMessage,
                  completedAt: new Date().toISOString(),
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackFailed`,
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
            message: queueStatusMessage(queuedRunStatus, input.config.resultStatusLabel),
          };
        } catch (error) {
          const message = normalizeErrorMessage(
            error instanceof Error ? error.message : error,
            input.config.enqueueFailureMessage
          );
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: `${input.config.actionPrefix}.startRun`,
            productId,
          });
          let failed: ProductScanRecord;
          try {
            failed = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              })
            );
          } catch (persistFailureError) {
            void ErrorSystem.captureException(persistFailureError, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistStartRunFailure`,
              productId,
              scanId: savedBaseRecord.id,
            });

            const failedRecord = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              },
              {
                action: `${input.config.actionPrefix}.persistStartRunFailureUpdate`,
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
          input.config.queueFailureMessage
        );
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: `${input.config.actionPrefix}.product`,
          productId,
        });
        return createFailedBatchResult(productId, message);
      }
    }
  );

  return {
    queued: results.filter((result) => result.status === 'queued').length,
    running: results.filter((result) => result.status === 'running').length,
    alreadyRunning: results.filter((result) => result.status === 'already_running').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
};

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  const amazonScanProvider = getProductScanProviderDefinition('amazon');
  const amazonRuntime = amazonScanProvider.runtime!;
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    config: {
      provider: 'amazon',
      runtime: amazonRuntime,
      actionPrefix: 'queueAmazonBatchProductScans',
      instanceLabel: 'Amazon reverse image ASIN scan',
      instanceTags: ['product', 'amazon', 'scan', 'google-reverse-image'],
      resultStatusLabel: 'Amazon reverse image scan',
      noImageMessage: 'No product image available for Amazon reverse image scan.',
      alreadyRunningMessage: 'Amazon scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue Amazon reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue Amazon reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        amazonCandidateEvaluatorEnabled,
        scannerSettings: _scannerSettings,
        resolvedConnection: _resolvedConnection,
      }) =>
        amazonRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          existingAsin: product?.asin,
          imageCandidates,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
        }),
    },
  });
}

export async function queue1688BatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
  connectionId?: string | null;
}): Promise<ProductScanBatchResponse> {
  const supplierScanProvider = getProductScanProviderDefinition('1688');
  const supplierRuntime = supplierScanProvider.runtime!;
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    connectionId: input.connectionId,
    config: {
      provider: '1688',
      runtime: supplierRuntime,
      actionPrefix: 'queue1688BatchProductScans',
      instanceLabel: '1688 supplier reverse image scan',
      instanceTags: ['product', '1688', 'scan', 'supplier-reverse-image'],
      resultStatusLabel: '1688 supplier reverse image scan',
      noImageMessage: 'No product image available for 1688 supplier reverse image scan.',
      alreadyRunningMessage: '1688 supplier scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue 1688 supplier reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue 1688 supplier reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        scannerSettings,
        resolvedConnection,
      }) =>
        supplierRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          imageCandidates,
          integrationId: resolvedConnection?.integrationId ?? null,
          connectionId: resolvedConnection?.connection.id ?? null,
          scanner1688StartUrl: resolvedConnection?.connection.scanner1688StartUrl ?? null,
          scanner1688LoginMode: resolvedConnection?.connection.scanner1688LoginMode ?? null,
          scanner1688DefaultSearchMode:
            resolvedConnection?.connection.scanner1688DefaultSearchMode ?? null,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          candidateResultLimit:
            resolvedConnection?.connection.scanner1688CandidateResultLimit ??
            scannerSettings.scanner1688?.candidateResultLimit,
          minimumCandidateScore:
            resolvedConnection?.connection.scanner1688MinimumCandidateScore ??
            scannerSettings.scanner1688?.minimumCandidateScore,
          maxExtractedImages:
            resolvedConnection?.connection.scanner1688MaxExtractedImages ??
            scannerSettings.scanner1688?.maxExtractedImages,
          allowUrlImageSearchFallback:
            resolvedConnection?.connection.scanner1688AllowUrlImageSearchFallback ??
            (resolvedConnection?.connection.scanner1688DefaultSearchMode === 'image_url_fallback'
              ? true
              : resolvedConnection?.connection.scanner1688DefaultSearchMode === 'local_image'
                ? false
                : scannerSettings.scanner1688?.allowUrlImageSearchFallback),
        }),
    },
  });
}
