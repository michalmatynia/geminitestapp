import { REMOTE_OCR_TIMEOUT_MS } from '../config';
import { resolveAnthropicApiKey } from '../api-keys';
import { parseAnthropicResponseText } from '../response-parsers';
import { type AnthropicMessageResponse } from '../types';
import { buildOcrPromptContent, fetchWithTimeout } from '../utils';

export const runAnthropicOcrRequest = async (input: {
  model: string;
  prompt: string;
  filepath: string;
  base64Image?: string | undefined;
  mimeType?: string | undefined;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const apiKey = await resolveAnthropicApiKey();
  const content = [
    {
      type: 'text',
      text:
        typeof input.base64Image === 'string'
          ? input.prompt
          : buildOcrPromptContent({
            prompt: input.prompt,
            filepath: input.filepath,
            extractedDocumentText: input.extractedDocumentText,
          }),
    },
    ...(typeof input.base64Image === 'string' && input.base64Image.length > 0
      ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.mimeType || 'image/jpeg',
            data: input.base64Image,
          },
        },
      ]
      : []),
  ];
  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    },
    REMOTE_OCR_TIMEOUT_MS,
    'Anthropic OCR'
  );
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(responseBody.trim() || `Anthropic OCR request failed (${response.status}).`);
  }
  const payload = (await response.json()) as AnthropicMessageResponse;
  return parseAnthropicResponseText(payload);
};
