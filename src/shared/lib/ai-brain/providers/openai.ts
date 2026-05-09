/**
 * AI Brain - OpenAI Provider
 * 
 * Logic for interacting with OpenAI-compatible APIs (including Ollama).
 */

import type { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { type BrainChatMessage } from '../server-runtime-client';

/**
 * Stringifies complex message content for models that only support text.
 */
const stringifyMessageContent = (value: string | ChatCompletionContentPart[]): string => {
  if (typeof value === 'string') return value;
  return value
    .map((part: ChatCompletionContentPart): string => {
      if (part.type === 'text') return part.text;
      if (part.type === 'image_url') return '[image]';
      return '';
    })
    .join('\n')
    .trim();
};

/**
 * Builds OpenAI-compatible message parameters.
 */
export const buildOpenAiCompatibleMessages = (
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
