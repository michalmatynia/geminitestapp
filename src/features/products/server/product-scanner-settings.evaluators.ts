import 'server-only';

import type {
  ProductScanner1688CandidateEvaluator,
  ProductScannerAmazonCandidateEvaluator,
} from '@/shared/contracts/products/scanner-settings';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';

import {
  createDefaultProductScanner1688CandidateEvaluator,
  createDefaultProductScannerAmazonCandidateEvaluator,
} from '../scanner-settings';

export const DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT =
  'Evaluate whether the Amazon page represents the same product as the source product. Compare the visible product image, title, description, and key attributes. Also judge whether the visible Amazon page content is English enough to trust scraping into English product fields. Return a conservative judgment and reject mismatches or non-English pages when required.';

export const DEFAULT_AMAZON_CANDIDATE_TRIAGE_SYSTEM_PROMPT =
  'Review lightweight Amazon candidate search results before any Amazon page is opened. Rank likely matches first, discard obvious wrong products, and prefer marketplaces that fit the allowed content language. Stay conservative and keep this decision cheap.';

const DEFAULT_1688_CANDIDATE_EVALUATOR_SYSTEM_PROMPT =
  'Evaluate whether the 1688 supplier product page represents the same product as the source product. Compare the source product image, the supplier page title, extracted supplier images, pricing, and supplier screenshot. Approve only when the supplier page clearly matches the same product or close variant intended for sourcing.';

export type ProductScannerAmazonCandidateEvaluatorResolvedConfig =
    | {
      enabled: false;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      candidateSimilarityMode: ProductScannerAmazonCandidateEvaluator['candidateSimilarityMode'];
      allowedContentLanguage: ProductScannerAmazonCandidateEvaluator['allowedContentLanguage'];
      rejectNonEnglishContent: boolean;
      languageDetectionMode: ProductScannerAmazonCandidateEvaluator['languageDetectionMode'];
      modelId: null;
      systemPrompt: null;
      brainApplied: null;
    }
  | {
      enabled: true;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      candidateSimilarityMode: ProductScannerAmazonCandidateEvaluator['candidateSimilarityMode'];
      allowedContentLanguage: ProductScannerAmazonCandidateEvaluator['allowedContentLanguage'];
      rejectNonEnglishContent: boolean;
      languageDetectionMode: ProductScannerAmazonCandidateEvaluator['languageDetectionMode'];
      modelId: string;
      systemPrompt: string;
      brainApplied: Record<string, unknown> | null;
    };

export type ProductScanner1688CandidateEvaluatorResolvedConfig =
  | {
      enabled: false;
      mode: ProductScanner1688CandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      modelId: null;
      systemPrompt: null;
      brainApplied: null;
    }
  | {
      enabled: true;
      mode: ProductScanner1688CandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      modelId: string;
      systemPrompt: string;
      brainApplied: Record<string, unknown> | null;
    };

type AmazonCandidateEvaluatorConfigOptions = {
  defaultSystemPrompt: string;
  runtimeKind: 'chat' | 'vision';
};

const DEFAULT_AMAZON_CANDIDATE_EVALUATOR_CONFIG_OPTIONS: AmazonCandidateEvaluatorConfigOptions = {
  defaultSystemPrompt: DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT,
  runtimeKind: 'vision',
};

const resolveOptionalPrompt = (
  value: string | null | undefined,
  defaultSystemPrompt: string
): string => {
  const trimmed = value?.trim() ?? '';
  return trimmed !== '' ? trimmed : defaultSystemPrompt;
};

const resolveRequiredModelId = (value: string | null | undefined, message: string): string => {
  const modelId = value?.trim() ?? '';
  if (modelId === '') {
    throw new Error(message);
  }
  return modelId;
};

