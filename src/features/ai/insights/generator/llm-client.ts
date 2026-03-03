 
 
 
 

import OpenAI from 'openai';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

export const getClient = (
  modelName: string,
  apiKey: string | null
): { openai: OpenAI; isOllama: boolean } => {
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-');

  if (isOpenAI) {
    if (!apiKey) {
      throw new Error('OpenAI API key is missing for GPT model.');
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true,
  };
};

export const isAnthropicModel = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('claude');

export const isGeminiModel = (modelName: string): boolean => modelName.toLowerCase().startsWith('gemini');

export const runAnthropicChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system =
    params.messages.find((message: ChatMessage) => message.role === 'system')?.content ?? '';
  const conversation = params.messages
    .filter((message: ChatMessage) => message.role !== 'system')
    .map((message: ChatMessage) => ({ role: message.role, content: message.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 700,
      system: system || undefined,
      messages: conversation,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `Anthropic error (${res.status})`);
  }
  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text = data.content
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
  return text ?? '';
};

export const runGeminiChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system =
    params.messages.find((message: ChatMessage) => message.role === 'system')?.content ?? '';
  const userMessages = params.messages.filter((message: ChatMessage) => message.role === 'user');
  const assistantMessages = params.messages.filter(
    (message: ChatMessage) => message.role === 'assistant'
  );
  const contents = [
    ...userMessages.map((message: ChatMessage) => ({
      role: 'user',
      parts: [{ text: message.content }],
    })),
    ...assistantMessages.map((message: ChatMessage) => ({
      role: 'model',
      parts: [{ text: message.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      params.model
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 700 },
      }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `Gemini error (${res.status})`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
  return text ?? '';
};
