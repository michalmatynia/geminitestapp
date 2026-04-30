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
  resolveAmazonImageSearchProviderHistory,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextAmazonCandidateUrl,
  resolveNextQueueStepAttempt,
  resolveAmazonScanRuntimeTimeoutMs,
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

type NextAmazonCandidate = ReturnType<typeof resolveNextAmazonCandidateUrl> & {
  nextUrl: string;
  nextRank: number;
};

type ContinuationQueuedInput = {
  context: AmazonProbeReadyContext;
  state: AmazonProbeEvaluationState;
  nextCandidate: NextAmazonCandidate;
  continuationRun: Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
  continuationStatus: 'running' | 'queued';
};

type ContinuationFailedInput = {
  context: AmazonProbeReadyContext;
  state: AmazonProbeEvaluationState;
  nextCandidate: NextAmazonCandidate;
  continuationRunId: string;
  error: unknown;
};

const isNextCandidateAvailable = (
  value: ReturnType<typeof resolveNextAmazonCandidateUrl>
): value is NextAmazonCandidate => value.nextUrl !== null && value.nextRank !== null;

const shouldContinueWithNextCandidate = (
  state: AmazonProbeEvaluationState,
  nextCandidate: ReturnType<typeof resolveNextAmazonCandidateUrl>
): nextCandidate is NextAmazonCandidate =>
  state.amazonEvaluation?.recommendedAction === 'try_next_candidate' &&
  isNextCandidateAvailable(nextCandidate);

const resolveContinuationRejectionKind = (state: AmazonProbeEvaluationState): string =>
  state.amazonEvaluation?.languageAccepted === false ? 'Language gate' : 'Product mismatch';

const resolveContinuationStartedMessage = (state: AmazonProbeEvaluationState): string =>
  state.amazonEvaluation?.languageAccepted === false
    ? 'Started the next Amazon candidate after language rejection.'
    : 'Started the next Amazon candidate after AI rejection.';

const resolveContinuationQueuedMessage = (state: AmazonProbeEvaluationState): string =>
  state.amazonEvaluation?.languageAccepted === false
    ? 'Queued the next Amazon candidate after language rejection.'
    : 'Queued the next Amazon candidate after AI rejection.';

const resolveContinuationMessage = (
  state: AmazonProbeEvaluationState,
  status: 'running' | 'queued'
): string =>
  status === 'running'
    ? resolveContinuationStartedMessage(state)
    : resolveContinuationQueuedMessage(state);

const startContinuationRun = async (
  context: AmazonProbeReadyContext,
  nextCandidate: NextAmazonCandidate
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
        imageSearchProvider: runtimeContext.amazonImageSearchProvider,
        imageSearchPageUrl: runtimeContext.amazonImageSearchPageUrl,
        selectorProfile: runtimeContext.amazonSelectorProfile,
        allowManualVerification: runtimeContext.allowManualVerification,
        manualVerificationTimeoutMs: runtimeContext.manualVerificationTimeoutMs,
        probeOnlyOnAmazonMatch: true,
        skipAmazonProbe: false,
        directAmazonCandidateUrl: nextCandidate.nextUrl,
        directAmazonCandidateUrls: nextCandidate.remainingCandidateUrls,
        directMatchedImageId: context.parsedResult.matchedImageId,
        directAmazonCandidateRank: nextCandidate.nextRank,
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
      label: 'Amazon candidate continuation scan',
      tags: ['product', 'amazon', 'scan', 'candidate-continuation'],
    }),
  });
};

export const continueWithNextAmazonCandidate = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord | null> => {
  const nextCandidate = resolveNextAmazonCandidateUrl({
    candidateUrls: context.parsedResult.candidateUrls,
    currentUrl: context.resolvedProbeUrl,
  });
  if (!shouldContinueWithNextCandidate(state, nextCandidate)) return null;

  let continuationRunId = context.engineRunId;
  try {
    const continuationRun = await startContinuationRun(context, nextCandidate);
    continuationRunId = continuationRun.runId;
    const continuationStatus = continuationRun.status === 'running' ? 'running' : 'queued';
    return await persistContinuationQueued({
      context,
      state,
      nextCandidate,
      continuationRun,
      continuationStatus,
    });
  } catch (error) {
    return await persistContinuationFailed({
      context,
      state,
      nextCandidate,
      continuationRunId,
      error,
    });
  }
};

