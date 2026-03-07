import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '@/features/ai/image-studio/server';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

export const resolveOpenAiApiKey = async (): Promise<string> => {
  const apiKey =
    (await readStoredSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await readStoredSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY']?.trim() ||
    '';
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is missing for selected OCR model. Configure it in Brain provider settings.'
    );
  }
  return apiKey;
};

export const resolveAnthropicApiKey = async (): Promise<string> => {
  const apiKey =
    (await readStoredSettingValue('anthropic_api_key'))?.trim() ||
    process.env['ANTHROPIC_API_KEY']?.trim() ||
    '';
  if (!apiKey) {
    throw new Error('Anthropic API key is missing for selected OCR model.');
  }
  return apiKey;
};

export const resolveGeminiApiKey = async (): Promise<string> => {
  const apiKey =
    (await readStoredSettingValue('gemini_api_key'))?.trim() ||
    process.env['GEMINI_API_KEY']?.trim() ||
    '';
  if (!apiKey) {
    throw new Error('Gemini API key is missing for selected OCR model.');
  }
  return apiKey;
};
