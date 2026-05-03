import 'server-only';

import type {
  ProductScanAmazonEvaluation,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';

import { evaluateProductScanCandidateMatch } from './product-scan-ai-evaluator';
import {
  normalizeErrorMessage,
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import {
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  buildAmazonEvaluationStepDetails,
  isApprovedAmazonCandidateExtractionRun,
  resolveAmazonEvaluationMessage,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonExtractionEvaluatorConfig,
  resolveAmazonImageSearchProvider,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextAmazonEvaluationStepAttempt,
} from './product-scans-service.helpers.amazon';
import {
  handleRejectedAmazonEvaluation,
} from './product-scans-sync-amazon-matched.rejection';
import type {
  AmazonRejectedMatchedContext,
} from './product-scans-sync-amazon-matched.rejection-context';
import type {
  AmazonMatchedContext,
  AmazonMatchedEvaluationResult,
} from './product-scans-sync-amazon-matched.types';

type EnabledExtractionEvaluatorConfig = Extract<
  Awaited<ReturnType<typeof resolveAmazonExtractionEvaluatorConfig>>,
  { enabled: true }
>;
type CandidateStepMeta = ReturnType<typeof resolveLatestAmazonCandidateStepMeta>;
type FailedAmazonEvaluation = NonNullable<ProductScanAmazonEvaluation> & {
  status: 'failed';
};

const buildEvaluationStep = (
  context: AmazonMatchedContext,
  amazonEvaluation: NonNullable<ProductScanAmazonEvaluation>,
  evaluatorConfig: EnabledExtractionEvaluatorConfig,
  latestCandidateMeta: CandidateStepMeta
): ProductScanRecord['steps'][number] => ({
  key: 'amazon_ai_evaluate',
  label: 'Evaluate Amazon candidate match',
  group: 'amazon',
  attempt: resolveNextAmazonEvaluationStepAttempt(context.finalizedAmazonSteps),
  candidateId: latestCandidateMeta.candidateId ?? context.parsedResult.matchedImageId,
  candidateRank: latestCandidateMeta.candidateRank,
  status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
  resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
  message: resolveAmazonEvaluationMessage(amazonEvaluation),
  details: buildAmazonEvaluationStepDetails(amazonEvaluation, evaluatorConfig, 'extraction'),
  url: amazonEvaluation.evidence?.candidateUrl ?? context.resolvedScanUrl ?? latestCandidateMeta.url,
});

const buildEvaluatedContext = (
  context: AmazonMatchedContext,
  amazonEvaluation: NonNullable<ProductScanAmazonEvaluation>,
  evaluatorConfig: EnabledExtractionEvaluatorConfig
): AmazonMatchedContext => {
  const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(context.finalizedAmazonSteps);
  return {
    ...context,
    amazonEvaluation,
    finalizedAmazonSteps: upsertPersistedProductScanStep(
      context.finalizedAmazonSteps,
      buildEvaluationStep(context, amazonEvaluation, evaluatorConfig, latestCandidateMeta)
    ),
    extractionEvaluationRawResult: appendAmazonAiStageSummary(
      context.resultValue,
      buildAmazonEvaluationStageSummary(amazonEvaluation, {
        stage: 'extraction_evaluate',
        candidateRankBefore: latestCandidateMeta.candidateRank,
        provider: resolveAmazonImageSearchProvider(context.scan.rawResult, context.scannerSettings),
      })
    ),
  };
};

const persistFailedEvaluationResult = async (
  context: AmazonMatchedContext
): Promise<ProductScanRecord> => {
  const message = resolveAmazonEvaluationMessage(context.amazonEvaluation);
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
    amazonEvaluation: context.amazonEvaluation,
    steps: context.finalizedAmazonSteps,
    rawResult: context.extractionEvaluationRawResult,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};

const buildFailedAmazonEvaluation = (
  context: AmazonMatchedContext,
  message: string
): FailedAmazonEvaluation => ({
  stage: 'extraction_evaluate',
  status: 'failed',
  sameProduct: null,
  imageMatch: null,
  descriptionMatch: null,
  pageRepresentsSameProduct: null,
  confidence: null,
  proceed: false,
  scrapeAllowed: false,
  recommendedAction: null,
  rejectionCategory: null,
  threshold: null,
  reasons: [],
  mismatches: [],
  mismatchLabels: [],
  variantAssessment: null,
  modelId: null,
  brainApplied: null,
  evidence: {
    candidateUrl: context.resolvedScanUrl,
    pageTitle: context.parsedResult.title,
    heroImageSource: null,
    heroImageArtifactName: null,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    productImageSource:
      context.scan.imageCandidates[0]?.url ?? context.scan.imageCandidates[0]?.filepath ?? null,
  },
  error: message,
  evaluatedAt: new Date().toISOString(),
});

const buildFailedEvaluationStep = (
  context: AmazonMatchedContext,
  amazonEvaluation: FailedAmazonEvaluation,
  message: string
): ProductScanRecord['steps'][number] => {
  const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(context.finalizedAmazonSteps);
  const evaluationCandidateUrl =
    amazonEvaluation.evidence?.candidateUrl ?? context.resolvedScanUrl ?? latestCandidateMeta.url;
  return {
    key: 'amazon_ai_evaluate',
    label: 'Evaluate Amazon candidate match',
    group: 'amazon',
    attempt: resolveNextAmazonEvaluationStepAttempt(context.finalizedAmazonSteps),
    candidateId: latestCandidateMeta.candidateId ?? context.parsedResult.matchedImageId,
    candidateRank: latestCandidateMeta.candidateRank,
    status: 'failed',
    resultCode: 'evaluation_failed',
    message,
    details: [
      { label: 'Candidate URL', value: evaluationCandidateUrl },
      { label: 'Error', value: message },
    ],
    url: evaluationCandidateUrl,
  };
};

const persistEvaluationException = async (
  context: AmazonMatchedContext,
  error: unknown
): Promise<ProductScanRecord> => {
  const message = normalizeErrorMessage(
    error instanceof Error ? error.message : error,
    'Amazon candidate AI evaluation failed.'
  );
  const amazonEvaluation = buildFailedAmazonEvaluation(context, message);
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
    amazonEvaluation,
    steps: upsertPersistedProductScanStep(
      context.finalizedAmazonSteps,
      buildFailedEvaluationStep(context, amazonEvaluation, message)
    ),
    rawResult: context.resultValue,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};

const resolveRejectedContext = (
  context: AmazonMatchedContext
): AmazonRejectedMatchedContext | null => {
  if (context.amazonEvaluation?.status !== 'rejected') return null;
  return context as AmazonRejectedMatchedContext;
};

const finalizeEvaluatedContext = async (
  context: AmazonMatchedContext
): Promise<AmazonMatchedEvaluationResult> => {
  if (context.amazonEvaluation?.status === 'failed') {
    return { context, finalScan: await persistFailedEvaluationResult(context) };
  }
  const rejectedContext = resolveRejectedContext(context);
  if (rejectedContext !== null) {
    return { context, finalScan: await handleRejectedAmazonEvaluation(rejectedContext) };
  }
  return { context, finalScan: null };
};

export const runAmazonExtractionEvaluation = async (
  context: AmazonMatchedContext
): Promise<AmazonMatchedEvaluationResult> => {
  try {
    const evaluatorConfig = await resolveAmazonExtractionEvaluatorConfig(context.scannerSettings);
    if (evaluatorConfig.enabled !== true || isApprovedAmazonCandidateExtractionRun(context.scan)) {
      return { context, finalScan: null };
    }
    const amazonEvaluation = await evaluateProductScanCandidateMatch({
      scan: context.scan,
      product: context.product,
      parsedResult: context.parsedResult,
      run: context.run,
      stage: 'extraction_evaluate',
      evaluatorConfig,
    });
    return await finalizeEvaluatedContext(
      buildEvaluatedContext(context, amazonEvaluation, evaluatorConfig)
    );
  } catch (error) {
    return { context, finalScan: await persistEvaluationException(context, error) };
  }
};
