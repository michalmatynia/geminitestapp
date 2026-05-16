import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { resolveAmazonRuntimeActionName } from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import { buildProductScannerEngineRequestOptions } from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  createPersistedProductScanStep,
  createProductScanStartedRawResult,
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  appendAmazonAiStageSummary,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveNextAmazonCandidateUrl,
  resolveNextQueueStepAttempt,
} from './product-scans-service.helpers.amazon';
import { resolveScanOwnerUserId } from './product-scans-sync-amazon.runtime';
import {
  buildRejectedAiStageSummary,
  resolveRejectedQueueStatus,
  type RejectedQueueStatus,
  type RejectedRuntimeContext,
} from './product-scans-sync-amazon-matched.rejection-context';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type StartedRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
type NextRejectedCandidate = ReturnType<typeof resolveNextAmazonCandidateUrl> & {
  nextRank: number;
  nextUrl: string;
};
type RejectedContinuationContext = RejectedRuntimeContext & {
  nextCandidate: NextRejectedCandidate;
};
type CurrentRuntimeAction = NonNullable<
  RejectedContinuationContext['currentAmazonRuntimeAction']
>;

const resolveRejectedNextCandidate = (
  context: RejectedRuntimeContext
): NextRejectedCandidate | null => {
  if (context.amazonEvaluation.recommendedAction !== 'try_next_candidate') return null;
  const nextCandidate = resolveNextAmazonCandidateUrl({
    candidateUrls: context.parsedResult.candidateUrls,
    currentUrl: context.resolvedScanUrl,
  });
  if (nextCandidate.nextUrl === null || nextCandidate.nextRank === null) return null;
  return nextCandidate as NextRejectedCandidate;
};

const resolveCurrentActionExecutionSettings = (
  context: RejectedContinuationContext
): CurrentRuntimeAction['executionSettings'] | null =>
  context.currentAmazonRuntimeAction?.executionSettings ?? null;

const resolveCurrentActionPersonaId = (
  context: RejectedContinuationContext
): string | null => context.currentAmazonRuntimeAction?.personaId ?? null;

const resolveCurrentActionId = (
  context: RejectedContinuationContext
): string | null => context.currentAmazonRuntimeAction?.id ?? null;

const resolveCurrentActionName = (context: RejectedContinuationContext): string =>
  context.currentAmazonRuntimeAction?.name ??
  resolveAmazonRuntimeActionName(context.currentAmazonRuntimeKey);

const buildContinuationScannerRuntimeOptions = (
  context: RejectedContinuationContext
): ReturnType<typeof buildAmazonScannerRequestRuntimeOptions> =>
  buildAmazonScannerRequestRuntimeOptions({
    scannerSettings: context.scannerSettings,
    scannerEngineRequestOptions: buildProductScannerEngineRequestOptions(context.scannerSettings),
    actionExecutionSettings: resolveCurrentActionExecutionSettings(context),
    actionPersonaId: resolveCurrentActionPersonaId(context),
    runtimeKey: context.currentAmazonRuntimeKey,
  });

const buildContinuationRequestInput = (
  context: RejectedContinuationContext
): ReturnType<typeof amazonScanRuntime.buildRequestInput> =>
  amazonScanRuntime.buildRequestInput({
    productId: context.product.id,
    productName: context.scan.productName,
    existingAsin: context.product.asin,
    imageCandidates: context.scan.imageCandidates,
    runtimeKey: context.currentAmazonRuntimeKey,
    imageSearchProvider: context.amazonImageSearchProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    selectorProfile: context.amazonSelectorProfile,
    allowManualVerification: context.allowManualVerification,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    probeOnlyOnAmazonMatch: true,
    skipAmazonProbe: false,
    directAmazonCandidateUrl: context.nextCandidate.nextUrl,
    directAmazonCandidateUrls: context.nextCandidate.remainingCandidateUrls,
    directMatchedImageId: context.parsedResult.matchedImageId,
    directAmazonCandidateRank: context.nextCandidate.nextRank,
    ...context.requestedStepSequenceInput,
  });

