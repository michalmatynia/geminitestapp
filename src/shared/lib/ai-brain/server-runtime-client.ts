/**
 * AI Brain Server Runtime Client
 * 
 * Server-side AI model runtime client for chat completions.
 * Provides:
 * - OpenAI-compatible chat completion interface
 * - Multi-vendor model support
 * - Model ID normalization
 * - Vendor inference and routing
 * - Server-only AI operations
 */

import 'server-only';

import OpenAI from 'openai';


import type { BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { SimpleChatMessage } from '@/shared/contracts/chatbot';
import { configurationError, operationFailedError } from '@/shared/errors/app-error';

import { buildOpenAiCompatibleMessages } from './providers/openai';
import { buildAnthropicMessages } from './providers/anthropic';
import { buildGeminiMessages } from './providers/gemini';
import { inferBrainModelVendor, normalizeBrainModelId } from './model-vendor';
import { resolveOllamaBaseUrl } from './ollama-config';
import { resolveBrainProviderCredential } from './provider-credentials';

import type {
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


/**
 * Alias for BrainModelVendor.
 */
export type BrainRuntimeVendor = BrainModelVendor;

/**
 * Represents a chat message formatted for the AI Brain runtime.
 */
type BrainChatMessage = SimpleChatMessage<
  string | ChatCompletionContentPart[],
  'system' | 'user' | 'assistant'
>;

export type { BrainChatMessage };

const OLLAMA_BASE_URL = resolveOllamaBaseUrl();

/**
 * Infers the AI vendor for a given model ID.
 * @param modelId - The model ID to inspect.
 * @returns The inferred BrainRuntimeVendor.
 */
export const inferBrainRuntimeVendor = (modelId: string): BrainRuntimeVendor =>
  inferBrainModelVendor(modelId);

/**
 * Normalizes a Brain model ID by removing any vendor prefix.
 * 
 * @param modelId - The raw model ID.
 * @returns The normalized model ID.
 */
export const normalizeBrainRuntimeModelId = (modelId: string): string =>
  normalizeBrainModelId(modelId);

/**
 * Resolves the OpenAI API key.
 * 
 * @returns The resolved OpenAI API key.
 */
const resolveOpenAiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('openai');
};

/**
 * Resolves the Anthropic API key.
 * 
 * @returns The resolved Anthropic API key.
 */
const resolveAnthropicApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('anthropic');
};

/**
 * Resolves the Gemini API key.
 * 
 * @returns The resolved Gemini API key.
 */
const resolveGeminiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('gemini');
};

/**
 * Checks if a model is capable of processing vision (images).
 * 
 * @param modelId - The model ID to check.
 * @returns True if the model has vision capabilities.
 */
export const isBrainModelVisionCapable = (modelId: string): boolean => {
  const vendor = inferBrainRuntimeVendor(modelId);
  const normalized = normalizeBrainRuntimeModelId(modelId).toLowerCase();
  if (vendor === 'openai') {
    return (
      normalized.startsWith('gpt-4o') ||
      normalized.startsWith('gpt-4-turbo') ||
      normalized.startsWith('gpt-4-vision') ||
      normalized.startsWith('o1') ||
      normalized.startsWith('o3') ||
      normalized.startsWith('o4')
    );
  }
  if (vendor === 'anthropic') {
    return (
      normalized.startsWith('claude-3') ||
      normalized.startsWith('claude-4') ||
      normalized.startsWith('claude-opus-4') ||
      normalized.startsWith('claude-sonnet-4') ||
      normalized.startsWith('claude-haiku-4')
    );
  }
  if (vendor === 'gemini') {
    return (
      normalized.startsWith('gemini-1.5') ||
      normalized.startsWith('gemini-2') ||
      normalized.startsWith('gemini-pro') ||
      normalized.startsWith('gemini-flash')
    );
  }
  return (
    normalized === 'gemma' ||
    normalized.startsWith('gemma3') ||
    normalized.startsWith('gemma-3') ||
    normalized.startsWith('gemma4') ||
    normalized.startsWith('gemma-4') ||
    normalized.includes('vision') ||
    normalized.includes('-vl') ||
    normalized.includes('llava') ||
    normalized.includes('multimodal')
  );
};

