import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  resolveAmazonEvaluationMessage,
} from './product-scans-service.helpers.amazon';
import { continueWithNextAmazonCandidate } from './product-scans-sync-amazon-probe.continuation';
import { retryAmazonProbeWithFallbackProvider } from './product-scans-sync-amazon-probe.fallback';
import type {
  AmazonProbeEvaluationState,
  AmazonProbeReadyContext,
} from './product-scans-sync-amazon-probe.types';

export const handleRejectedAmazonProbeEvaluation = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord> => {
  const fallbackResult = await retryAmazonProbeWithFallbackProvider(context, state);
  if (fallbackResult !== null) return fallbackResult;

  const continuationResult = await continueWithNextAmazonCandidate(context, state);
  if (continuationResult !== null) return continuationResult;

  return await persistRejectedAmazonProbeNoMatch(context, state);
};

const persistRejectedAmazonProbeNoMatch = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord> => {
  const message = resolveAmazonEvaluationMessage(state.amazonEvaluation);
  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: 'no_match',
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
      key: 'product_asin_update',
      label: 'Update product ASIN',
      group: 'product',
      status: 'skipped',
      resultCode: 'asin_not_needed',
      message:
        'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
      details: [{ label: 'Reason', value: message }],
      url: state.amazonEvaluation?.evidence?.candidateUrl ?? context.resolvedProbeUrl,
    }),
    rawResult: state.probeEvaluationRawResult,
    error: message,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
