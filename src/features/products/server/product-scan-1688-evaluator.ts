import 'server-only';

import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

import { PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS } from './product-scan-ai-evaluator.shared';
import { buildSupplierEvaluationMessages } from './product-scan-1688-evaluator.prompt';
import {
  createFailedSupplierEvaluation,
  evaluateSupplierCompletion,
  loadSupplierEvaluatorAssets,
  resolveHeuristicSkipEvaluation,
  type SupplierEvaluatorInput,
} from './product-scan-1688-evaluator.helpers';

export const evaluate1688SupplierCandidateMatch = async (
  input: SupplierEvaluatorInput
): Promise<ReturnType<typeof createFailedSupplierEvaluation>> => {
  const heuristicSkipEvaluation = resolveHeuristicSkipEvaluation(input);
  if (heuristicSkipEvaluation !== null) return heuristicSkipEvaluation;

  const assetResult = await loadSupplierEvaluatorAssets(input);
  if (!assetResult.ok) return assetResult.evaluation;

  try {
    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 500,
      jsonMode: true,
      messages: buildSupplierEvaluationMessages(input, assetResult.assets),
    });

    if (!PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS.has(completion.vendor)) {
      return createFailedSupplierEvaluation(
        completion.modelId,
        '1688 candidate evaluator selected a runtime that does not support image inputs in this flow.'
      );
    }

    return evaluateSupplierCompletion(completion, input.evaluatorConfig.threshold);
  } catch (error) {
    return createFailedSupplierEvaluation(
      input.evaluatorConfig.modelId,
      error instanceof Error ? error.message : '1688 candidate evaluator failed.'
    );
  }
};
