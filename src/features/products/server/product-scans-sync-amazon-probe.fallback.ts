import 'server-only';

import { startPlaywrightEngineTask } from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  createProductScanStartedRawResult,
  normalizeErrorMessage,
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextQueueStepAttempt,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import {
  amazonProbeScanRuntime,
  createAmazonProbeTaskInstance,
  resolveAmazonProbeOwnerUserId,
  resolveAmazonProbeRuntimeActionName,
  resolveAmazonProbeRuntimeRequestContext,
} from './product-scans-sync-amazon-probe.runtime';
import type {
  AmazonProbeEvaluationState,
  AmazonProbeReadyContext,
} from './product-scans-sync-amazon-probe.types';

type FallbackProviderInput = {
  currentProvider: NonNullable<ReturnType<typeof resolveAmazonImageSearchFallbackProvider>>;
  fallbackProvider: NonNullable<ReturnType<typeof resolveAmazonImageSearchFallbackProvider>>;
};

type FallbackProviderQueuedInput = {
  context: AmazonProbeReadyContext;
  state: AmazonProbeEvaluationState;
  fallbackRun: Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
  fallbackStatus: 'running' | 'queued';
  fallback: FallbackProviderInput;
};

type FallbackRawResultInput = FallbackProviderQueuedInput & {
  providerHistory: string[];
};

const resolveFallbackProvider = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  currentProvider: NonNullable<ReturnType<typeof resolveAmazonImageSearchFallbackProvider>>
): ReturnType<typeof resolveAmazonImageSearchFallbackProvider> => {
  if (state.amazonEvaluation?.recommendedAction !== 'fallback_provider') return null;
  return resolveAmazonImageSearchFallbackProvider({
    rawResult: context.scan.rawResult,
    scannerSettings: context.scannerSettings,
    currentProvider,
    imageCandidates: context.scan.imageCandidates,
  });
};

const buildFallbackQueueStep = (
  state: AmazonProbeEvaluationState,
  fallback: FallbackProviderInput,
  status: 'running' | 'queued'
): Parameters<typeof upsertPersistedProductScanStep>[1] => ({
  key: 'queue_scan',
  label: 'Retry with fallback image-search provider',
  group: 'input',
  attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
  status: 'completed',
  resultCode: status === 'running' ? 'run_started' : 'run_queued',
  message:
    status === 'running'
      ? 'Started an Amazon scan with the fallback image-search provider.'
      : 'Queued an Amazon scan with the fallback image-search provider.',
  details: [
    { label: 'Previous provider', value: fallback.currentProvider },
    { label: 'Fallback provider', value: fallback.fallbackProvider },
    { label: 'Rejection category', value: state.amazonEvaluation?.rejectionCategory ?? null },
  ],
  url: null,
});

const startFallbackProviderRun = async (
  context: AmazonProbeReadyContext,
  fallbackProvider: string
): ReturnType<typeof startPlaywrightEngineTask> => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return await startPlaywrightEngineTask({
    request: {
      runtimeKey: amazonProbeScanRuntime.runtimeKey,
      actionId: context.amazonRuntimeAction?.id ?? null,
      actionName: resolveAmazonProbeRuntimeActionName(context),
      selectorProfile: runtimeContext.amazonSelectorProfile,
      input: amazonProbeScanRuntime.buildRequestInput({
        productId: context.product.id,
        productName: context.scan.productName,
        existingAsin: context.product.asin,
        imageCandidates: context.scan.imageCandidates,
        imageSearchProvider: fallbackProvider,
        imageSearchPageUrl: runtimeContext.amazonImageSearchPageUrl,
        selectorProfile: runtimeContext.amazonSelectorProfile,
        allowManualVerification: runtimeContext.allowManualVerification,
        manualVerificationTimeoutMs: runtimeContext.manualVerificationTimeoutMs,
        triageOnlyOnAmazonCandidates: (
          await resolveAmazonTriageEvaluatorConfig(context.scannerSettings)
        ).enabled,
        probeOnlyOnAmazonMatch: true,
        ...context.requestedStepSequenceInput,
      }),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
        allowManualVerification: runtimeContext.allowManualVerification,
        manualVerificationTimeoutMs: runtimeContext.manualVerificationTimeoutMs,
      }),
      browserEngine: 'chromium',
      ...runtimeContext.scannerRuntimeOptions,
      capture: runtimeContext.diagnosticCapture,
      preventNewPages: true,
    },
    ownerUserId: resolveAmazonProbeOwnerUserId(context.scan),
    instance: createAmazonProbeTaskInstance({
      label: 'Amazon fallback provider scan',
      tags: ['product', 'amazon', 'scan', 'provider-fallback'],
    }),
  });
};

