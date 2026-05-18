/**
 * AI Brain - OpenAI Provider
 * 
 * Logic for interacting with OpenAI-compatible APIs, including managed models
 * and local Ollama instances.
 * 
 * Responsibilities:
 * - Normalization: Converts internal `BrainChatMessage` structures into OpenAI's 
 *   API-specific message formats.
 * - Content Adaptation: Handles stringification of complex message parts (like 
 *   images) for models that do not support multi-modal input.
 */

import type { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { type BrainChatMessage } from '../server-runtime-client';

/**
 * Normalizes complex message content (images, parts) into a string representation
 * for models limited to text-only inputs.
 * 
 * @param value - The input content, either a raw string or an array of message parts
 * @returns A stringified version of the content, suitable for text-only completion APIs
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