const persistContinuationQueued = async (input: ContinuationQueuedInput): Promise<ProductScanRecord> => {
  const { context, state, nextCandidate, continuationRun, continuationStatus } = input;
  return await persistSynchronizedScan(input.context.scan, {
    engineRunId: input.continuationRun.runId,
    status: input.continuationStatus,
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: input.nextCandidate.nextUrl,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: state.amazonEvaluation,
    steps: buildContinuationSteps(context, state, nextCandidate, continuationStatus),
    rawResult: buildContinuationRawResult(context, state, nextCandidate, continuationRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

const buildContinuationSteps = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  nextCandidate: NextAmazonCandidate,
  continuationStatus: 'running' | 'queued'
): ProductScanRecord['steps'] => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return upsertPersistedProductScanStep(state.finalizedAmazonSteps, {
    key: 'queue_scan',
    label: 'Continue with next Amazon candidate',
    group: 'input',
    attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
    status: 'completed',
    resultCode: continuationStatus === 'running' ? 'run_started' : 'run_queued',
    message: resolveContinuationMessage(state, continuationStatus),
    details: [
      { label: 'Rejection kind', value: resolveContinuationRejectionKind(state) },
      { label: 'Rejected candidate URL', value: context.resolvedProbeUrl },
      { label: 'Next candidate URL', value: nextCandidate.nextUrl },
      { label: 'Image search provider', value: runtimeContext.amazonImageSearchProvider },
    ],
    url: nextCandidate.nextUrl,
  });
};

const buildContinuationRawResult = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  nextCandidate: NextAmazonCandidate,
  continuationRun: Awaited<ReturnType<typeof startPlaywrightEngineTask>>
): unknown => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return appendAmazonAiStageSummary(
    {
      ...createProductScanStartedRawResult({
        runId: continuationRun.runId,
        status: continuationRun.status,
        runtimeKey: amazonProbeScanRuntime.runtimeKey,
        actionId: context.amazonRuntimeAction?.id ?? null,
        selectorProfile: runtimeContext.amazonSelectorProfile,
        imageSearchProvider: runtimeContext.amazonImageSearchProvider,
        imageSearchPageUrl: runtimeContext.amazonImageSearchPageUrl,
        imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
          context.scan.rawResult,
          runtimeContext.amazonImageSearchProvider
        ),
        allowManualVerification: runtimeContext.allowManualVerification,
        manualVerificationTimeoutMs: runtimeContext.manualVerificationTimeoutMs,
        previousRunId: context.engineRunId,
        previousResult: state.probeEvaluationRawResult,
        recordDiagnostics: runtimeContext.diagnosticCapture.trace === true,
        ...context.requestedStepSequenceInput,
      }),
      candidateRejectedByAi: true,
      candidateContinuation: true,
      approvedCandidateExtraction: false,
      continuationCandidateUrls: nextCandidate.remainingCandidateUrls,
    },
    buildAmazonEvaluationStageSummary(state.amazonEvaluation, {
      stage: 'probe_evaluate',
      candidateRankBefore: resolveLatestAmazonCandidateStepMeta(state.finalizedAmazonSteps)
        .candidateRank,
      provider: runtimeContext.amazonImageSearchProvider,
    })
  );
};

const resolveContinuationFailureMessage = (
  state: AmazonProbeEvaluationState,
  error: unknown
): string =>
  normalizeErrorMessage(
    error instanceof Error ? error.message : error,
    state.amazonEvaluation?.languageAccepted === false
      ? 'Failed to continue with the next Amazon candidate after language rejection.'
      : 'Failed to continue with the next Amazon candidate after AI rejection.'
  );

const persistContinuationFailed = async (input: ContinuationFailedInput): Promise<ProductScanRecord> => {
  const { context, state, nextCandidate, continuationRunId, error } = input;
  const continuationMessage = resolveContinuationFailureMessage(state, error);
  return await persistSynchronizedScan(context.scan, {
    engineRunId: continuationRunId,
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
    steps: buildContinuationFailureSteps(context, state, nextCandidate, continuationMessage),
    rawResult: state.probeEvaluationRawResult,
    error: continuationMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: continuationMessage,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};

const buildContinuationFailureSteps = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  nextCandidate: NextAmazonCandidate,
  continuationMessage: string
): ProductScanRecord['steps'] =>
  upsertPersistedProductScanStep(state.finalizedAmazonSteps, {
    key: 'queue_scan',
    label: 'Continue with next Amazon candidate',
    group: 'input',
    attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
    status: 'failed',
    resultCode: 'run_start_failed',
    message: continuationMessage,
    details: [
      { label: 'Rejection kind', value: resolveContinuationRejectionKind(state) },
      { label: 'Rejected candidate URL', value: context.resolvedProbeUrl },
      { label: 'Next candidate URL', value: nextCandidate.nextUrl },
    ],
    url: nextCandidate.nextUrl,
  });
