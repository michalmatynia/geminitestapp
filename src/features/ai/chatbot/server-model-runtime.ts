import 'server-only';

import OpenAI from 'openai';
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { configurationError } from '@/shared/errors/app-error';

const OLLAMA_BASE_URL =
  process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

const isOpenAiModel = (modelName: string): boolean => {
  const modelLower = modelName.toLowerCase();
  return (
    ((modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
      modelLower.startsWith('ft:gpt-') ||
      modelLower.startsWith('o1-') ||
      modelLower.startsWith('o3-') ||
      modelLower.startsWith('o4-') ||
      modelLower.startsWith('chatgpt-'))
  );
};

const isAnthropicModel = (modelName: string): boolean => {
  const modelLower = modelName.toLowerCase();
  return modelLower.startsWith('claude-') || modelLower.startsWith('anthropic:');
};

const isGeminiModel = (modelName: string): boolean => {
  const modelLower = modelName.toLowerCase();
  return (
    modelLower.startsWith('gemini-') || modelLower.startsWith('models/gemini-')
  );
};

const getClient = async (
  modelName: string,
): Promise<{ openai: OpenAI; isOllama: boolean }> => {
  if (isOpenAiModel(modelName)) {
    const apiKey =
      (await getSettingValue('openai_api_key')) ??
      process.env['OPENAI_API_KEY'] ??
      null;
    if (!apiKey) {
      throw configurationError(
        'OpenAI API key is missing for the Brain-assigned Chatbot model.',
      );
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  if (isAnthropicModel(modelName) || isGeminiModel(modelName)) {
    throw configurationError(
      `Brain-assigned Chatbot model "${modelName}" is not supported by Chatbot runtime yet. Use an OpenAI or Ollama model in /admin/settings/brain.`,
    );
  }

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true,
  };
};

const resolveImageUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return value;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) {
    const base =
      process.env['NEXT_PUBLIC_APP_URL'] ||
      process.env['NEXTAUTH_URL'] ||
      'http://localhost:3000';
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${normalizedBase}${value}`;
  }
  return `data:image/jpeg;base64,${value}`;
};

const normalizeRole = (role: string): 'user' | 'assistant' | 'system' => {
  if (role === 'assistant' || role === 'system') return role;
  return 'user';
};

const buildMessageContent = (
  message: Pick<ChatMessage, 'content' | 'images'>,
): string | ChatCompletionContentPart[] => {
  const imageValues = Array.isArray(message.images)
    ? message.images
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
    : [];
  if (imageValues.length === 0) {
    return message.content;
  }

  const content: ChatCompletionContentPart[] = [];
  if (message.content.trim()) {
    content.push({
      type: 'text',
      text: message.content,
    });
  }
  imageValues.forEach((image: string): void => {
    content.push({
      type: 'image_url',
      image_url: {
        url: resolveImageUrl(image),
      },
    });
  });
  return content;
};

const buildMessages = (input: {
  messages: Array<Pick<ChatMessage, 'role' | 'content' | 'images'>>;
  systemPrompt: string;
}): ChatCompletionMessageParam[] => {
  const output: ChatCompletionMessageParam[] = [];
  if (input.systemPrompt.trim()) {
    output.push({
      role: 'system',
      content: input.systemPrompt.trim(),
    });
  }

  input.messages.forEach((message) => {
    if (!message.content?.trim() && (!Array.isArray(message.images) || message.images.length === 0)) {
      return;
    }
    const role = normalizeRole(message.role);
    if (role === 'user') {
      output.push({
        role: 'user',
        content: buildMessageContent(message),
      });
      return;
    }
    if (role === 'assistant') {
      output.push({
        role: 'assistant',
        content: message.content,
      });
      return;
    }
    output.push({
      role: 'system',
      content: message.content,
    });
  });

  return output;
};

export const runChatbotModel = async (input: {
  messages: Array<Pick<ChatMessage, 'role' | 'content' | 'images'>>;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}): Promise<{
  message: string;
  modelId: string;
  provider: 'openai' | 'ollama';
}> => {
  const { openai, isOllama } = await getClient(input.modelId);
  const completion = await openai.chat.completions.create({
    model: input.modelId,
    messages: buildMessages({
      messages: input.messages,
      systemPrompt: input.systemPrompt,
    }),
    temperature: input.temperature,
    max_tokens: input.maxTokens,
  });

  return {
    message: completion.choices[0]?.message.content?.trim() || '',
    modelId: input.modelId,
    provider: isOllama ? 'ollama' : 'openai',
  };
};
