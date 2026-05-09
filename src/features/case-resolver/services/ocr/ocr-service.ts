/**
 * OCR Provider Service
 * 
 * Manages detection, normalization, and labeling of Case Resolver OCR providers 
 * based on model identifier strings.
 */

import type { CaseResolverOcrProvider } from '@/shared/contracts/case-resolver/base';

/**
 * Detects if a model string corresponds to an OpenAI-compatible model.
 */
const isOpenAiModelId = (modelName: string): boolean => {
  const modelLower = modelName.toLowerCase();
  return (
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-') ||
    modelLower.startsWith('o3-') ||
    modelLower.startsWith('o4-') ||
    modelLower.startsWith('chatgpt-')
  );
};

/**
 * Detects if a model string corresponds to an Anthropic model.
 */
const isAnthropicModelId = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('claude');

/**
 * Detects if a model string corresponds to a Gemini model.
 */
const isGeminiModelId = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('gemini');

/**
 * Detects the OCR provider for a given model identifier.
 */
export const detectCaseResolverOcrProvider = (modelName: string): CaseResolverOcrProvider => {
  const normalized = modelName.trim();
  if (normalized === '') return 'ollama';
  if (isAnthropicModelId(normalized)) return 'anthropic';
  if (isGeminiModelId(normalized)) return 'gemini';
  if (isOpenAiModelId(normalized)) return 'openai';
  return 'ollama';
};

/**
 * Formats a provider enum into a human-readable label.
 */
export const formatCaseResolverOcrProviderLabel = (provider: CaseResolverOcrProvider): string => {
  switch (provider) {
    case 'openai': return 'OpenAI';
    case 'anthropic': return 'Anthropic';
    case 'gemini': return 'Gemini';
    case 'ollama':
    default: return 'Ollama';
  }
};

/**
 * Resolves a human-readable provider label from a model name.
 */
export const resolveCaseResolverOcrProviderLabel = (modelName: string): string =>
  formatCaseResolverOcrProviderLabel(detectCaseResolverOcrProvider(modelName));
