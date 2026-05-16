import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type {
  ProductScanAmazonEvaluation,
  ProductScanAmazonProbe,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';
import { resolveAmazonRuntimeActionName } from '@/shared/lib/browser-execution/amazon-runtime-constants';

import { AMAZON_PRODUCT_SCAN_PROVIDER, requireProductScanNativeRuntime } from './product-scan-providers';
import type { buildProductScannerEngineRequestOptions } from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  appendAmazonAiStageSummary,
  buildAmazonCandidateTriageStageSummary,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchProviderHistory,
  resolveNextQueueStepAttempt,
  resolveAmazonScanRuntimeTimeoutMs,
} from './product-scans-service.helpers.amazon';
import type {
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import {
  createProductScanStartedRawResult,
  createPersistedProductScanStep,
  persistSynchronizedScan,
  readOptionalString,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
  type resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import type { ProductScanCandidateTriageEvaluationResult } from './product-scan-ai-evaluator';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type ScannerEngineRequestOptions = ReturnType<typeof buildProductScannerEngineRequestOptions>;
type AmazonRuntimeAction = Awaited<ReturnType<typeof resolveAmazonRuntimeActionDefinition>>;
type AmazonRuntimeKey = ReturnType<typeof resolveAmazonProductScanRuntimeKey>;
type AmazonImageSearchProvider = ReturnType<typeof resolveAmazonImageSearchProvider>;
type AmazonImageSearchFallbackProvider = NonNullable<
  ReturnType<typeof resolveAmazonImageSearchFallbackProvider>
>;
type AmazonImageSearchPageUrl = ReturnType<typeof resolveAmazonImageSearchPageUrl>;
type AmazonProbeEvaluatorConfig = Awaited<ReturnType<typeof resolveAmazonProbeEvaluatorConfig>>;
type AmazonTriageEvaluatorConfig = Awaited<ReturnType<typeof resolveAmazonTriageEvaluatorConfig>>;
type AmazonTriageRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;

export type AmazonTriageQueueContext = {
  scan: ProductScanRecord;
  product: ProductWithImages;
  engineRunId: string;
  parsedResult: AmazonScanRuntimeResult;
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
  finalizedAmazonSteps: ProductScanRecord['steps'];
  triageRawResult: unknown;
  triageEvaluation: ProductScanCandidateTriageEvaluationResult;
  scannerSettings: ScannerSettings;
  scannerEngineRequestOptions: ScannerEngineRequestOptions;
  amazonRuntimeKey: AmazonRuntimeKey;
  amazonRuntimeAction: AmazonRuntimeAction;
  currentProvider: AmazonImageSearchProvider;
  imageSearchPageUrl: AmazonImageSearchPageUrl;
  probeEvaluatorConfig: AmazonProbeEvaluatorConfig;
  triageEvaluatorConfig: AmazonTriageEvaluatorConfig;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
};

const resolveTriageRunStatus = (run: AmazonTriageRun): 'queued' | 'running' =>
  run.status === 'running' ? 'running' : 'queued';

const resolveScanOwnerUserId = (scan: ProductScanRecord): string | null => {
  const trimmed = scan.updatedBy?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const buildTriageScannerRuntimeOptions = (
  context: AmazonTriageQueueContext
): ReturnType<typeof buildAmazonScannerRequestRuntimeOptions> =>
  buildAmazonScannerRequestRuntimeOptions({
    scannerSettings: context.scannerSettings,
    scannerEngineRequestOptions: context.scannerEngineRequestOptions,
    actionExecutionSettings: context.amazonRuntimeAction?.executionSettings ?? null,
    actionPersonaId: context.amazonRuntimeAction?.personaId ?? null,
    runtimeKey: context.amazonRuntimeKey,
  });

const startAmazonTriageEngineTask = async (input: {
  context: AmazonTriageQueueContext;
  imageSearchProvider: AmazonImageSearchProvider;
  label: string;
  tags: string[];
  extraInput: Record<string, unknown>;
}): Promise<AmazonTriageRun> => {
  const { context } = input;
  const amazonSelectorProfile =
    readOptionalString(toRecord(context.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
    context.scannerSettings
  );
  const allowManualVerification = shouldAutoShowScannerCaptchaBrowser(context.scannerSettings);
  const diagnosticCapture = resolveAmazonScanDiagnosticCapture(context.scan.rawResult);

  return await startPlaywrightEngineTask({
    request: {
      runtimeKey: amazonScanRuntime.runtimeKey,
      actionId: context.amazonRuntimeAction?.id ?? null,
      actionName:
        context.amazonRuntimeAction?.name ??
        resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
      selectorProfile: amazonSelectorProfile,
      input: amazonScanRuntime.buildRequestInput({
        productId: context.product.id,
        productName: context.scan.productName,
        existingAsin: context.product.asin,
        imageCandidates: context.scan.imageCandidates,
        imageSearchProvider: input.imageSearchProvider,
        imageSearchPageUrl: context.imageSearchPageUrl,
        selectorProfile: amazonSelectorProfile,
        allowManualVerification,
        manualVerificationTimeoutMs,
        probeOnlyOnAmazonMatch: context.probeEvaluatorConfig.enabled,
        ...input.extraInput,
        ...context.requestedStepSequenceInput,
      }),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
        allowManualVerification,
        manualVerificationTimeoutMs,
      }),
      browserEngine: 'chromium',
      ...buildTriageScannerRuntimeOptions(context),
      capture: diagnosticCapture,
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(context.scan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: input.label,
      tags: input.tags,
    }),
  });
};

const buildAmazonTriageStartedRawResult = (input: {
  context: AmazonTriageQueueContext;
  run: AmazonTriageRun;
  imageSearchProvider: AmazonImageSearchProvider;
  imageSearchProviderHistory: unknown;
  extraRawResult: Record<string, unknown>;
}): unknown => {
  const { context } = input;
  const amazonSelectorProfile =
    readOptionalString(toRecord(context.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
    context.scannerSettings
  );
  return appendAmazonAiStageSummary(
    {
      ...createProductScanStartedRawResult({
        runId: input.run.runId,
        status: input.run.status,
        runtimeKey: amazonScanRuntime.runtimeKey,
        actionId: context.amazonRuntimeAction?.id ?? null,
        selectorProfile: amazonSelectorProfile,
        imageSearchProvider: input.imageSearchProvider,
        imageSearchPageUrl: context.imageSearchPageUrl,
        imageSearchProviderHistory: input.imageSearchProviderHistory,
        allowManualVerification: shouldAutoShowScannerCaptchaBrowser(context.scannerSettings),
        manualVerificationTimeoutMs,
        previousRunId: context.engineRunId,
        previousResult: context.triageRawResult,
        recordDiagnostics: resolveAmazonScanDiagnosticCapture(context.scan.rawResult).trace === true,
        ...context.requestedStepSequenceInput,
      }),
      ...input.extraRawResult,
    },
    buildAmazonCandidateTriageStageSummary(context.triageEvaluation, context.currentProvider)
  );
};

const persistQueuedAmazonTriageScan = (input: {
  context: AmazonTriageQueueContext;
  run: AmazonTriageRun;
  url: string | null;
  rawResult: unknown;
  queueStep: ProductScanRecord['steps'][number];
}): Promise<ProductScanRecord> =>
  persistSynchronizedScan(input.context.scan, {
    engineRunId: input.run.runId,
    status: resolveTriageRunStatus(input.run),
    asin: null,
    matchedImageId: input.context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: input.url,
    description: null,
    amazonDetails: null,
    amazonProbe: input.context.persistedAmazonProbe,
    amazonEvaluation: input.context.existingAmazonEvaluation,
    steps: upsertPersistedProductScanStep(input.context.finalizedAmazonSteps, input.queueStep),
    rawResult: input.rawResult,
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });

export const startAmazonTriageFallbackProviderScan = async (
  context: AmazonTriageQueueContext,
  fallbackProvider: AmazonImageSearchFallbackProvider
): Promise<ProductScanRecord> => {
  const fallbackRun = await startAmazonTriageEngineTask({
    context,
    imageSearchProvider: fallbackProvider,
    label: 'Amazon fallback provider scan',
    tags: ['product', 'amazon', 'scan', 'provider-fallback'],
    extraInput: { triageOnlyOnAmazonCandidates: context.triageEvaluatorConfig.enabled },
  });
  const fallbackStatus = resolveTriageRunStatus(fallbackRun);
  const providerHistory = resolveAmazonImageSearchProviderHistory(
    context.scan.rawResult,
    context.currentProvider
  );
  return await persistQueuedAmazonTriageScan({
    context,
    run: fallbackRun,
    url: null,
    rawResult: buildAmazonTriageStartedRawResult({
      context,
      run: fallbackRun,
      imageSearchProvider: fallbackProvider,
      imageSearchProviderHistory: [...providerHistory, fallbackProvider],
      extraRawResult: {
        providerFallback: true,
        fallbackFromImageSearchProvider: context.currentProvider,
        fallbackToImageSearchProvider: fallbackProvider,
      },
    }),
    queueStep: createPersistedProductScanStep({
      key: 'queue_scan',
      label: 'Retry with fallback image-search provider',
      attempt: resolveNextQueueStepAttempt(context.finalizedAmazonSteps),
      status: 'completed',
      resultCode: fallbackStatus === 'running' ? 'run_started' : 'run_queued',
      message:
        fallbackStatus === 'running'
          ? 'Started an Amazon scan with the fallback image-search provider.'
          : 'Queued an Amazon scan with the fallback image-search provider.',
      details: [
        { label: 'Previous provider', value: context.currentProvider },
        { label: 'Fallback provider', value: fallbackProvider },
        { label: 'Reason', value: context.triageEvaluation.reasons[0] ?? null },
      ],
      url: null,
    }),
  });
};

export {
  buildAmazonTriageStartedRawResult,
  persistQueuedAmazonTriageScan,
  resolveTriageRunStatus,
  startAmazonTriageEngineTask,
};
