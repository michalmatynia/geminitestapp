import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { evaluateProductScanCandidateMatch } from './product-scan-ai-evaluator';
import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import {
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  buildAmazonEvaluationStepDetails,
  resolveAmazonEvaluationMessage,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonImageSearchProvider,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextAmazonEvaluationStepAttempt,
} from './product-scans-service.helpers.amazon';
import type {
  AmazonProbeEvaluationState,
  AmazonProbeReadyContext,
} from './product-scans-sync-amazon-probe.types';

export const evaluateAmazonProbeCandidate = async (
  context: AmazonProbeReadyContext,
  evaluatorConfig: Extract<ProductScannerAmazonCandidateEvaluatorResolvedConfig, { enabled: true }>
): Promise<AmazonProbeEvaluationState> => {
  const amazonEvaluation = await evaluateProductScanCandidateMatch({
    scan: context.scan,
    product: context.product,
    parsedResult: context.parsedResult,
    run: context.run,
    stage: 'probe_evaluate',
    evaluatorConfig,
  });
  const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(context.finalizedAmazonSteps);
  const finalizedAmazonSteps = upsertPersistedProductScanStep(context.finalizedAmazonSteps, {
    key: 'amazon_ai_evaluate',
    label: 'Evaluate Amazon candidate match',
    group: 'amazon',
    attempt: resolveNextAmazonEvaluationStepAttempt(context.finalizedAmazonSteps),
    candidateId: latestCandidateMeta.candidateId ?? context.parsedResult.matchedImageId,
    candidateRank: latestCandidateMeta.candidateRank,
    status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
    resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
    message: resolveAmazonEvaluationMessage(amazonEvaluation),
    details: buildAmazonEvaluationStepDetails(amazonEvaluation, evaluatorConfig, 'probe'),
    url:
      amazonEvaluation.evidence?.candidateUrl ??
      context.resolvedProbeUrl ??
      latestCandidateMeta.url,
  });
  const probeEvaluationRawResult = appendAmazonAiStageSummary(
    context.resultValue,
    buildAmazonEvaluationStageSummary(amazonEvaluation, {
      stage: 'probe_evaluate',
      candidateRankBefore: latestCandidateMeta.candidateRank,
      provider: resolveAmazonImageSearchProvider(context.scan.rawResult, context.scannerSettings),
    })
  );

  return {
    amazonEvaluation,
    finalizedAmazonSteps,
    probeEvaluationRawResult,
  };
};

export const createSkippedAmazonProbeEvaluationState = (
  context: AmazonProbeReadyContext
): AmazonProbeEvaluationState => ({
  amazonEvaluation: context.existingAmazonEvaluation,
  finalizedAmazonSteps: context.finalizedAmazonSteps,
  probeEvaluationRawResult: context.resultValue,
});

export const persistFailedAmazonProbeEvaluation = async (
  context: AmazonProbeReadyContext,
  state: AmazonProbeEvaluationState
): Promise<ProductScanRecord> => {
  const message = resolveAmazonEvaluationMessage(state.amazonEvaluation);
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
    steps: state.finalizedAmazonSteps,
    rawResult: state.probeEvaluationRawResult,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
