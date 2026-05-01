import 'server-only';

import type { z } from 'zod';

import type { ProductScanAmazonEvaluationResult } from '@/shared/contracts/product-scans';

import type { amazonEvaluatorResponseSchema } from './product-scan-ai-evaluator.schema';
import { readOptionalString } from './product-scan-ai-evaluator.utils';
import {
  normalizeLanguageTag,
} from './product-scan-amazon-language';
import {
  createEvaluationResult,
  dedupeMismatchLabels,
  normalizeVariantAssessment,
  resolveAmazonRecommendedAction,
  resolveAmazonRejectionCategory,
} from './product-scan-amazon.results';
import type {
  AmazonCandidateMatchInput,
  AmazonMatchEvaluationContext,
} from './product-scan-amazon-match.context';

type ParsedAmazonEvaluation = z.infer<typeof amazonEvaluatorResponseSchema>;
type VariantAssessment = NonNullable<ProductScanAmazonEvaluationResult['variantAssessment']>;

const VARIANT_MISMATCH_LABELS: Array<{
  key: keyof VariantAssessment;
  label: ProductScanAmazonEvaluationResult['mismatchLabels'][number];
}> = [
  { key: 'brand', label: 'brand' },
  { key: 'model', label: 'model' },
  { key: 'color', label: 'color' },
  { key: 'material', label: 'material' },
  { key: 'size', label: 'size' },
  { key: 'packCount', label: 'pack_count' },
  { key: 'characterThemeLicense', label: 'character_theme_license' },
];

export const createAmazonMatchEvaluationFromParsed = (input: {
  matchInput: AmazonCandidateMatchInput;
  context: AmazonMatchEvaluationContext;
  parsed: ParsedAmazonEvaluation;
  modelId: string | null;
}): ProductScanAmazonEvaluationResult => {
  const languageAccepted = resolveLanguageAccepted(input);
  const languageReason =
    readOptionalString(input.parsed.languageReason) ??
    input.context.deterministicLanguageDecision.reason;
  const variantAssessment = normalizeVariantAssessment(input.parsed.variantAssessment);
  const mismatchLabels = buildMismatchLabels(input.parsed, variantAssessment, languageAccepted);
  const approved = isAmazonMatchApproved(input, languageAccepted);
  const reasons = buildReasons(input, languageAccepted, languageReason);
  const mismatches = buildMismatches(input, languageAccepted);
  const rejectionCategory = resolveAmazonRejectionCategory({
    approved,
    languageAccepted,
    parsedRejectionCategory: input.parsed.rejectionCategory,
    mismatchLabels,
    sameProduct: input.parsed.sameProduct,
    pageRepresentsSameProduct: input.parsed.pageRepresentsSameProduct,
    confidence: input.parsed.confidence,
    threshold: input.matchInput.evaluatorConfig.threshold,
  });
  return createEvaluationResult({
    ...input.context.evaluationBase,
    status: approved ? 'approved' : 'rejected',
    sameProduct: input.parsed.sameProduct,
    imageMatch: input.parsed.imageMatch,
    descriptionMatch: input.parsed.descriptionMatch,
    pageRepresentsSameProduct: input.parsed.pageRepresentsSameProduct,
    pageLanguage: resolvePageLanguage(input),
    languageConfidence: resolveLanguageConfidence(input),
    languageAccepted,
    languageReason,
    confidence: input.parsed.confidence,
    proceed: approved,
    scrapeAllowed: approved && languageAccepted !== false,
    recommendedAction: resolveAmazonRecommendedAction({
      approved,
      parsedRecommendedAction: input.parsed.recommendedAction,
      rejectionCategory,
    }),
    rejectionCategory,
    reasons,
    mismatches,
    mismatchLabels,
    variantAssessment,
    modelId: input.modelId,
    error: null,
  });
};

const resolveLanguageAccepted = (input: {
  matchInput: AmazonCandidateMatchInput;
  context: AmazonMatchEvaluationContext;
  parsed: ParsedAmazonEvaluation;
}): boolean | null => {
  if (input.matchInput.evaluatorConfig.rejectNonEnglishContent === false) return true;
  if (typeof input.parsed.languageAccepted === 'boolean') return input.parsed.languageAccepted;
  if (input.matchInput.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai') {
    return input.context.deterministicLanguageDecision.languageAccepted;
  }
  return null;
};

