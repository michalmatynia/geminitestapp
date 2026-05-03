import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeActionName,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import { buildProductScannerEngineRequestOptions } from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  createProductScanStartedRawResult,
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  appendAmazonAiStageSummary,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonTriageEvaluatorConfig,
  resolveNextQueueStepAttempt,
} from './product-scans-service.helpers.amazon';
import type { AmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';
import { resolveScanOwnerUserId } from './product-scans-sync-amazon.runtime';
import {
  buildRejectedAiStageSummary,
  resolveRejectedQueueStatus,
  type RejectedQueueStatus,
  type RejectedRuntimeContext,
} from './product-scans-sync-amazon-matched.rejection-context';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type StartedRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
type FallbackProvider = NonNullable<ReturnType<typeof resolveAmazonImageSearchFallbackProvider>>;
type RejectedFallbackContext = RejectedRuntimeContext & {
  fallbackProvider: FallbackProvider;
  fallbackRuntimeAction: Awaited<ReturnType<typeof resolveAmazonRuntimeActionDefinition>>;
  fallbackRuntimeKey: AmazonScanRuntimeKey;
  providerHistory: ReturnType<typeof resolveAmazonImageSearchProviderHistory>;
};
type FallbackRuntimeAction = NonNullable<RejectedFallbackContext['fallbackRuntimeAction']>;

const resolveRejectedFallbackProvider = (
  context: RejectedRuntimeContext
): FallbackProvider | null => {
  if (context.amazonEvaluation.recommendedAction !== 'fallback_provider') return null;
  return resolveAmazonImageSearchFallbackProvider({
    rawResult: context.scan.rawResult,
    scannerSettings: context.scannerSettings,
    currentProvider: context.amazonImageSearchProvider,
    imageCandidates: context.scan.imageCandidates,
  });
};

const resolveRejectedFallbackRuntimeKey = (
  context: RejectedRuntimeContext
): AmazonScanRuntimeKey =>
  context.currentAmazonRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY
    ? AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
    : context.currentAmazonRuntimeKey;

const createRejectedFallbackContext = async (
  context: RejectedRuntimeContext
): Promise<RejectedFallbackContext | null> => {
  const fallbackProvider = resolveRejectedFallbackProvider(context);
  if (fallbackProvider === null) return null;
  const fallbackRuntimeKey = resolveRejectedFallbackRuntimeKey(context);
  return {
    ...context,
    fallbackProvider,
    fallbackRuntimeAction: await resolveAmazonRuntimeActionDefinition(fallbackRuntimeKey),
    fallbackRuntimeKey,
    providerHistory: resolveAmazonImageSearchProviderHistory(
      context.scan.rawResult,
      context.amazonImageSearchProvider
    ),
  };
};

const resolveFallbackActionExecutionSettings = (
  context: RejectedFallbackContext
): FallbackRuntimeAction['executionSettings'] | null =>
  context.fallbackRuntimeAction?.executionSettings ?? null;

const resolveFallbackActionPersonaId = (
  context: RejectedFallbackContext
): string | null => context.fallbackRuntimeAction?.personaId ?? null;

const resolveFallbackActionId = (context: RejectedFallbackContext): string | null =>
  context.fallbackRuntimeAction?.id ?? null;

const resolveFallbackActionName = (context: RejectedFallbackContext): string =>
  context.fallbackRuntimeAction?.name ??
  resolveAmazonRuntimeActionName(context.fallbackRuntimeKey);

const buildFallbackScannerRuntimeOptions = (
  context: RejectedFallbackContext
): ReturnType<typeof buildAmazonScannerRequestRuntimeOptions> =>
  buildAmazonScannerRequestRuntimeOptions({
    scannerSettings: context.scannerSettings,
    scannerEngineRequestOptions: buildProductScannerEngineRequestOptions(context.scannerSettings),
    actionExecutionSettings: resolveFallbackActionExecutionSettings(context),
    actionPersonaId: resolveFallbackActionPersonaId(context),
    runtimeKey: context.fallbackRuntimeKey,
  });

const buildFallbackRequestInput = async (
  context: RejectedFallbackContext
): Promise<ReturnType<typeof amazonScanRuntime.buildRequestInput>> => {
  const [triageConfig, probeConfig] = await Promise.all([
    resolveAmazonTriageEvaluatorConfig(context.scannerSettings),
    resolveAmazonProbeEvaluatorConfig(context.scannerSettings),
  ]);
  return amazonScanRuntime.buildRequestInput({
    productId: context.product.id,
    productName: context.scan.productName,
    existingAsin: context.product.asin,
    imageCandidates: context.scan.imageCandidates,
    runtimeKey: context.fallbackRuntimeKey,
    imageSearchProvider: context.fallbackProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    selectorProfile: context.amazonSelectorProfile,
    allowManualVerification: context.allowManualVerification,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    triageOnlyOnAmazonCandidates: triageConfig.enabled,
    probeOnlyOnAmazonMatch: probeConfig.enabled,
    ...context.requestedStepSequenceInput,
  });
};

const startRejectedFallbackProviderRun = async (
  context: RejectedFallbackContext
): Promise<StartedRun> =>
  await startPlaywrightEngineTask({
    request: {
      runtimeKey: context.fallbackRuntimeKey,
      actionId: resolveFallbackActionId(context),
      actionName: resolveFallbackActionName(context),
      selectorProfile: context.amazonSelectorProfile,
      input: await buildFallbackRequestInput(context),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs(context),
      browserEngine: 'chromium',
      ...buildFallbackScannerRuntimeOptions(context),
      capture: resolveAmazonScanDiagnosticCapture(context.scan.rawResult),
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(context.scan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: 'Amazon fallback provider scan',
      tags: ['product', 'amazon', 'scan', 'provider-fallback'],
    }),
  });

const buildRejectedFallbackQueueStep = (
  context: RejectedFallbackContext,
  status: RejectedQueueStatus
): ProductScanRecord['steps'][number] => ({
  key: 'queue_scan',
  label: 'Retry with fallback image-search provider',
  group: 'input',
  attempt: resolveNextQueueStepAttempt(context.finalizedAmazonSteps),
  status: 'completed',
  resultCode: status === 'running' ? 'run_started' : 'run_queued',
  message: status === 'running'
    ? 'Started an Amazon scan with the fallback image-search provider.'
    : 'Queued an Amazon scan with the fallback image-search provider.',
  details: [
    { label: 'Previous provider', value: context.amazonImageSearchProvider },
    { label: 'Fallback provider', value: context.fallbackProvider },
    { label: 'Rejection category', value: context.amazonEvaluation.rejectionCategory },
  ],
  url: null,
});

const buildRejectedFallbackRawResult = (
  context: RejectedFallbackContext,
  fallbackRun: StartedRun
): unknown =>
  appendAmazonAiStageSummary(
    {
      ...createProductScanStartedRawResult({
        runId: fallbackRun.runId,
        status: fallbackRun.status,
        runtimeKey: context.fallbackRuntimeKey,
        actionId: resolveFallbackActionId(context),
        selectorProfile: context.amazonSelectorProfile,
        imageSearchProvider: context.fallbackProvider,
        imageSearchPageUrl: context.amazonImageSearchPageUrl,
        imageSearchProviderHistory: [...context.providerHistory, context.fallbackProvider],
        allowManualVerification: context.allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
        previousRunId: context.engineRunId,
        previousResult: context.extractionEvaluationRawResult,
        recordDiagnostics: context.diagnostics.enabled,
        ...context.requestedStepSequenceInput,
      }),
      providerFallback: true,
      fallbackFromImageSearchProvider: context.amazonImageSearchProvider,
      fallbackToImageSearchProvider: context.fallbackProvider,
    },
    buildRejectedAiStageSummary(context)
  );

const persistRejectedFallbackProviderRun = async (
  context: RejectedFallbackContext,
  fallbackRun: StartedRun
): Promise<ProductScanRecord> => {
  const status = resolveRejectedQueueStatus(fallbackRun.status);
  return await persistSynchronizedScan(context.scan, {
    engineRunId: fallbackRun.runId,
    status,
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: context.amazonEvaluation,
    steps: upsertPersistedProductScanStep(
      context.finalizedAmazonSteps,
      buildRejectedFallbackQueueStep(context, status)
    ),
    rawResult: buildRejectedFallbackRawResult(context, fallbackRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

export const retryRejectedAmazonWithFallbackProvider = async (
  context: RejectedRuntimeContext
): Promise<ProductScanRecord | null> => {
  const fallbackContext = await createRejectedFallbackContext(context);
  if (fallbackContext === null) return null;
  return await persistRejectedFallbackProviderRun(
    fallbackContext,
    await startRejectedFallbackProviderRun(fallbackContext)
  );
};
