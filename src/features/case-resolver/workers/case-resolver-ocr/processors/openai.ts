import OpenAI from 'openai';
import { type ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { resolveBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';
import { REMOTE_OCR_TIMEOUT_MS } from '../config';
import { parseOpenAiResponseText } from '../response-parsers';
import { buildOcrPromptContent, withPromiseTimeout } from '../utils';

export const runOpenAiOcrRequest = async (input: {
  model: string;
  prompt: string;
  filepath: string;
  base64Image?: string | undefined;
  mimeType?: string | undefined;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const apiKey = await resolveBrainProviderCredential('openai');
  const client = new OpenAI({ apiKey });

  const content: string | ChatCompletionContentPart[] =
    typeof input.base64Image === 'string' && input.base64Image.length > 0
      ? [
        {
          type: 'text' as const,
          text: input.prompt,
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:${input.mimeType || 'image/jpeg'};base64,${input.base64Image}`,
          },
        },
      ]
      : buildOcrPromptContent({
        prompt: input.prompt,
        filepath: input.filepath,
        extractedDocumentText: input.extractedDocumentText,
      });
  const messages = [
    {
      role: 'user' as const,
      content,
    },
  ];

  try {
    const completion = await withPromiseTimeout(
      client.chat.completions.create({
        model: input.model,
        messages,
        max_completion_tokens: 1500,
      }),
      REMOTE_OCR_TIMEOUT_MS,
      'OpenAI OCR'
    );
    return parseOpenAiResponseText(completion);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    if (!/max_completion_tokens/i.test(errorMessage)) {
      throw error;
    }
    const completion = await withPromiseTimeout(
      client.chat.completions.create({
        model: input.model,
        messages,
        max_tokens: 1500,
      }),
      REMOTE_OCR_TIMEOUT_MS,
      'OpenAI OCR'
    );
    return parseOpenAiResponseText(completion);
  }
};