const resolveDisabledAmazonCandidateEvaluatorConfig = (
  evaluator: ProductScannerAmazonCandidateEvaluator
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => ({
  enabled: false,
  mode: evaluator.mode,
  threshold: evaluator.threshold,
  onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
  candidateSimilarityMode: evaluator.candidateSimilarityMode,
  allowedContentLanguage: evaluator.allowedContentLanguage,
  rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
  languageDetectionMode: evaluator.languageDetectionMode,
  modelId: null,
  systemPrompt: null,
  brainApplied: null,
});

const resolveAmazonCandidateEvaluatorModelOverrideConfig = (
  evaluator: ProductScannerAmazonCandidateEvaluator,
  systemPrompt: string
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => ({
  enabled: true,
  mode: evaluator.mode,
  threshold: evaluator.threshold,
  onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
  candidateSimilarityMode: evaluator.candidateSimilarityMode,
  allowedContentLanguage: evaluator.allowedContentLanguage,
  rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
  languageDetectionMode: evaluator.languageDetectionMode,
  modelId: resolveRequiredModelId(
    evaluator.modelId,
    'Amazon candidate evaluator is set to model override, but no model id is configured.'
  ),
  systemPrompt,
  brainApplied: null,
});

const resolveAmazonCandidateEvaluatorBrainConfig = async (
  evaluator: ProductScannerAmazonCandidateEvaluator,
  systemPrompt: string,
  runtimeKind: AmazonCandidateEvaluatorConfigOptions['runtimeKind']
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'product.scan.amazon_candidate_match',
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 600,
      defaultSystemPrompt: systemPrompt,
      runtimeKind,
    }
  );

  return {
    enabled: true,
    mode: evaluator.mode,
    threshold: evaluator.threshold,
    onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
    candidateSimilarityMode: evaluator.candidateSimilarityMode,
    allowedContentLanguage: evaluator.allowedContentLanguage,
    rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
    languageDetectionMode: evaluator.languageDetectionMode,
    modelId: brainConfig.modelId,
    systemPrompt: brainConfig.systemPrompt,
    brainApplied: brainConfig.brainApplied as Record<string, unknown>,
  };
};

const resolveDisabled1688CandidateEvaluatorConfig = (
  evaluator: ProductScanner1688CandidateEvaluator
): ProductScanner1688CandidateEvaluatorResolvedConfig => ({
  enabled: false,
  mode: evaluator.mode,
  threshold: evaluator.threshold,
  onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
  modelId: null,
  systemPrompt: null,
  brainApplied: null,
});

const resolve1688CandidateEvaluatorModelOverrideConfig = (
  evaluator: ProductScanner1688CandidateEvaluator,
  systemPrompt: string
): ProductScanner1688CandidateEvaluatorResolvedConfig => ({
  enabled: true,
  mode: evaluator.mode,
  threshold: evaluator.threshold,
  onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
  modelId: resolveRequiredModelId(
    evaluator.modelId,
    '1688 candidate evaluator is set to model override, but no model id is configured.'
  ),
  systemPrompt,
  brainApplied: null,
});

const resolve1688CandidateEvaluatorBrainConfig = async (
  evaluator: ProductScanner1688CandidateEvaluator,
  systemPrompt: string
): Promise<ProductScanner1688CandidateEvaluatorResolvedConfig> => {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'product.scan.1688_supplier_match',
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 500,
      defaultSystemPrompt: systemPrompt,
      runtimeKind: 'vision',
    }
  );

  return {
    enabled: true,
    mode: evaluator.mode,
    threshold: evaluator.threshold,
    onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
    modelId: brainConfig.modelId,
    systemPrompt: brainConfig.systemPrompt,
    brainApplied: brainConfig.brainApplied as Record<string, unknown>,
  };
};

export const resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings = async (
  evaluatorCandidate?: ProductScannerAmazonCandidateEvaluator,
  options: AmazonCandidateEvaluatorConfigOptions =
    DEFAULT_AMAZON_CANDIDATE_EVALUATOR_CONFIG_OPTIONS
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const evaluator =
    evaluatorCandidate ?? createDefaultProductScannerAmazonCandidateEvaluator();

  if (evaluator.mode === 'disabled') {
    return resolveDisabledAmazonCandidateEvaluatorConfig(evaluator);
  }

  const systemPrompt = resolveOptionalPrompt(evaluator.systemPrompt, options.defaultSystemPrompt);

  if (evaluator.mode === 'model_override') {
    return resolveAmazonCandidateEvaluatorModelOverrideConfig(evaluator, systemPrompt);
  }

  return await resolveAmazonCandidateEvaluatorBrainConfig(
    evaluator,
    systemPrompt,
    options.runtimeKind
  );
};

export const resolveProductScanner1688CandidateEvaluatorConfigFromSettings = async (
  evaluatorCandidate?: ProductScanner1688CandidateEvaluator
): Promise<ProductScanner1688CandidateEvaluatorResolvedConfig> => {
  const evaluator =
    evaluatorCandidate ?? createDefaultProductScanner1688CandidateEvaluator();

  if (evaluator.mode === 'disabled') {
    return resolveDisabled1688CandidateEvaluatorConfig(evaluator);
  }

  const systemPrompt = resolveOptionalPrompt(
    evaluator.systemPrompt,
    DEFAULT_1688_CANDIDATE_EVALUATOR_SYSTEM_PROMPT
  );

  if (evaluator.mode === 'model_override') {
    return resolve1688CandidateEvaluatorModelOverrideConfig(evaluator, systemPrompt);
  }

  return await resolve1688CandidateEvaluatorBrainConfig(evaluator, systemPrompt);
};
