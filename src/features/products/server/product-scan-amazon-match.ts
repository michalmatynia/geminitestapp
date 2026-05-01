import 'server-only';

import type { ProductScanAmazonEvaluationResult } from '@/shared/contracts/product-scans';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

import {
  PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS,
} from './product-scan-ai-evaluator.shared';
import { amazonEvaluatorResponseSchema } from './product-scan-ai-evaluator.schema';
import { parseStructuredJsonResponse } from './product-scan-ai-evaluator.utils';
import {
  shouldBypassAmazonSimilarityAi,
} from './product-scan-amazon.evidence';
import {
  loadAmazonMatchAssets,
} from './product-scan-amazon-match.assets';
import {
  createAmazonMatchEvaluationContext,
  createDeterministicBypassAmazonMatchEvaluation,
  createLanguageRejectedAmazonMatchEvaluation,
  shouldRejectAmazonMatchForLanguage,
  type AmazonCandidateMatchInput,
  type AmazonMatchEvaluationContext,
} from './product-scan-amazon-match.context';
import {
  buildAmazonMatchEvaluationMessages,
} from './product-scan-amazon-match.prompt';
import {
  createAmazonMatchEvaluationFromParsed,
} from './product-scan-amazon-match.result';
import { createEvaluationResult } from './product-scan-amazon.results';

export const evaluateProductScanCandidateMatch = async (
  input: AmazonCandidateMatchInput
): Promise<ProductScanAmazonEvaluationResult> => {
  const context = createAmazonMatchEvaluationContext(input);
  if (shouldRejectAmazonMatchForLanguage(input, context)) {
    return createLanguageRejectedAmazonMatchEvaluation(context);
  }
  if (
    shouldBypassAmazonSimilarityAi({
      evaluatorConfig: input.evaluatorConfig,
      deterministicReasons: context.deterministicReasons,
      deterministicLanguageDecision: context.deterministicLanguageDecision,
    })
  ) {
    return createDeterministicBypassAmazonMatchEvaluation(input, context);
  }

  const assetResult = await loadAmazonMatchAssets(input, context);
  if (assetResult.ok === false) return assetResult.evaluation;

  try {
    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 600,
      jsonMode: true,
      messages: buildAmazonMatchEvaluationMessages(input, assetResult.assets),
    });
    if (PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS.has(completion.vendor) === false) {
      return createUnsupportedImageRuntimeEvaluation(assetResult.assets.context, completion.modelId);
    }
    const parsed = amazonEvaluatorResponseSchema.parse(
      parseStructuredJsonResponse(completion.text)
    );
    return createAmazonMatchEvaluationFromParsed({
      matchInput: input,
      context: assetResult.assets.context,
      parsed,
      modelId: completion.modelId,
    });
  } catch (error) {
    return createAmazonMatchFailureEvaluation(assetResult.assets.context, error);
  }
};

const createUnsupportedImageRuntimeEvaluation = (
  context: AmazonMatchEvaluationContext,
  modelId: string | null
): ProductScanAmazonEvaluationResult =>
  createEvaluationResult({
    ...context.evaluationBase,
    status: 'failed',
    proceed: false,
    reasons: [],
    mismatches: [],
    mismatchLabels: [],
    variantAssessment: null,
    modelId,
    error:
      'Amazon candidate AI evaluation selected a runtime that does not support image inputs in this scanner flow.',
  });

const createAmazonMatchFailureEvaluation = (
  context: AmazonMatchEvaluationContext,
  error: unknown
): ProductScanAmazonEvaluationResult =>
  createEvaluationResult({
    ...context.evaluationBase,
    status: 'failed',
    proceed: false,
    reasons: [],
    mismatches: [],
    mismatchLabels: [],
    variantAssessment: null,
    error: error instanceof Error ? error.message : 'Amazon candidate AI evaluation failed.',
  });
