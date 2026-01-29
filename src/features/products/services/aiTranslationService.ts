import OpenAI from "openai";
import {
  apiKeyInvalidError,
  configurationError,
  operationFailedError,
} from "@/shared/errors/app-error";
import { ErrorSystem } from "@/features/observability/server";
import { getSettingValue } from "./aiDescriptionService";

interface TranslateProductParams {
  productId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  productName: string;
  productDescription: string;
}

interface TranslationResult {
  translations: Record<string, {
    name: string;
    description: string;
  }>;
  translationModel?: string;
  targetLanguages?: string[];
  sourceLanguage?: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

function getClient(modelName: string, apiKey: string | null) {
  const modelLower = modelName.toLowerCase();
  const isOpenAI = (modelLower.startsWith("gpt-") && !modelLower.includes("oss")) ||
                   modelLower.startsWith("ft:gpt-") ||
                   modelLower.startsWith("o1-");

  if (isOpenAI) {
    if (!apiKey) {
      throw configurationError("OpenAI API key is missing for GPT model.");
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  // All other models use Ollama
  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama",
    }),
    isOllama: true
  };
}

/**
 * Extracts JSON from a string that might contain markdown blocks or other text.
 */
function extractJson(text: string): unknown {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (_e) {
    // 2. Try to find JSON block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (_e2) {
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
      } catch (_e3) {
        // Continue to fallback
      }
    }
    
    throw new Error(`Failed to extract valid JSON from response: ${text.substring(0, 100)}...`);
  }
}

export async function translateProduct(params: TranslateProductParams): Promise<TranslationResult> {
  const { sourceLanguage, targetLanguages, productName, productDescription } = params;

  // Load configuration from settings
  const [translationModelSetting, apiKeySetting] = await Promise.all([
    getSettingValue("ai_translation_model"),
    getSettingValue("openai_api_key"),
  ]);

  const translationModel = translationModelSetting?.trim() || "gpt-4o";
  const apiKey = apiKeySetting ?? process.env.OPENAI_API_KEY ?? null;

  console.log(`[aiTranslationService] Using model: ${translationModel}`);

  const { openai, isOllama } = getClient(translationModel, apiKey);

  if (isOllama) {
    console.log(`[aiTranslationService] Using Ollama at: ${OLLAMA_BASE_URL}`);
  }

  console.log(`[aiTranslationService] Target languages: ${targetLanguages.join(", ")}`);
  console.log(`[aiTranslationService] Source language: ${sourceLanguage}`);

  const translations: Record<string, { name: string; description: string }> = {};

  // Translate to each target language
  for (const targetLang of targetLanguages) {
    if (targetLang.toLowerCase() === sourceLanguage.toLowerCase()) {
      console.log(`[aiTranslationService] Skipping ${targetLang} because it is the source language`);
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
      console.log(`[aiTranslationService] Translating to ${targetLang}...`);

      const options: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: translationModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      };

      // Only use response_format for OpenAI models, as Ollama models might not support it reliably via the SDK
      const modelLower = translationModel.toLowerCase();
      const supportsJsonMode = !isOllama && !modelLower.startsWith("o1-");
      
      if (supportsJsonMode) {
        options.response_format = { type: "json_object" };
      }

      const response = await openai.chat.completions.create(options);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error(`[aiTranslationService] No content in response for ${targetLang}`);
        throw operationFailedError(`No translation received for ${targetLang}`, undefined, {
          targetLanguage: targetLang,
        });
      }

      console.log(`[aiTranslationService] Received response for ${targetLang}`);

      const parsed = extractJson(content) as { name?: string; description?: string };
      translations[targetLang.toLowerCase()] = {
        name: parsed.name || "",
        description: parsed.description || "",
      };

      console.log(`[aiTranslationService] Successfully translated to ${targetLang}`);
    } catch (error) {
      console.error(`[aiTranslationService] Error translating to ${targetLang}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isConnectionError = errorMessage.includes("ECONNREFUSED") || 
                               errorMessage.includes("fetch failed") || 
                               errorMessage.includes("failed to fetch");

      if (isOllama && isConnectionError) {
        throw operationFailedError(
          `Translation failed: Could not connect to Ollama server at ${OLLAMA_BASE_URL}. Please ensure the Ollama server is running and accessible.`,
          undefined,
          { originalError: errorMessage, url: OLLAMA_BASE_URL }
        );
      }

      await ErrorSystem.captureException(error, {
        service: "ai-translation-service",
        targetLanguage: targetLang,
        productName
      });
      
      // If this is an API key error, throw it to fail the entire job
      if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("authentication")) {
        throw apiKeyInvalidError(
          `Translation failed: ${errorMessage}. Please check your OpenAI API key configuration.`,
          "openai"
        );
      }

      // For other errors, continue with other languages but don't save fallback
      console.warn(`[aiTranslationService] Skipping ${targetLang} due to error`);
    }
  }

  // If no translations were successful, throw an error
  if (Object.keys(translations).length === 0) {
    throw operationFailedError("Translation failed: No translations were completed successfully.");
  }

  return {
    translations,
    translationModel,
    targetLanguages,
    sourceLanguage
  };
}