/**
 * Checks if a model supports JSON mode (structured output).
 * 
 * @param modelId - The model ID to check.
 * @returns True if JSON mode is supported.
 */
export const supportsBrainJsonMode = (modelId: string): boolean => {
  const vendor = inferBrainRuntimeVendor(modelId);
  if (vendor !== 'openai') return false;
  const normalized = normalizeBrainRuntimeModelId(modelId).toLowerCase();
  // OpenAI o1 models do not currently support JSON mode
  return !normalized.startsWith('o1-');
};

/**
 * Checks if a model supports streaming responses.
 * 
 * @param modelId - The model ID to check.
 * @returns True if streaming is supported.
 */
export const supportsBrainStreaming = (modelId: string): boolean => {
  const vendor = inferBrainRuntimeVendor(modelId);
  return vendor === 'openai' || vendor === 'ollama';
};

/**
 * Creates an OpenAI-compatible client, either for OpenAI itself or for a local Ollama instance.
 * 
 * @param modelId - The model ID.
 * @param apiKeyOverride - Optional API key to use instead of the resolved one.
 * @returns Object containing the OpenAI client and the identified vendor.
 */
const createOpenAiCompatibleClient = async (
  modelId: string,
  apiKeyOverride?: string
): Promise<{
  client: OpenAI;
  vendor: 'openai' | 'ollama';
}> => {
  const vendor = inferBrainRuntimeVendor(modelId);
  if (vendor === 'openai') {
    const apiKey = apiKeyOverride?.trim() || await resolveOpenAiApiKey();
    return {
      client: new OpenAI({ apiKey }),
      vendor,
    };
  }
  // Ollama provides an OpenAI-compatible endpoint at /v1
  return {
    client: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    vendor: 'ollama',
  };
};

/**
 * Executes a chat completion request.
 * Automatically routes the request to the appropriate vendor (OpenAI, Anthropic, Gemini, or Ollama)
 * based on the provided model ID.
 * 
 * @param input - Configuration for the chat completion.
 * @returns Object containing the response text and vendor/model info.
 * @throws {AppError} If the request fails or the response is empty.
 */