const startRejectedCandidateContinuationRun = async (
  context: RejectedContinuationContext
): Promise<StartedRun> =>
  await startPlaywrightEngineTask({
    request: {
      runtimeKey: context.currentAmazonRuntimeKey,
      actionId: resolveCurrentActionId(context),
      actionName: resolveCurrentActionName(context),
      selectorProfile: context.amazonSelectorProfile,
      input: buildContinuationRequestInput(context),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs(context),
      browserEngine: 'chromium',
      ...buildContinuationScannerRuntimeOptions(context),
      capture: resolveAmazonScanDiagnosticCapture(context.scan.rawResult),
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(context.scan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: 'Amazon candidate continuation scan',
      tags: ['product', 'amazon', 'scan', 'candidate-continuation'],
    }),
  });

const buildRejectedContinuationQueueStep = (
  context: RejectedContinuationContext,
  status: RejectedQueueStatus
): ProductScanRecord['steps'][number] => createPersistedProductScanStep({
  key: 'queue_scan',
  label: 'Continue with next Amazon candidate',
  attempt: resolveNextQueueStepAttempt(context.finalizedAmazonSteps),
  status: 'completed',
  resultCode: status === 'running' ? 'run_started' : 'run_queued',
  message: status === 'running'
    ? 'Started the next Amazon candidate after extraction-stage AI rejection.'
    : 'Queued the next Amazon candidate after extraction-stage AI rejection.',
  details: [
    { label: 'Rejection category', value: context.amazonEvaluation.rejectionCategory },
    { label: 'Rejected candidate URL', value: context.resolvedScanUrl },
    { label: 'Next candidate URL', value: context.nextCandidate.nextUrl },
  ],
  url: context.nextCandidate.nextUrl,
});

const buildRejectedContinuationRawResult = (
  context: RejectedContinuationContext,
  continuationRun: StartedRun
): unknown =>
  appendAmazonAiStageSummary(
    {
      ...createProductScanStartedRawResult({
        runId: continuationRun.runId,
        status: continuationRun.status,
        runtimeKey: context.currentAmazonRuntimeKey,
        actionId: resolveCurrentActionId(context),
        selectorProfile: context.amazonSelectorProfile,
        imageSearchProvider: context.amazonImageSearchProvider,
        imageSearchPageUrl: context.amazonImageSearchPageUrl,
        imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
          context.scan.rawResult,
          context.amazonImageSearchProvider
        ),
        allowManualVerification: context.allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
        previousRunId: context.engineRunId,
        previousResult: context.extractionEvaluationRawResult,
        recordDiagnostics: context.diagnostics.enabled,
        ...context.requestedStepSequenceInput,
      }),
      candidateRejectedByAi: true,
      candidateContinuation: true,
      approvedCandidateExtraction: false,
      continuationCandidateUrls: context.nextCandidate.remainingCandidateUrls,
    },
    buildRejectedAiStageSummary(context)
  );

const persistRejectedCandidateContinuationRun = async (
  context: RejectedContinuationContext,
  continuationRun: StartedRun
): Promise<ProductScanRecord> => {
  const status = resolveRejectedQueueStatus(continuationRun.status);
  return await persistSynchronizedScan(context.scan, {
    engineRunId: continuationRun.runId,
    status,
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: context.nextCandidate.nextUrl,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: context.amazonEvaluation,
    steps: upsertPersistedProductScanStep(
      context.finalizedAmazonSteps,
      buildRejectedContinuationQueueStep(context, status)
    ),
    rawResult: buildRejectedContinuationRawResult(context, continuationRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

export const retryRejectedAmazonWithNextCandidate = async (
  context: RejectedRuntimeContext
): Promise<ProductScanRecord | null> => {
  const nextCandidate = resolveRejectedNextCandidate(context);
  if (nextCandidate === null) return null;
  const continuationContext = { ...context, nextCandidate };
  return await persistRejectedCandidateContinuationRun(
    continuationContext,
    await startRejectedCandidateContinuationRun(continuationContext)
  );
};
