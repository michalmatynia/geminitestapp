import OpenAI from "openai";
import prisma from "@/lib/prisma";
import {
  apiKeyInvalidError,
  configurationError,
  operationFailedError,
} from "@/lib/errors/app-error";

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

export async function translateProduct(params: TranslateProductParams): Promise<TranslationResult> {
  const { sourceLanguage, targetLanguages, productName, productDescription } = params;

  // Load AI model from settings using Prisma
  let translationModel = "gpt-4o";
  try {
    const modelSetting = await prisma.setting.findUnique({
      where: { key: "ai_translation_model" }
    });
    if (modelSetting?.value) {
      translationModel = modelSetting.value;
    }
  } catch (error) {
    console.warn("[aiTranslationService] Failed to load translation model setting, using default:", error);
  }

  console.log(`[aiTranslationService] Using model: ${translationModel}`);

  // Determine if this is an Ollama model or OpenAI model
  const isOllamaModel = translationModel.includes("gemma") ||
                        translationModel.includes("llama") ||
                        translationModel.includes("mistral") ||
                        translationModel.includes("qwen") ||
                        translationModel.includes("deepseek");

  // Check API key/endpoint based on model type
  if (isOllamaModel) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    console.log(`[aiTranslationService] Using Ollama at: ${ollamaBaseUrl}`);

    if (!ollamaBaseUrl) {
      throw configurationError(
        "OLLAMA_BASE_URL is not configured. Please add it to your environment variables."
      );
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      throw configurationError(
        "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables."
      );
    }
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "ollama", // Ollama doesn't need a real API key
    baseURL: isOllamaModel ? (process.env.OLLAMA_BASE_URL || "http://localhost:11434") + "/v1" : undefined,
  });

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
      console.error(`[aiTranslationService] Failed to translate to ${targetLang}:`, error);
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
