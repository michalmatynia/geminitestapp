import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';

import {
  evaluateProductScanCandidateTriage,
  type ProductScanCandidateTriageEvaluationResult,
} from './product-scan-ai-evaluator';
import {
  appendAmazonAiStageSummary,
  buildAmazonCandidateTriageStageSummary,
  buildAmazonCandidateTriageStepDetails,
  resolveAmazonCandidateTriageMessage,
  resolveAmazonCandidateTriageStepResultCode,
  resolveAmazonCandidateTriageStepStatus,
  resolveAmazonImageSearchFallbackProvider,
  resolveNextAmazonCandidateTriageStepAttempt,
} from './product-scans-service.helpers.amazon';
import type { resolveAmazonImageSearchProvider } from './product-scans-service.helpers.amazon';
import {
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';

type AmazonImageSearchProvider = ReturnType<typeof resolveAmazonImageSearchProvider>;

export type AmazonTriageSelectedCandidate = {
  selectedCandidateUrls: string[];
  selectedCandidateUrl: string;
  selectedCandidateRank: number;
};

const buildAmazonTriageBaselineCandidates = (
  parsedResult: AmazonScanRuntimeResult
): ProductScanCandidateTriageEvaluationResult['candidates'] =>
  parsedResult.candidateResults.length > 0
    ? parsedResult.candidateResults.map((candidate, index) => ({
        url: candidate.url,
        rankBefore:
          typeof candidate.rank === 'number' && Number.isFinite(candidate.rank)
            ? candidate.rank
            : index + 1,
        rankAfter: index + 1,
        confidence: null,
        keep: true,
        asin: candidate.asin,
        marketplaceDomain: candidate.marketplaceDomain,
        title: candidate.title,
        snippet: candidate.snippet,
        pageLanguage: null,
        languageAccepted: null,
        recommendedAction: 'accept',
        rejectionCategory: null,
        reasons: [],
        mismatchLabels: [],
      }))
    : parsedResult.candidateUrls.map((url: string, index: number) => ({
        url,
        rankBefore: index + 1,
        rankAfter: index + 1,
        confidence: null,
        keep: true,
        asin: null,
        marketplaceDomain: null,
        title: null,
        snippet: null,
        pageLanguage: null,
        languageAccepted: null,
        recommendedAction: 'accept',
        rejectionCategory: null,
        reasons: [],
        mismatchLabels: [],
      }));

const buildSkippedAmazonTriageEvaluation = (
  parsedResult: AmazonScanRuntimeResult,
  currentProvider: AmazonImageSearchProvider
): ProductScanCandidateTriageEvaluationResult => {
  const candidates = buildAmazonTriageBaselineCandidates(parsedResult);
  return {
    status: 'skipped',
    stage: 'candidate_triage',
    confidence: 1,
    threshold: null,
    recommendedAction: 'accept',
    rejectionCategory: null,
    reasons: ['Candidate triage was disabled before synchronization.'],
    mismatchLabels: [],
    modelId: null,
    brainApplied: null,
    candidates,
    keptCandidateUrls:
      parsedResult.candidateUrls.length > 0
        ? parsedResult.candidateUrls
        : candidates.map((candidate) => candidate.url),
    provider: currentProvider,
    error: null,
    evaluatedAt: new Date().toISOString(),
  };
};

export const resolveAmazonTriageEvaluation = async (input: {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanRuntimeResult;
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig;
  currentProvider: AmazonImageSearchProvider;
}): Promise<ProductScanCandidateTriageEvaluationResult> => {
  if (!input.evaluatorConfig.enabled) {
    return buildSkippedAmazonTriageEvaluation(input.parsedResult, input.currentProvider);
  }
  return await evaluateProductScanCandidateTriage({
    scan: input.scan,
    product: input.product,
    parsedResult: input.parsedResult,
    evaluatorConfig: input.evaluatorConfig,
    provider: input.currentProvider,
  });
};

export const appendAmazonTriageStep = (input: {
  steps: ProductScanRecord['steps'];
  parsedResult: AmazonScanRuntimeResult;
  triageEvaluation: ProductScanCandidateTriageEvaluationResult;
  triageEvaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig;
  currentProvider: AmazonImageSearchProvider;
}): ProductScanRecord['steps'] =>
  upsertPersistedProductScanStep(input.steps, {
    key: 'amazon_ai_triage',
    label: 'Triage Amazon candidates',
    group: 'amazon',
    attempt: resolveNextAmazonCandidateTriageStepAttempt(input.steps),
    candidateId: input.parsedResult.matchedImageId,
    candidateRank: input.triageEvaluation.candidates[0]?.rankBefore ?? null,
    status: resolveAmazonCandidateTriageStepStatus(input.triageEvaluation),
    resultCode: resolveAmazonCandidateTriageStepResultCode(input.triageEvaluation),
    message: resolveAmazonCandidateTriageMessage(input.triageEvaluation),
    details: buildAmazonCandidateTriageStepDetails(
      input.triageEvaluation,
      input.triageEvaluatorConfig,
      input.currentProvider
    ),
    url: input.triageEvaluation.candidates[0]?.url ?? input.parsedResult.candidateUrls[0] ?? null,
  });

export const buildAmazonTriageRawResult = (
  resultValue: unknown,
  triageEvaluation: ProductScanCandidateTriageEvaluationResult,
  currentProvider: AmazonImageSearchProvider
): unknown =>
  appendAmazonAiStageSummary(
    resultValue,
    buildAmazonCandidateTriageStageSummary(triageEvaluation, currentProvider)
  );

export const resolveAmazonTriageFallbackProvider = (input: {
  scan: ProductScanRecord;
  scannerSettings: ProductScannerSettings;
  currentProvider: AmazonImageSearchProvider;
  triageEvaluation: ProductScanCandidateTriageEvaluationResult;
}): AmazonImageSearchProvider | null => {
  if (input.triageEvaluation.recommendedAction !== 'fallback_provider') return null;
  return resolveAmazonImageSearchFallbackProvider({
    rawResult: input.scan.rawResult,
    scannerSettings: input.scannerSettings,
    currentProvider: input.currentProvider,
    imageCandidates: input.scan.imageCandidates,
  });
};

export const resolveAmazonTriageSelectedCandidate = (
  triageEvaluation: ProductScanCandidateTriageEvaluationResult,
  parsedResult: AmazonScanRuntimeResult
): AmazonTriageSelectedCandidate | null => {
  const selectedCandidateUrls =
    triageEvaluation.keptCandidateUrls.length > 0
      ? triageEvaluation.keptCandidateUrls
      : parsedResult.candidateUrls;
  const selectedCandidateUrl = selectedCandidateUrls[0] ?? null;
  if (selectedCandidateUrl === null) return null;
  const selectedCandidate = triageEvaluation.candidates.find(
    (candidate) => candidate.url === selectedCandidateUrl
  );
  return {
    selectedCandidateUrls,
    selectedCandidateUrl,
    selectedCandidateRank: selectedCandidate?.rankAfter ?? selectedCandidate?.rankBefore ?? 1,
  };
};
