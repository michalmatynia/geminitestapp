import 'server-only';

import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

import { amazonCandidateTriageResponseSchema } from './product-scan-ai-evaluator.schema';
import { parseStructuredJsonResponse } from './product-scan-ai-evaluator.utils';
import {
  buildCandidateTriageSystemPrompt,
  createAiTriageEvaluationResult,
  createFailedTriageEvaluationResult,
  normalizeAiTriageCandidates,
} from './product-scan-amazon-triage.ai';
import {
  buildCandidateTriagePromptPayload,
  createDeterministicTriageEntries,
  createNoCandidatesTriageResult,
  maybeCreateDeterministicTriageResult,
  resolveCandidateTriageCandidates,
  type AmazonCandidateTriageInput,
} from './product-scan-amazon-triage.helpers';
import type { ProductScanCandidateTriageEvaluationResult } from './product-scan-amazon.types';

export const evaluateProductScanCandidateTriage = async (
  input: AmazonCandidateTriageInput
): Promise<ProductScanCandidateTriageEvaluationResult> => {
  const candidates = resolveCandidateTriageCandidates(input.parsedResult);
  if (candidates.length === 0) return createNoCandidatesTriageResult(input);

  const deterministicEntries = createDeterministicTriageEntries(input, candidates);
  const deterministicResult = maybeCreateDeterministicTriageResult(input, deterministicEntries);
  if (deterministicResult !== null) return deterministicResult;

  try {
    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 700,
      jsonMode: true,
      messages: [
        { role: 'system', content: buildCandidateTriageSystemPrompt(input) },
        {
          role: 'user',
          content: JSON.stringify(
            buildCandidateTriagePromptPayload(input, deterministicEntries),
            null,
            2
          ),
        },
      ],
    });
    const parsed = amazonCandidateTriageResponseSchema.parse(
      parseStructuredJsonResponse(completion.text)
    );
    return createAiTriageEvaluationResult({
      triageInput: input,
      parsed,
      finalCandidates: normalizeAiTriageCandidates(input, deterministicEntries, parsed),
      modelId: completion.modelId,
    });
  } catch (error) {
    return createFailedTriageEvaluationResult(input, deterministicEntries, error);
  }
};
