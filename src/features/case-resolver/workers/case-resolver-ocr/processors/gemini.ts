import { resolveBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';

import { REMOTE_OCR_TIMEOUT_MS } from '../config';
import { parseGeminiResponseText } from '../response-parsers';
import { type GeminiResponse } from '../types';
import { buildOcrPromptContent, fetchWithTimeout } from '../utils';

export const runGeminiOcrRequest = async (input: {
  model: string;
  prompt: string;
  filepath: string;
  base64Image?: string | undefined;
  mimeType?: string | undefined;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const apiKey = await resolveBrainProviderCredential('gemini');
  const parts = [
    {
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
          inline_data: {
            mime_type: input.mimeType || 'image/jpeg',
            data: input.base64Image,
          },
        },
      ]
      : []),
  ];
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      input.model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { maxOutputTokens: 1500 },
      }),
    },
    REMOTE_OCR_TIMEOUT_MS,
    'Gemini OCR'
  );
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(responseBody.trim() || `Gemini OCR request failed (${response.status}).`);
  }
  const payload = (await response.json()) as GeminiResponse;
  return parseGeminiResponseText(payload);
};
