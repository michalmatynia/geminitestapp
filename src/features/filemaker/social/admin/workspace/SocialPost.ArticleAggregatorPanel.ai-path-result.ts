type AiPathRunTextSource = {
  result?: unknown;
  runtimeState?: unknown;
};

const TEXT_OUTPUT_KEYS = ['post', 'bodyEn', 'body', 'text', 'content', 'output', 'result', 'summary'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeStringOutput = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractTextFromArray = (values: unknown[], depth: number): string | null => {
  for (const item of values) {
    const result = extractTextFromUnknown(item, depth + 1);
    if (result !== null) {
      return result;
    }
  }
  return null;
};

const extractTextFromRecord = (value: Record<string, unknown>, depth: number): string | null => {
  for (const key of TEXT_OUTPUT_KEYS) {
    const result = extractTextFromUnknown(value[key], depth + 1);
    if (result !== null) {
      return result;
    }
  }
  for (const item of Object.values(value)) {
    const result = extractTextFromUnknown(item, depth + 1);
    if (result !== null) {
      return result;
    }
  }
  return null;
};

const extractNestedText = (value: unknown, depth: number): string | null => {
  if (depth > 4 || value === null || value === undefined) return null;
  if (Array.isArray(value)) return extractTextFromArray(value, depth);
  return isRecord(value) ? extractTextFromRecord(value, depth) : null;
};

const extractTextFromUnknown = (value: unknown, depth = 0): string | null => {
  if (typeof value === 'string') return normalizeStringOutput(value);
  return extractNestedText(value, depth);
};

const collectOutputTextCandidates = (value: unknown): string[] => {
  if (!isRecord(value)) return [];
  return TEXT_OUTPUT_KEYS.flatMap((key) => {
    const text = extractTextFromUnknown(value[key]);
    return text === null ? [] : [text];
  });
};

const extractTextFromRuntimeState = (runtimeState: unknown): string | null => {
  const state = isRecord(runtimeState) ? runtimeState : null;
  const outputGroups = [
    isRecord(state?.['outputs']) ? state['outputs'] : null,
    isRecord(state?.['nodeOutputs']) ? state['nodeOutputs'] : null,
  ].filter((entry): entry is Record<string, unknown> => entry !== null);
  const candidates = outputGroups.flatMap((group) =>
    Object.values(group).flatMap(collectOutputTextCandidates)
  );
  return candidates.sort((left, right) => right.length - left.length)[0] ?? null;
};

export const extractSocialArticleAggregationAiPathRunText = (
  run: AiPathRunTextSource
): string | null =>
  extractTextFromUnknown(run.result) ?? extractTextFromRuntimeState(run.runtimeState);
