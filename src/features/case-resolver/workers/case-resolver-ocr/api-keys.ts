import { resolveBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';

export const resolveOpenAiApiKey = async (): Promise<string> => {
  try {
    return await resolveBrainProviderCredential('openai');
  } catch {
    throw new Error(
      'OpenAI API key is missing for selected OCR model. Configure it in Brain provider settings.'
    );
  }
};

export const resolveAnthropicApiKey = async (): Promise<string> => {
  try {
    return await resolveBrainProviderCredential('anthropic');
  } catch {
    throw new Error(
      'Anthropic API key is missing for selected OCR model. Configure it in Brain provider settings.'
    );
  }
};

export const resolveGeminiApiKey = async (): Promise<string> => {
  try {
    return await resolveBrainProviderCredential('gemini');
  } catch {
    throw new Error(
      'Gemini API key is missing for selected OCR model. Configure it in Brain provider settings.'
    );
  }
};
