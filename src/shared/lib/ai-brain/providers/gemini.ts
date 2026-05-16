/**
 * AI Brain - Gemini Provider
 * 
 * Logic for interacting with Google Gemini APIs.
 */

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { type BrainChatMessage } from '../server-runtime-client';

type GeminiMessagePart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

type GeminiMessagesBuildResult = {
  systemPrompt: string;
  contents: Array<{
    role: 'model' | 'user';
    parts: GeminiMessagePart[];
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
 * Builds messages specifically formatted for the Gemini (Google) API.
 */
export const buildGeminiMessages = (
  messages: BrainChatMessage[]
): GeminiMessagesBuildResult => {
  const systemPrompt = messages
    .filter((message: BrainChatMessage): boolean => message.role === 'system')
    .map((message: BrainChatMessage): string => String(message.content))
    .join('\n\n')
    .trim();
  const contents = messages
    .filter((message: BrainChatMessage): boolean => message.role !== 'system')
    .map((message: BrainChatMessage): GeminiMessagesBuildResult['contents'][number] => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts:
        typeof message.content === 'string'
          ? [{ text: message.content }]
          : message.content.map((part: ChatCompletionContentPart) => {
              if (part.type === 'text') return { text: part.text };
              if (part.type === 'image_url') {
                const parsed = extractBase64ImageData(
                  typeof part.image_url === 'string' ? part.image_url : part.image_url.url
                );
                if (parsed) {
                  return { inline_data: { mime_type: parsed.mediaType, data: parsed.data } };
                }
              }
              return { text: '' };
            }),
    }));
  return { systemPrompt, contents };
};
