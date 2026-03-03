import type { CaseResolverOcrProvider } from '@/shared/contracts/case-resolver';
export type { CaseResolverOcrProvider };

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

const isAnthropicModelId = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('claude');

const isGeminiModelId = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('gemini');

export const detectCaseResolverOcrProvider = (modelName: string): CaseResolverOcrProvider => {
  const normalized = modelName.trim();
  if (!normalized) return 'ollama';
  if (isAnthropicModelId(normalized)) return 'anthropic';
  if (isGeminiModelId(normalized)) return 'gemini';
  if (isOpenAiModelId(normalized)) return 'openai';
  return 'ollama';
};

export const formatCaseResolverOcrProviderLabel = (provider: CaseResolverOcrProvider): string => {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'gemini':
      return 'Gemini';
    case 'ollama':
    default:
      return 'Ollama';
  }
};

export const resolveCaseResolverOcrProviderLabel = (modelName: string): string =>
  formatCaseResolverOcrProviderLabel(detectCaseResolverOcrProvider(modelName));
