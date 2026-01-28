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

  const translations: Record<string, { name: string; description: string }> = {};

  // Translate to each target language
  for (const targetLang of targetLanguages) {
    if (targetLang.toLowerCase() === sourceLanguage.toLowerCase()) {
      // Skip if target is same as source
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

      const response = await openai.chat.completions.create({
        model: translationModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw operationFailedError(`No translation received for ${targetLang}`, undefined, {
          targetLanguage: targetLang,
        });
      }

      const parsed = JSON.parse(content) as { name?: string; description?: string };
      translations[targetLang.toLowerCase()] = {
        name: parsed.name || "",
        description: parsed.description || "",
      };

      console.log(`[aiTranslationService] Successfully translated to ${targetLang}`);
    } catch (error) {
      await ErrorSystem.captureException(error, {
        service: "ai-translation-service",
        targetLanguage: targetLang,
        productName
      });
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
