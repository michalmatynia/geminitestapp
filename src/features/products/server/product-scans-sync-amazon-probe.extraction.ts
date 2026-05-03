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
  resolveAmazonImageSearchProviderHistory,
  resolveLatestAmazonCandidateStepMeta,
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

const resolveDirectAmazonCandidateRank = (state: AmazonProbeEvaluationState): number =>
  resolveLatestAmazonCandidateStepMeta(state.finalizedAmazonSteps).candidateRank ?? 1;

const startApprovedExtractionRun = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
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
        probeOnlyOnAmazonMatch: false,
        skipAmazonProbe: true,
        directAmazonCandidateUrl: context.resolvedProbeUrl,
        directMatchedImageId: context.parsedResult.matchedImageId,
        directAmazonCandidateRank: resolveDirectAmazonCandidateRank(state),
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
      label: 'Amazon approved candidate extraction',
      tags: ['product', 'amazon', 'scan', 'approved-candidate-extract'],
    }),
  });
};

export const startApprovedAmazonProbeExtraction = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord> => {
  const extractionRun = await startApprovedExtractionRun(context, state);
  const extractionRunStatus = extractionRun.status === 'running' ? 'running' : 'queued';
  return await persistSynchronizedScan(context.scan, {
    engineRunId: extractionRun.runId,
    status: extractionRunStatus,
    asin: context.parsedResult.asin,
    matchedImageId: context.parsedResult.matchedImageId,
    title: context.parsedResult.title,
    price: null,
    url: context.resolvedProbeUrl,
    description: context.parsedResult.description,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: state.amazonEvaluation,
    steps: buildApprovedExtractionSteps(context, state, extractionRunStatus),
    rawResult: buildApprovedExtractionRawResult(context, state, extractionRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

const buildApprovedExtractionSteps = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  extractionRunStatus: 'running' | 'queued'
): ProductScanRecord['steps'] => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return upsertPersistedProductScanStep(state.finalizedAmazonSteps, {
    key: 'queue_scan',
    label: 'Start approved Amazon extraction',
    group: 'input',
    attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
    status: 'completed',
    resultCode: extractionRunStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      extractionRunStatus === 'running'
        ? 'Started a direct Amazon extraction run after AI approval.'
        : 'Queued a direct Amazon extraction run after AI approval.',
    details: [
      { label: 'Candidate URL', value: context.resolvedProbeUrl },
      { label: 'Image search provider', value: runtimeContext.amazonImageSearchProvider },
    ],
    url: context.resolvedProbeUrl,
  });
};

const buildApprovedExtractionRawResult = (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  extractionRun: Awaited<ReturnType<typeof startPlaywrightEngineTask>>
): unknown => {
  const runtimeContext = resolveAmazonProbeRuntimeRequestContext(context);
  return {
    ...createProductScanStartedRawResult({
      runId: extractionRun.runId,
      status: extractionRun.status,
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
    approvedCandidateExtraction: true,
    approvedCandidateUrl: context.resolvedProbeUrl,
  };
};

export const persistApprovedAmazonProbeExtractionFailure = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState,
  error: unknown
): Promise<ProductScanRecord> => {
  const message = normalizeErrorMessage(
    error instanceof Error ? error.message : error,
    'Failed to continue with direct Amazon extraction after probe evaluation.'
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
      label: 'Start approved Amazon extraction',
      group: 'input',
      attempt: resolveNextQueueStepAttempt(state.finalizedAmazonSteps),
      status: 'failed',
      resultCode: 'run_start_failed',
      message,
      details: [{ label: 'Candidate URL', value: context.resolvedProbeUrl }],
      url: context.resolvedProbeUrl,
    }),
    rawResult: context.resultValue,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
