import 'server-only';

import OpenAI from 'openai';


import type { BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { SimpleChatMessage } from '@/shared/contracts/chatbot';
import { configurationError, operationFailedError } from '@/shared/errors/app-error';

import { inferBrainModelVendor, normalizeBrainModelId } from './model-vendor';
import { resolveOllamaBaseUrl } from './ollama-config';
import { resolveBrainProviderCredential } from './provider-credentials';

import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

export type BrainRuntimeVendor = BrainModelVendor;

type BrainChatMessage = SimpleChatMessage<
  string | ChatCompletionContentPart[],
  'system' | 'user' | 'assistant'
>;

export type { BrainChatMessage };

const OLLAMA_BASE_URL = resolveOllamaBaseUrl();

const stringifyMessageContent = (value: string | ChatCompletionContentPart[]): string => {
  if (typeof value === 'string') return value;
  return value
    .map((part: ChatCompletionContentPart): string => {
      if (part.type === 'text') return part.text ?? '';
      if (part.type === 'image_url') {
        return '[image]';
      }
      return '';
    })
    .join('\n')
    .trim();
};

export const inferBrainRuntimeVendor = (modelId: string): BrainRuntimeVendor =>
  inferBrainModelVendor(modelId);

export const normalizeBrainRuntimeModelId = (modelId: string): string =>
  normalizeBrainModelId(modelId);

const resolveOpenAiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('openai');
};

const resolveAnthropicApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('anthropic');
};

const resolveGeminiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('gemini');
};

const buildOpenAiCompatibleMessages = (
  messages: BrainChatMessage[]
): ChatCompletionMessageParam[] =>
  messages.map((message: BrainChatMessage): ChatCompletionMessageParam => {
    if (message.role === 'user') {
      return {
        role: 'user',
        content: message.content,
      };
    }
    return {
      role: message.role,
      content:
        typeof message.content === 'string'
          ? message.content
          : stringifyMessageContent(message.content),
    };
  });

const assertTextOnlyMessages = (messages: BrainChatMessage[]): void => {
  if (messages.some((message: BrainChatMessage): boolean => typeof message.content !== 'string')) {
    throw configurationError(
      'This Brain-assigned provider only supports text-only messages in this runtime.'
    );
  }
};

export const supportsBrainJsonMode = (modelId: string): boolean => {
  const vendor = inferBrainRuntimeVendor(modelId);
  if (vendor !== 'openai') return false;
  const normalized = normalizeBrainRuntimeModelId(modelId).toLowerCase();
  return !normalized.startsWith('o1-');
};

export const supportsBrainStreaming = (modelId: string): boolean => {
  const vendor = inferBrainRuntimeVendor(modelId);
  return vendor === 'openai' || vendor === 'ollama';
};

const createOpenAiCompatibleClient = async (
  modelId: string
): Promise<{
  client: OpenAI;
  vendor: 'openai' | 'ollama';
}> => {
  const vendor = inferBrainRuntimeVendor(modelId);
  if (vendor === 'openai') {
    return {
      client: new OpenAI({ apiKey: await resolveOpenAiApiKey() }),
      vendor,
    };
  }
  return {
    client: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    vendor: 'ollama',
  };
};

const buildAnthropicMessages = (messages: BrainChatMessage[]) => {
  assertTextOnlyMessages(messages);
  const systemPrompt = messages
    .filter((message: BrainChatMessage): boolean => message.role === 'system')
    .map((message: BrainChatMessage): string => String(message.content))
    .join('\n\n')
    .trim();
  const chatMessages = messages
    .filter((message: BrainChatMessage): boolean => message.role !== 'system')
    .map((message: BrainChatMessage) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'text', text: String(message.content) }],
    }));
  return {
    systemPrompt,
    chatMessages,
  };
};

const buildGeminiMessages = (messages: BrainChatMessage[]) => {
  assertTextOnlyMessages(messages);
  const systemPrompt = messages
    .filter((message: BrainChatMessage): boolean => message.role === 'system')
    .map((message: BrainChatMessage): string => String(message.content))
    .join('\n\n')
    .trim();
  const contents = messages
    .filter((message: BrainChatMessage): boolean => message.role !== 'system')
    .map((message: BrainChatMessage) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content) }],
    }));
  return {
    systemPrompt,
    contents,
  };
};

export const runBrainChatCompletion = async (input: {
  modelId: string;
  messages: BrainChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<{
  text: string;
  vendor: BrainRuntimeVendor;
  modelId: string;
}> => {
  const vendor = inferBrainRuntimeVendor(input.modelId);
  const normalizedModelId = normalizeBrainRuntimeModelId(input.modelId);

  if (vendor === 'openai' || vendor === 'ollama') {
    const { client, vendor: openAiCompatibleVendor } = await createOpenAiCompatibleClient(
      input.modelId
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
    return {
      text: completion.choices[0]?.message?.content?.trim() || '',
      vendor: openAiCompatibleVendor,
      modelId: normalizedModelId,
    };
  }

  if (vendor === 'anthropic') {
    const { systemPrompt, chatMessages } = buildAnthropicMessages(input.messages);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': await resolveAnthropicApiKey(),
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
    };
    return {
      text: (payload.content ?? [])
        .map((part) => (part?.type === 'text' ? (part.text ?? '') : ''))
        .join('')
        .trim(),
      vendor,
      modelId: normalizedModelId,
    };
  }

  const { systemPrompt, contents } = buildGeminiMessages(input.messages);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      normalizedModelId
    )}:generateContent?key=${encodeURIComponent(await resolveGeminiApiKey())}`,
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
    }>;
  };
  return {
    text: (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim(),
    vendor,
    modelId: normalizedModelId,
  };
};

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
        controller.error(error);
      }
    },
  });

  return {
    vendor: openAiCompatibleVendor,
    stream,
  };
};
