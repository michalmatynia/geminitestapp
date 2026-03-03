import { OLLAMA_BASE_URL, OLLAMA_OCR_TIMEOUT_MS } from '../config';
import { parseOllamaResponseText } from '../response-parsers';
import { type OllamaChatPayload } from '../types';
import { buildOcrPromptContent, fetchWithTimeout } from '../utils';

export const runOllamaOcrRequest = async (input: {
  model: string;
  prompt: string;
  images?: string[] | undefined;
  filepath: string;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const content = buildOcrPromptContent({
    prompt: input.prompt,
    filepath: input.filepath,
    extractedDocumentText: input.extractedDocumentText,
  });

  const response = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        messages: [
          {
            role: 'user',
            content,
            ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
          },
        ],
      }),
    },
    OLLAMA_OCR_TIMEOUT_MS,
    'Ollama OCR'
  );

  if (!response.ok) {
    const responseBody = await response.text();
    const fallback = `OCR runtime request failed (${response.status})`;
    throw new Error(responseBody.trim() || fallback);
  }

  const payload = (await response.json()) as OllamaChatPayload;
  return parseOllamaResponseText(payload);
};
