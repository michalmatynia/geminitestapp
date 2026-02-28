import 'server-only';

import {
  resolveBrainExecutionConfigForCapability,
  type BrainAppliedMeta,
} from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { apiKeyInvalidError, operationFailedError } from '@/shared/errors/app-error';

interface TranslateProductParams {
  productId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  productName: string;
  productDescription: string;
}

interface TranslationResult {
  translations: Record<
    string,
    {
      name: string;
      description: string;
    }
  >;
  translationModel?: string;
  targetLanguages?: string[];
  sourceLanguage?: string;
  brainApplied?: BrainAppliedMeta;
}

/**
 * Extracts JSON from a string that might contain markdown blocks or other text.
 */
function extractJson(text: string): unknown {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch {
    // 2. Try to find JSON block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // Continue to fallback
      }
    }

    // 3. Try to find anything between { and }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Continue to fallback
      }
    }

    throw operationFailedError(
      `Failed to extract valid JSON from response: ${text.substring(0, 100)}...`
    );
  }
}

export async function translateProduct(params: TranslateProductParams): Promise<TranslationResult> {
  const { sourceLanguage, targetLanguages, productName, productDescription } = params;

  const brainConfig = await resolveBrainExecutionConfigForCapability('product.translation', {
    defaultTemperature: 0.3,
    defaultMaxTokens: 1200,
    runtimeKind: 'chat',
  });
  const translationModel = brainConfig.modelId;

  await ErrorSystem.logInfo(`[aiTranslationService] Using model: ${translationModel}`, {
    service: 'ai-translation-service',
    translationModel,
    brainApplied: brainConfig.brainApplied,
  });

  await ErrorSystem.logInfo('[aiTranslationService] Starting translation', {
    service: 'ai-translation-service',
    targetLanguages,
    sourceLanguage,
    brainApplied: brainConfig.brainApplied,
  });

  const translations: Record<string, { name: string; description: string }> = {};

  // Translate to each target language
  for (const targetLang of targetLanguages) {
    if (targetLang.toLowerCase() === sourceLanguage.toLowerCase()) {
      await ErrorSystem.logInfo(`[aiTranslationService] Skipping ${targetLang} (source language)`, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
      });
      continue;
    }

    const prompt = `You are a professional translator. Translate the following product information from ${sourceLanguage} to ${targetLang}.

Product Name: ${productName}

Product Description:
${productDescription}

Provide the translation in the following JSON format:
{
  "name": "translated product name",
  "description": "translated product description"
}

Important:
- Maintain the same tone and style
- Keep technical terms accurate
- Preserve any special formatting
- Only respond with the JSON, no additional text`;

    try {
      await ErrorSystem.logInfo(`[aiTranslationService] Translating to ${targetLang}...`, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
      });

      const response = await runBrainChatCompletion({
        modelId: translationModel,
        temperature: brainConfig.temperature,
        maxTokens: brainConfig.maxTokens,
        jsonMode: supportsBrainJsonMode(translationModel),
        messages: [
          {
            role: 'system',
            content: brainConfig.systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.text;
      if (!content) {
        void ErrorSystem.logWarning(`No content in response for ${targetLang}`, {
          service: 'ai-translation-service',
          targetLanguage: targetLang,
        });
        throw operationFailedError(`No translation received for ${targetLang}`, undefined, {
          targetLanguage: targetLang,
        });
      }

      await ErrorSystem.logInfo(`[aiTranslationService] Received response for ${targetLang}`, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
      });

      const parsed = extractJson(content) as { name?: string; description?: string };
      translations[targetLang.toLowerCase()] = {
        name: parsed.name || '',
        description: parsed.description || '',
      };

      await ErrorSystem.logInfo(`[aiTranslationService] Successfully translated to ${targetLang}`, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await ErrorSystem.captureException(error, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
        productName,
        brainApplied: brainConfig.brainApplied,
      });

      // If this is an API key error, throw it to fail the entire job
      if (
        errorMessage.includes('API key') ||
        errorMessage.includes('401') ||
        errorMessage.includes('authentication')
      ) {
        throw apiKeyInvalidError(
          `Translation failed: ${errorMessage}. Please check your OpenAI API key configuration.`,
          'openai'
        );
      }

      // For other errors, continue with other languages but don't save fallback
      await ErrorSystem.logWarning(`[aiTranslationService] Skipping ${targetLang} due to error`, {
        service: 'ai-translation-service',
        targetLanguage: targetLang,
        error: errorMessage,
      });
    }
  }

  // If no translations were successful, throw an error
  if (Object.keys(translations).length === 0) {
    throw operationFailedError('Translation failed: No translations were completed successfully.');
  }

  return {
    translations,
    translationModel,
    targetLanguages,
    sourceLanguage,
    brainApplied: brainConfig.brainApplied,
  };
}
