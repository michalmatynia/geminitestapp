import type {
  ProductScanner1688CandidateEvaluator,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage,
  ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode,
  ProductScannerAmazonCandidateEvaluatorMode,
  ProductScannerAmazonCandidateEvaluatorSimilarityMode,
} from '@/shared/contracts/products/scanner-settings';

import {
  DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE,
  DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE,
  DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE,
  DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE,
  DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD,
  createDefaultProductScanner1688CandidateEvaluator,
  createDefaultProductScannerAmazonCandidateEvaluator,
} from './scanner-settings.defaults';

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeNullableTrimmedString = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const normalizeProductScannerAmazonCandidateEvaluatorMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorMode =>
  value === 'brain_default' || value === 'model_override'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorAllowedContentLanguage = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage =>
  value === 'en'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE;

const normalizeProductScannerAmazonCandidateEvaluatorLanguageDetectionMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode =>
  value === 'deterministic_then_ai' || value === 'ai_only'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorSimilarityMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorSimilarityMode =>
  value === 'deterministic_then_ai'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorThreshold = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD;
  }

  return Math.min(1, Math.max(0, value));
};

export const normalizeProductScannerAmazonCandidateEvaluator = (
  value: unknown
): ProductScannerAmazonCandidateEvaluator => {
  if (!isRecordObject(value)) {
    return createDefaultProductScannerAmazonCandidateEvaluator();
  }

  const candidateSimilarityMode = normalizeProductScannerAmazonCandidateEvaluatorSimilarityMode(
    value['candidateSimilarityMode']
  );

  return {
    mode: normalizeProductScannerAmazonCandidateEvaluatorMode(value['mode']),
    modelId: normalizeNullableTrimmedString(value['modelId'], 200),
    threshold: normalizeProductScannerAmazonCandidateEvaluatorThreshold(value['threshold']),
    onlyForAmbiguousCandidates:
      candidateSimilarityMode === 'ai_only'
        ? false
        : value['onlyForAmbiguousCandidates'] !== false,
    candidateSimilarityMode,
    allowedContentLanguage: normalizeProductScannerAmazonCandidateEvaluatorAllowedContentLanguage(
      value['allowedContentLanguage']
    ),
    rejectNonEnglishContent: value['rejectNonEnglishContent'] !== false,
    languageDetectionMode: normalizeProductScannerAmazonCandidateEvaluatorLanguageDetectionMode(
      value['languageDetectionMode']
    ),
    systemPrompt: normalizeNullableTrimmedString(value['systemPrompt'], 4000),
  };
};

export const normalizeProductScanner1688CandidateEvaluator = (
  value: unknown
): ProductScanner1688CandidateEvaluator => {
  if (!isRecordObject(value)) {
    return createDefaultProductScanner1688CandidateEvaluator();
  }

  return {
    mode: normalizeProductScannerAmazonCandidateEvaluatorMode(value['mode']),
    modelId: normalizeNullableTrimmedString(value['modelId'], 200),
    threshold: normalizeProductScannerAmazonCandidateEvaluatorThreshold(value['threshold']),
    onlyForAmbiguousCandidates: value['onlyForAmbiguousCandidates'] !== false,
    systemPrompt: normalizeNullableTrimmedString(value['systemPrompt'], 4000),
  };
};
