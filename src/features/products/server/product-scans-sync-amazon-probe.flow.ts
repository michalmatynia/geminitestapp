import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { resolveAmazonProbeEvaluatorConfig } from './product-scans-service.helpers.amazon';
import {
  createSkippedAmazonProbeEvaluationState,
  evaluateAmazonProbeCandidate,
  persistFailedAmazonProbeEvaluation,
} from './product-scans-sync-amazon-probe.evaluation';
import {
  persistApprovedAmazonProbeExtractionFailure,
  startApprovedAmazonProbeExtraction,
} from './product-scans-sync-amazon-probe.extraction';
import { handleRejectedAmazonProbeEvaluation } from './product-scans-sync-amazon-probe.rejection';
import type {
  AmazonProbeEvaluationState,
  AmazonProbeReadyContext,
} from './product-scans-sync-amazon-probe.types';

const shouldRunProbeEvaluator = (
  evaluatorConfig: Awaited<ReturnType<typeof resolveAmazonProbeEvaluatorConfig>>
): boolean => evaluatorConfig.enabled;

const resolveProbeEvaluationState = async (
  context: AmazonProbeReadyContext
): Promise<AmazonProbeEvaluationState> => {
  const evaluatorConfig = await resolveAmazonProbeEvaluatorConfig(context.scannerSettings);
  if (shouldRunProbeEvaluator(evaluatorConfig) === false) {
    return createSkippedAmazonProbeEvaluationState(context);
  }
  return await evaluateAmazonProbeCandidate(context, evaluatorConfig);
};

export const synchronizeAmazonProbeReadyWithProduct = async (
  context: AmazonProbeReadyContext
): Promise<ProductScanRecord> => {
  let state = createSkippedAmazonProbeEvaluationState(context);

  try {
    state = await resolveProbeEvaluationState(context);
    if (state.amazonEvaluation?.status === 'failed') {
      return await persistFailedAmazonProbeEvaluation(context, state);
    }
    if (state.amazonEvaluation?.status === 'rejected') {
      return await handleRejectedAmazonProbeEvaluation(context, state);
    }
    return await startApprovedAmazonProbeExtraction(context, state);
  } catch (error) {
    return await persistApprovedAmazonProbeExtractionFailure(context, state, error);
  }
};
