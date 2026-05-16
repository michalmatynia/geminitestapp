import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  createPersistedProductScanStep,
  createProductScanStartedRawResult,
  persistSynchronizedScan,
  resolvePersistedProductScanSteps,
  shouldAutoShowScannerCaptchaBrowser,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import { resolveNextQueueStepAttempt } from './product-scans-service.helpers.amazon';
import type {
  FallbackRetryContext,
  FallbackRun,
} from './product-scans-sync-amazon-fallback';

const resolveFallbackRunStatus = (run: FallbackRun): 'queued' | 'running' =>
  run.status === 'running' ? 'running' : 'queued';

const buildFallbackQueueStep = (
  context: FallbackRetryContext,
  fallbackStatus: 'queued' | 'running',
  nextSteps: ProductScanRecord['steps']
): ProductScanRecord['steps'][number] => createPersistedProductScanStep({
  key: 'queue_scan',
  label: 'Retry with fallback image-search provider',
  attempt: resolveNextQueueStepAttempt(nextSteps),
  status: 'completed',
  resultCode: fallbackStatus === 'running' ? 'run_started' : 'run_queued',
  message:
    fallbackStatus === 'running'
      ? 'Started an Amazon scan with the fallback image-search provider.'
      : 'Queued an Amazon scan with the fallback image-search provider.',
  details: [
    { label: 'Previous provider', value: context.amazonImageSearchProvider },
    { label: 'Fallback provider', value: context.fallbackProvider },
    { label: 'Reason', value: 'Google Lens returned no Amazon candidate URLs.' },
  ],
  url: null,
});

const buildFallbackRawResult = (
  context: FallbackRetryContext,
  fallbackRun: FallbackRun
): unknown => ({
  ...createProductScanStartedRawResult({
    runId: fallbackRun.runId,
    status: fallbackRun.status,
    runtimeKey: context.currentAmazonRuntimeKey,
    actionId: context.currentAmazonRuntimeAction?.id ?? null,
    selectorProfile: context.amazonSelectorProfile,
    imageSearchProvider: context.fallbackProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    imageSearchProviderHistory: [...context.providerHistory, context.fallbackProvider],
    allowManualVerification: shouldAutoShowScannerCaptchaBrowser(context.scannerSettings),
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    previousRunId: context.engineRunId,
    previousResult: context.resultValue,
    recordDiagnostics: resolveAmazonScanDiagnosticCapture(context.scan.rawResult).trace === true,
    ...context.requestedStepSequenceInput,
  }),
  providerFallback: true,
  fallbackFromImageSearchProvider: context.amazonImageSearchProvider,
  fallbackToImageSearchProvider: context.fallbackProvider,
  fallbackTriggerStage: 'google_candidates',
});

export const persistAmazonFallbackProviderRun = async (
  context: FallbackRetryContext,
  fallbackRun: FallbackRun
): Promise<ProductScanRecord> => {
  const fallbackStatus = resolveFallbackRunStatus(fallbackRun);
  const nextSteps = resolvePersistedProductScanSteps(context.scan, context.parsedResult.steps);
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
    amazonEvaluation: context.existingAmazonEvaluation,
    steps: upsertPersistedProductScanStep(
      nextSteps,
      buildFallbackQueueStep(context, fallbackStatus, nextSteps)
    ),
    rawResult: buildFallbackRawResult(context, fallbackRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};