export const retryAmazonProbeWithFallbackProvider = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord | null> => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  const fallbackProvider = resolveFallbackProvider(
    context,
    state,
    runtimeContext.amazonImageSearchProvider
  );
  if (fallbackProvider === null) return null;

  try {
    const fallbackRun = await startFallbackProviderRun(context, fallbackProvider);
    const fallbackStatus = fallbackRun.status === 'running' ? 'running' : 'queued';
    const fallback = {
      currentProvider: runtimeContext.amazonImageSearchProvider,
      fallbackProvider,
    };
    return await persistFallbackProviderQueued({
      context,
      state,
      fallbackRun,
      fallbackStatus,
      fallback,
    });
  } catch (error) {
    return await persistFallbackProviderFailed(context, state, fallbackProvider, error);
  }
};

const persistFallbackProviderQueued = async (
  input: FallbackProviderQueuedInput
): Promise<ProductScanRecord> => {
  const { context, state, fallbackRun, fallbackStatus, fallback } = input;
  const providerHistory = resolveAmazonImageSearchProviderHistory(
    context.scan.rawResult,
    fallback.currentProvider
  );
  return await persistSynchronizedScan(context.scan, {
    engineRunId: fallbackRun.runId,
    status: fallbackStatus,
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: state.amazonEvaluation,
    steps: upsertPersistedProductScanStep(
      state.finalizedAmazonSteps,
      buildFallbackQueueStep(state, fallback, fallbackStatus)
    ),
    rawResult: buildFallbackProviderRawResult({ ...input, providerHistory }),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

const buildFallbackProviderRawResult = (input: FallbackRawResultInput): unknown => {
  const { context, state, fallbackRun, fallback, providerHistory } = input;
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return appendAmazonAiStageSummary(
    {
      ...createProductScanStartedRawResult({
        runId: fallbackRun.runId,
        status: fallbackRun.status,
        runtimeKey: amazonProbeScanRuntime.runtimeKey,
        actionId: context.amazonRuntimeAction?.id ?? null,
        selectorProfile: runtimeContext.amazonSelectorProfile,
        imageSearchProvider: fallback.fallbackProvider,
        imageSearchPageUrl: runtimeContext.amazonImageSearchPageUrl,
        imageSearchProviderHistory: [...providerHistory, fallback.fallbackProvider],
        allowManualVerification: runtimeContext.allowManualVerification,
        manualVerificationTimeoutMs: runtimeContext.manualVerificationTimeoutMs,
        previousRunId: context.engineRunId,
        previousResult: state.probeEvaluationRawResult,
        recordDiagnostics: runtimeContext.diagnosticCapture.trace === true,
        ...context.requestedStepSequenceInput,
      }),
      providerFallback: true,
      fallbackFromImageSearchProvider: fallback.currentProvider,
      fallbackToImageSearchProvider: fallback.fallbackProvider,
    },
    buildAmazonEvaluationStageSummary(state.amazonEvaluation, {
      stage: 'probe_evaluate',
      candidateRankBefore: resolveLatestRank(state),
      provider: fallback.currentProvider,
    })
  );
};

const resolveLatestRank = (state: AmazonProbeEvaluationState): number | null =>
  resolveLatestAmazonCandidateStepMeta(state.finalizedAmazonSteps).candidateRank;

const persistFallbackProviderFailed = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  fallbackProvider: string,
  error: unknown
): Promise<ProductScanRecord> => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  const fallbackMessage = normalizeErrorMessage(
    error instanceof Error ? error.message : error,
    'Failed to retry Amazon scan with the fallback image-search provider.'
  );
  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: 'failed',
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: state.amazonEvaluation,
    steps: upsertPersistedProductScanStep(state.finalizedAmazonSteps, {
      key: 'queue_scan',
      label: 'Retry with fallback image-search provider',
      group: 'input',
      attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
      status: 'failed',
      resultCode: 'run_start_failed',
      message: fallbackMessage,
      details: [
        { label: 'Previous provider', value: runtimeContext.amazonImageSearchProvider },
        { label: 'Fallback provider', value: fallbackProvider },
      ],
      url: null,
    }),
    rawResult: state.probeEvaluationRawResult,
    error: fallbackMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: fallbackMessage,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
