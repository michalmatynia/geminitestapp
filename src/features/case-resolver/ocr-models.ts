export const CASE_RESOLVER_OCR_OPENAI_MODEL_FALLBACKS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
  'o1-mini',
  'o3-mini',
  'o4-mini',
] as const;

const OCR_MODEL_ID_HINTS = [
  'vision',
  'vl',
  'llava',
  'minicpm',
  'moondream',
  'ocr',
  'gpt-4o',
  'gpt-4.1',
  'gpt-5',
  'o1',
  'o3',
  'o4',
  'gemini',
  'claude-3',
  'pixtral',
] as const;

export const isLikelyCaseResolverOcrCapableModelId = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return OCR_MODEL_ID_HINTS.some((hint) => normalized.includes(hint));
};

export const uniqueSortedCaseResolverOcrModelIds = (modelIds: readonly string[]): string[] =>
  Array.from(new Set(modelIds.map((modelId: string) => modelId.trim()).filter(Boolean))).sort(
    (left: string, right: string) => left.localeCompare(right)
  );

export const toLikelyCaseResolverOcrModelIds = (modelIds: readonly string[]): string[] =>
  uniqueSortedCaseResolverOcrModelIds(
    modelIds.filter((modelId: string): boolean => isLikelyCaseResolverOcrCapableModelId(modelId))
  );
