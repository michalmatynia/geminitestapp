import { ErrorSystem } from '@/shared/utils/observability/error-system';

const GRAPH_MODEL_RETRY_MAX_TOKENS = 4_000;

export type GraphModelRetryReason = 'empty_result' | 'invalid_json';

const extractJsonCandidate = (value: string): string => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
};

const looksLikeJsonCandidate = (value: string): boolean => {
  const candidate = extractJsonCandidate(value);
  return candidate.startsWith('{') || candidate.startsWith('[');
};

const canParseJsonCandidate = (value: string): boolean => {
  const candidate = extractJsonCandidate(value);
  if (!looksLikeJsonCandidate(candidate)) return false;
  try {
    JSON.parse(candidate);
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return false;
  }
};

export const resolveGraphModelRetryReason = (args: {
  prompt: string;
  resultText: string;
}): GraphModelRetryReason | null => {
  if (args.resultText.length === 0) return 'empty_result';
  if (!/\bjson\b/i.test(args.prompt)) return null;
  if (!looksLikeJsonCandidate(args.resultText)) return null;
  return canParseJsonCandidate(args.resultText) ? null : 'invalid_json';
};

export const resolveGraphModelRetryConfig = (args: {
  temperature: number;
  maxTokens: number;
  reason: GraphModelRetryReason;
}): {
  temperature: number;
  maxTokens: number;
} => ({
  temperature: args.reason === 'empty_result' ? Math.min(args.temperature, 0.2) : args.temperature,
  maxTokens: Math.min(
    GRAPH_MODEL_RETRY_MAX_TOKENS,
    Math.max(args.maxTokens + 400, Math.ceil(args.maxTokens * 1.5))
  ),
});
