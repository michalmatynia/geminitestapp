import type {
  OllamaChatPayload,
  OpenAiChatCompletionPayload,
  AnthropicMessageResponse,
  GeminiResponse,
} from './types';

export const parseOllamaResponseText = (payload: OllamaChatPayload): string => {
  const message =
    typeof payload.message?.content === 'string'
      ? payload.message.content
      : typeof payload.response === 'string'
        ? payload.response
        : '';
  return message.trim();
};

export const parseOpenAiResponseText = (payload: OpenAiChatCompletionPayload): string => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part: unknown): string => {
        if (!part || typeof part !== 'object') return '';
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('')
      .trim();
  }
  return '';
};

export const parseAnthropicResponseText = (payload: AnthropicMessageResponse): string => {
  return (payload.content ?? [])
    .map((part): string => {
      if (part?.type !== 'text') return '';
      return typeof part.text === 'string' ? part.text : '';
    })
    .join('')
    .trim();
};

export const parseGeminiResponseText = (payload: GeminiResponse): string => {
  return (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part): string => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
};