const resolvePageLanguage = (input: {
  context: AmazonMatchEvaluationContext;
  parsed: ParsedAmazonEvaluation;
}): string | null =>
  normalizeLanguageTag(input.parsed.pageLanguage) ??
  input.context.deterministicLanguageDecision.pageLanguage;

const resolveLanguageConfidence = (input: {
  context: AmazonMatchEvaluationContext;
  parsed: ParsedAmazonEvaluation;
}): number | null =>
  typeof input.parsed.languageConfidence === 'number'
    ? input.parsed.languageConfidence
    : input.context.deterministicLanguageDecision.confidence;

const isAmazonMatchApproved = (
  input: {
    matchInput: AmazonCandidateMatchInput;
    parsed: ParsedAmazonEvaluation;
  },
  languageAccepted: boolean | null
): boolean =>
  input.parsed.proceed === true &&
  input.parsed.sameProduct === true &&
  input.parsed.pageRepresentsSameProduct === true &&
  input.parsed.imageMatch !== false &&
  input.parsed.descriptionMatch !== false &&
  isLanguageGatePassed(input.matchInput, languageAccepted) &&
  input.parsed.confidence >= input.matchInput.evaluatorConfig.threshold;

const isLanguageGatePassed = (
  input: AmazonCandidateMatchInput,
  languageAccepted: boolean | null
): boolean => {
  if (input.evaluatorConfig.rejectNonEnglishContent === false) return true;
  if (input.evaluatorConfig.languageDetectionMode === 'ai_only') return languageAccepted === true;
  return languageAccepted !== false;
};

const buildMismatchLabels = (
  parsed: ParsedAmazonEvaluation,
  variantAssessment: ProductScanAmazonEvaluationResult['variantAssessment'],
  languageAccepted: boolean | null
): ProductScanAmazonEvaluationResult['mismatchLabels'] =>
  dedupeMismatchLabels([
    ...parsed.mismatchLabels,
    ...collectVariantMismatchLabels(variantAssessment),
    languageAccepted === false ? 'language' : null,
    parsed.sameProduct === false || parsed.pageRepresentsSameProduct === false ? 'wrong_product' : null,
  ]);

const collectVariantMismatchLabels = (
  variantAssessment: ProductScanAmazonEvaluationResult['variantAssessment']
): ProductScanAmazonEvaluationResult['mismatchLabels'] => {
  if (variantAssessment === null) return [];
  return VARIANT_MISMATCH_LABELS
    .filter(({ key }) => variantAssessment[key] === 'mismatch')
    .map(({ label }) => label);
};

const buildReasons = (
  input: {
    matchInput: AmazonCandidateMatchInput;
    parsed: ParsedAmazonEvaluation;
  },
  languageAccepted: boolean | null,
  languageReason: string | null
): string[] => {
  const reasons = [...input.parsed.reasons];
  if (isAiLanguageVerdictMissing(input, languageAccepted)) {
    prependUnique(reasons, 'AI evaluator did not return a language verdict for the Amazon page.');
  }
  if (languageAccepted === false && languageReason !== null) prependUnique(reasons, languageReason);
  return reasons;
};

const isAiLanguageVerdictMissing = (
  input: {
    matchInput: AmazonCandidateMatchInput;
  },
  languageAccepted: boolean | null
): boolean =>
  input.matchInput.evaluatorConfig.rejectNonEnglishContent === true &&
  input.matchInput.evaluatorConfig.languageDetectionMode === 'ai_only' &&
  languageAccepted === null;

const prependUnique = (values: string[], value: string): void => {
  if (values.includes(value) === false) values.unshift(value);
};

const buildMismatches = (
  input: {
    matchInput: AmazonCandidateMatchInput;
    parsed: ParsedAmazonEvaluation;
  },
  languageAccepted: boolean | null
): string[] => {
  const mismatches = [...input.parsed.mismatches];
  if (isAiLanguageVerdictMissing(input, languageAccepted)) {
    appendUnique(mismatches, 'Amazon page language could not be verified.');
  }
  if (
    languageAccepted === false &&
    mismatches.some((entry) => /language|english/i.test(entry)) === false
  ) {
    mismatches.push('Amazon page content is not in English.');
  }
  return mismatches;
};

const appendUnique = (values: string[], value: string): void => {
  if (values.includes(value) === false) values.push(value);
};