export const runBrainChatCompletion = async (input: {
  modelId: string;
  messages: BrainChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  apiKeyOverride?: string;
}): Promise<{
  text: string;
  vendor: BrainRuntimeVendor;
  modelId: string;
}> => {
  const vendor = inferBrainRuntimeVendor(input.modelId);
  const normalizedModelId = normalizeBrainRuntimeModelId(input.modelId);

  // OpenAI and Ollama (OpenAI-compatible)
  if (vendor === 'openai' || vendor === 'ollama') {
    const { client, vendor: openAiCompatibleVendor } = await createOpenAiCompatibleClient(
      input.modelId,
      input.apiKeyOverride
    );
    const completion = await client.chat.completions.create({
      model: normalizedModelId,
      messages: buildOpenAiCompatibleMessages(input.messages),
      ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
      ...(typeof input.maxTokens === 'number' ? { max_tokens: input.maxTokens } : {}),
      ...(input.jsonMode &&
      openAiCompatibleVendor === 'openai' &&
      supportsBrainJsonMode(input.modelId)
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    });
    const choice = completion.choices[0];
    const text = choice?.message?.content?.trim() || '';
    if (!text) {
      const finishReason = choice?.finish_reason ?? 'unknown';
      const refusal = (choice?.message as { refusal?: string })?.refusal;
      const detail = refusal
        ? `refused: ${refusal}`
        : `finish_reason=${finishReason}`;
      throw operationFailedError(
        `${openAiCompatibleVendor} model "${normalizedModelId}" returned an empty response (${detail}). Check that the model is available and try again or use a different model.`
      );
    }
    return {
      text,
      vendor: openAiCompatibleVendor,
      modelId: normalizedModelId,
    };
  }

  // Anthropic API
  if (vendor === 'anthropic') {
    const { systemPrompt, chatMessages } = buildAnthropicMessages(input.messages);
    const anthropicKey = input.apiKeyOverride?.trim() || await resolveAnthropicApiKey();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: normalizedModelId,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: chatMessages,
      }),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw operationFailedError(`Anthropic request failed: ${message || response.statusText}`);
    }
    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      stop_reason?: string;
    };
    const text = (payload.content ?? [])
      .map((part) => (part?.type === 'text' ? (part.text ?? '') : ''))
      .join('')
      .trim();
    if (!text) {
      throw operationFailedError(
        `Anthropic returned an empty response${payload.stop_reason ? ` (${payload.stop_reason})` : ''}. Try rephrasing or using a different model.`
      );
    }
    return {
      text,
      vendor,
      modelId: normalizedModelId,
    };
  }

  // Gemini (Google) API
  const { systemPrompt, contents } = buildGeminiMessages(input.messages);
  const geminiKey = input.apiKeyOverride?.trim() || await resolveGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      normalizedModelId
    )}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(systemPrompt
          ? {
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          }
          : {}),
        contents,
        generationConfig: {
          temperature: input.temperature ?? 0,
          maxOutputTokens: input.maxTokens ?? 1024,
        },
      }),
    }
  );
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw operationFailedError(`Gemini request failed: ${message || response.statusText}`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      finishReason?: string;
    }>;
    promptFeedback?: {
      blockReason?: string;
    };
  };

  if (payload.promptFeedback?.blockReason) {
    throw operationFailedError(
      `Gemini blocked the prompt: ${payload.promptFeedback.blockReason}`
    );
  }

  const candidate = payload.candidates?.[0];
  if (!candidate?.content?.parts?.length) {
    const reason = candidate?.finishReason ?? 'no candidates returned';
    throw operationFailedError(
      `Gemini returned an empty response (${reason}). Try rephrasing or using a different model.`
    );
  }

  const text = candidate.content.parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw operationFailedError(
      'Gemini returned an empty response. Try rephrasing or using a different model.'
    );
  }

  return {
    text,
    vendor,
    modelId: normalizedModelId,
  };
};

/**
 * Executes a streaming chat completion request.
 * Only OpenAI and Ollama vendors are currently supported for streaming.
 * 
 * @param input - Configuration for the streaming completion.
 * @returns Object containing the identified vendor and the readable stream.
 * @throws {AppError} If configuration is invalid or the vendor doesn't support streaming.
 */
export const streamBrainChatCompletion = async (input: {
  modelId: string;
  messages: BrainChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  vendor: 'openai' | 'ollama';
  stream: ReadableStream<Uint8Array>;
}> => {
  const vendor = inferBrainRuntimeVendor(input.modelId);
  if (vendor !== 'openai' && vendor !== 'ollama') {
    throw configurationError(
      `Streaming is not supported for Brain-assigned provider "${vendor}" in this runtime.`
    );
  }

  const { client, vendor: openAiCompatibleVendor } = await createOpenAiCompatibleClient(
    input.modelId
  );
  const completion = await client.chat.completions.create({
    model: normalizeBrainRuntimeModelId(input.modelId),
    messages: buildOpenAiCompatibleMessages(input.messages),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
    ...(typeof input.maxTokens === 'number' ? { max_tokens: input.maxTokens } : {}),
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (!delta) continue;
          controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (error) {
        void ErrorSystem.captureException(error);
        controller.error(error);
      }
    },
  });

  return {
    vendor: openAiCompatibleVendor,
    stream,
  };
};
