import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server/engine-artifact-reader';
import type {
  ProductScanAmazonEvaluationEvidence,
  ProductScanAmazonEvaluationResult,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type { AmazonScanRuntimeResult } from './product-scans-service.helpers';
import {
  buildDeterministicMatchReasons,
  resolveAmazonEvaluationArtifactFileNames,
  resolveCandidateAsin,
  resolveCandidateUrl,
} from './product-scan-amazon.evidence';
import {
  isEnglishLanguageTag,
  resolveDeterministicLanguageDecision,
  type DeterministicLanguageDecision,
} from './product-scan-amazon-language';
import { createEvaluationResult } from './product-scan-amazon.results';
import { normalizeIdentifier, readOptionalString } from './product-scan-ai-evaluator.utils';

export type AmazonCandidateMatchInput = {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanRuntimeResult;
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'artifacts'>;
  stage?: 'probe_evaluate' | 'extraction_evaluate';
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
};

export type AmazonMatchEvaluationBase = {
  stage: NonNullable<ProductScanAmazonEvaluationResult['stage']>;
  threshold: number;
  modelId: string | null;
  brainApplied: Record<string, unknown> | null;
  evidence: ProductScanAmazonEvaluationEvidence;
};

export type AmazonMatchEvaluationContext = {
  evaluationBase: AmazonMatchEvaluationBase;
  deterministicLanguageDecision: DeterministicLanguageDecision;
  deterministicReasons: string[];
};

export const createAmazonMatchEvaluationContext = (
  input: AmazonCandidateMatchInput
): AmazonMatchEvaluationContext => {
  const evidenceArtifacts = resolveAmazonEvaluationArtifactFileNames(
    input.run,
    readOptionalString(input.parsedResult.amazonProbe?.artifactKey)
  );
  const evidence = createAmazonMatchEvidence(input, evidenceArtifacts);
  return {
    evaluationBase: {
      stage: input.stage ?? 'probe_evaluate',
      threshold: input.evaluatorConfig.threshold,
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
    },
    deterministicLanguageDecision: resolveDeterministicLanguageDecision({
      parsedResult: input.parsedResult,
      evaluatorConfig: input.evaluatorConfig,
    }),
    deterministicReasons: buildDeterministicMatchReasons(input.product, input.parsedResult),
  };
};

const createAmazonMatchEvidence = (
  input: AmazonCandidateMatchInput,
  evidenceArtifacts: {
    screenshotArtifactName: string | null;
    htmlArtifactName: string | null;
  }
): ProductScanAmazonEvaluationEvidence => ({
  candidateUrl: resolveCandidateUrl(input.parsedResult),
  pageTitle:
    readOptionalString(input.parsedResult.amazonProbe?.pageTitle) ??
    readOptionalString(input.parsedResult.title),
  sourceAsin: normalizeIdentifier(input.product.asin),
  candidateAsin: resolveCandidateAsin(input.parsedResult),
  heroImageSource: readOptionalString(input.parsedResult.amazonProbe?.heroImageUrl),
  heroImageArtifactName: readOptionalString(
    input.parsedResult.amazonProbe?.heroImageArtifactName
  ),
  screenshotArtifactName: evidenceArtifacts.screenshotArtifactName,
  htmlArtifactName: evidenceArtifacts.htmlArtifactName,
  productImageSource: null,
});

export const createLanguageRejectedAmazonMatchEvaluation = (
  context: AmazonMatchEvaluationContext
): ProductScanAmazonEvaluationResult => {
  const languageReason =
    context.deterministicLanguageDecision.reason ??
    'Amazon page content is not in the allowed language.';
  return createEvaluationResult({
    ...context.evaluationBase,
    status: 'rejected',
    pageLanguage: context.deterministicLanguageDecision.pageLanguage,
    languageConfidence: context.deterministicLanguageDecision.confidence,
    languageAccepted: false,
    languageReason,
    confidence: context.deterministicLanguageDecision.confidence,
    recommendedAction: 'try_next_candidate',
    rejectionCategory: 'language',
    reasons: [languageReason],
    mismatches: ['Amazon page content is not in English.'],
    mismatchLabels: ['language'],
    error: null,
  });
};

export const shouldRejectAmazonMatchForLanguage = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): boolean =>
  input.evaluatorConfig.rejectNonEnglishContent === true &&
  input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai' &&
  context.deterministicLanguageDecision.languageAccepted === false;

export const createDeterministicBypassAmazonMatchEvaluation = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): ProductScanAmazonEvaluationResult => {
  const scrapeAllowed =
    input.evaluatorConfig.rejectNonEnglishContent === false ||
    context.deterministicLanguageDecision.languageAccepted === true ||
    isEnglishLanguageTag(context.deterministicLanguageDecision.pageLanguage);
  return createEvaluationResult({
    ...context.evaluationBase,
    status: 'skipped',
    sameProduct: true,
    pageRepresentsSameProduct: true,
    pageLanguage: context.deterministicLanguageDecision.pageLanguage,
    languageConfidence: context.deterministicLanguageDecision.confidence,
    languageAccepted: resolveDeterministicBypassLanguageAccepted(input, context, scrapeAllowed),
    languageReason: context.deterministicLanguageDecision.reason,
    confidence: 1,
    proceed: true,
    scrapeAllowed,
    recommendedAction: 'accept',
    reasons: context.deterministicReasons,
    error: null,
  });
};

const resolveDeterministicBypassLanguageAccepted = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext,
  scrapeAllowed: boolean
): boolean | null => {
  if (input.evaluatorConfig.rejectNonEnglishContent === false) return true;
  return scrapeAllowed ? true : context.deterministicLanguageDecision.languageAccepted;
};
