/**
 * AI Brain - Anthropic Provider
 * 
 * Logic for interacting with Anthropic (Claude) APIs.
 */

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { type BrainChatMessage } from '../server-runtime-client';

type AnthropicMessageContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
        data: string;
      };
    };

type AnthropicMessagesBuildResult = {
  systemPrompt: string;
  chatMessages: Array<{
    role: 'assistant' | 'user';
    content: AnthropicMessageContentPart[];
  }>;
};

/**
 * Extracts base64 image data from a data URL.
 */
const extractBase64ImageData = (
  dataUrl: string
): { mediaType: string; data: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1] ?? '', data: match[2] ?? '' };
};

/**
 * Builds messages specifically formatted for the Anthropic API.
 */
export const buildAnthropicMessages = (
  messages: BrainChatMessage[]
): AnthropicMessagesBuildResult => {
  const systemPrompt = messages
    .filter((message: BrainChatMessage): boolean => message.role === 'system')
    .map((message: BrainChatMessage): string => String(message.content))
    .join('\n\n')
    .trim();
  const chatMessages = messages
    .filter((message: BrainChatMessage): boolean => message.role !== 'system')
    .map((message: BrainChatMessage): AnthropicMessagesBuildResult['chatMessages'][number] => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content:
        typeof message.content === 'string'
          ? [{ type: 'text' as const, text: message.content }]
          : message.content.map((part: ChatCompletionContentPart) => {
              if (part.type === 'text') return { type: 'text' as const, text: part.text };
              if (part.type === 'image_url') {
                const parsed = extractBase64ImageData(
                  typeof part.image_url === 'string' ? part.image_url : part.image_url.url
                );
                if (parsed) {
                  return {
                    type: 'image' as const,
                    source: {
                      type: 'base64' as const,
                      media_type: parsed.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                      data: parsed.data,
                    },
                  };
                }
              }
              return { type: 'text' as const, text: '' };
            }),
    }));
  return { systemPrompt, chatMessages };
};
