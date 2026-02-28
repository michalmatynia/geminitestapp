import 'server-only';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';

const resolveImageUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return value;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) {
    const base =
      process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
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
  message: Pick<ChatMessage, 'content' | 'images'>
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
}): Array<{
  role: 'system' | 'user' | 'assistant';
  content: string | ChatCompletionContentPart[];
}> => {
  const output: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | ChatCompletionContentPart[];
  }> = [];
  if (input.systemPrompt.trim()) {
    output.push({
      role: 'system',
      content: input.systemPrompt.trim(),
    });
  }

  input.messages.forEach((message) => {
    if (
      !message.content?.trim() &&
      (!Array.isArray(message.images) || message.images.length === 0)
    ) {
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
  provider: 'openai' | 'ollama' | 'anthropic' | 'gemini';
}> => {
  const completion = await runBrainChatCompletion({
    modelId: input.modelId,
    messages: buildMessages({
      messages: input.messages,
      systemPrompt: input.systemPrompt,
    }),
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  return {
    message: completion.text.trim() || '',
    modelId: completion.modelId,
    provider: completion.vendor,
  };
};
