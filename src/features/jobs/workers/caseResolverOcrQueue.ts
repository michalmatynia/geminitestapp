import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import OpenAI from 'openai';

import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '@/features/ai/image-studio/utils/studio-settings';
import { detectCaseResolverOcrProvider, type CaseResolverOcrProvider } from '@/features/case-resolver/ocr-provider';
import { resolveCaseResolverOcrDiskPath } from '@/features/case-resolver/server/ocr-runtime';
import {
  markCaseResolverOcrJobCompleted,
  markCaseResolverOcrJobFailed,
  markCaseResolverOcrJobRunning,
} from '@/features/case-resolver/server/ocr-runtime-job-store';
import { DEFAULT_CASE_RESOLVER_OCR_PROMPT } from '@/features/case-resolver/settings';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const LOG_SOURCE = 'case-resolver-ocr-queue';
const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL']?.trim() || '';
const MAX_PDF_OCR_TEXT_CHARS = 80_000;

type CaseResolverOcrQueueJobData = {
  jobId: string;
  filepath: string;
  model: string;
  prompt: string;
};

type CaseResolverResolvedOcrModel = {
  model: string;
  provider: CaseResolverOcrProvider;
};

type OllamaChatPayload = {
  message?: { content?: unknown };
  response?: unknown;
};

type OpenAiChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type AnthropicMessageResponse = {
  content?: Array<{
    type?: unknown;
    text?: unknown;
  }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
  }>;
};

export type CaseResolverOcrDispatchMode = 'queued' | 'inline';

const parseProviderPrefixedModel = (
  value: string
): CaseResolverResolvedOcrModel | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(openai|anthropic|gemini|ollama)\s*[:/]\s*(.+)$/i);
  if (!match) return null;

  const providerRaw = match[1]?.toLowerCase();
  const modelRaw = match[2]?.trim() ?? '';
  if (!providerRaw || !modelRaw) return null;

  if (
    providerRaw !== 'openai' &&
    providerRaw !== 'anthropic' &&
    providerRaw !== 'gemini' &&
    providerRaw !== 'ollama'
  ) {
    return null;
  }

  return {
    provider: providerRaw,
    model: modelRaw,
  };
};

export const inferCaseResolverOcrProviderFromModel = (
  modelName: string
): CaseResolverOcrProvider => detectCaseResolverOcrProvider(modelName);

export const resolveCaseResolverOcrModel = (
  model: string,
  fallbackModel: string = OLLAMA_MODEL
): CaseResolverResolvedOcrModel => {
  const runtimeModel = model.trim();
  const selectedModel = runtimeModel || fallbackModel.trim();
  if (!selectedModel) {
    throw new Error('OCR model is not configured.');
  }
  const explicitModel = parseProviderPrefixedModel(selectedModel);
  if (explicitModel) return explicitModel;
  return {
    model: selectedModel,
    provider: inferCaseResolverOcrProviderFromModel(selectedModel),
  };
};

const resolveOpenAiApiKey = async (): Promise<string> => {
  const apiKey =
    (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() || '';
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is missing for selected OCR model. Configure Image Studio API key (image_studio_openai_api_key).'
    );
  }
  return apiKey;
};

const resolveAnthropicApiKey = async (): Promise<string> => {
  const apiKey =
    (await getSettingValue('anthropic_api_key'))?.trim() ||
    process.env['ANTHROPIC_API_KEY']?.trim() ||
    '';
  if (!apiKey) {
    throw new Error('Anthropic API key is missing for selected OCR model.');
  }
  return apiKey;
};

const resolveGeminiApiKey = async (): Promise<string> => {
  const apiKey =
    (await getSettingValue('gemini_api_key'))?.trim() ||
    process.env['GEMINI_API_KEY']?.trim() ||
    '';
  if (!apiKey) {
    throw new Error('Gemini API key is missing for selected OCR model.');
  }
  return apiKey;
};

const resolveImageMimeType = (filepath: string): string => {
  const extension = path.extname(filepath).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.avif':
      return 'image/avif';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
};

const resolveOcrPrompt = (prompt: string): string => {
  const runtimePrompt = prompt.trim();
  if (runtimePrompt) return runtimePrompt;
  return DEFAULT_CASE_RESOLVER_OCR_PROMPT;
};

const buildOcrPromptContent = (input: {
  prompt: string;
  filepath: string;
  extractedDocumentText?: string | undefined;
}): string => {
  if (typeof input.extractedDocumentText !== 'string') {
    return input.prompt;
  }
  return [
    input.prompt,
    `Source file path: ${input.filepath}`,
    'DOCUMENT_TEXT_BEGIN',
    input.extractedDocumentText || '(No readable text extracted from the document.)',
    'DOCUMENT_TEXT_END',
  ].join('\n\n');
};

const parseOllamaResponseText = (payload: OllamaChatPayload): string => {
  const message =
    typeof payload.message?.content === 'string'
      ? payload.message.content
      : typeof payload.response === 'string'
        ? payload.response
        : '';
  return message.trim();
};

const parseOpenAiResponseText = (payload: OpenAiChatCompletionPayload): string => {
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

const parseAnthropicResponseText = (payload: AnthropicMessageResponse): string => {
  return (payload.content ?? [])
    .map((part): string => {
      if (part?.type !== 'text') return '';
      return typeof part.text === 'string' ? part.text : '';
    })
    .join('')
    .trim();
};

const parseGeminiResponseText = (payload: GeminiResponse): string => {
  return (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part): string => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
};

const runOllamaOcrRequest = async (input: {
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

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
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
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const fallback = `OCR runtime request failed (${response.status})`;
    throw new Error(responseBody.trim() || fallback);
  }

  const payload = (await response.json()) as OllamaChatPayload;
  return parseOllamaResponseText(payload);
};

const runOpenAiOcrRequest = async (input: {
  model: string;
  prompt: string;
  filepath: string;
  base64Image?: string | undefined;
  mimeType?: string | undefined;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const apiKey = await resolveOpenAiApiKey();
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
    const completion = await client.chat.completions.create({
      model: input.model,
      messages,
      max_completion_tokens: 1500,
    });
    return parseOpenAiResponseText(completion as unknown as OpenAiChatCompletionPayload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    // Backward compatibility for models/endpoints that still require max_tokens.
    if (!/max_completion_tokens/i.test(errorMessage)) {
      throw error;
    }
    const completion = await client.chat.completions.create({
      model: input.model,
      messages,
      max_tokens: 1500,
    });
    return parseOpenAiResponseText(completion as unknown as OpenAiChatCompletionPayload);
  }
};

const runAnthropicOcrRequest = async (input: {
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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  });
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(responseBody.trim() || `Anthropic OCR request failed (${response.status}).`);
  }
  const payload = (await response.json()) as AnthropicMessageResponse;
  return parseAnthropicResponseText(payload);
};

const runGeminiOcrRequest = async (input: {
  model: string;
  prompt: string;
  filepath: string;
  base64Image?: string | undefined;
  mimeType?: string | undefined;
  extractedDocumentText?: string | undefined;
}): Promise<string> => {
  const apiKey = await resolveGeminiApiKey();
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
  const response = await fetch(
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
    }
  );
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(responseBody.trim() || `Gemini OCR request failed (${response.status}).`);
  }
  const payload = (await response.json()) as GeminiResponse;
  return parseGeminiResponseText(payload);
};

const resolveOcrModel = (model: string): CaseResolverResolvedOcrModel => {
  const resolved = resolveCaseResolverOcrModel(model);
  if (resolved.model.trim()) return resolved;
  throw new Error('OCR model is not configured.');
};

const extractPdfTextForOcr = async (diskPath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(diskPath);
  const pdfParseModule = await import('pdf-parse');
  const parsed = await pdfParseModule.default(fileBuffer);
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (!text) return '';
  if (text.length <= MAX_PDF_OCR_TEXT_CHARS) return text;
  const truncatedChars = text.length - MAX_PDF_OCR_TEXT_CHARS;
  return `${text.slice(0, MAX_PDF_OCR_TEXT_CHARS)}\n\n[TRUNCATED ${truncatedChars} chars]`;
};

const runCaseResolverOcr = async (input: {
  filepath: string;
  model: string;
  prompt: string;
}): Promise<string> => {
  const resolvedPath = resolveCaseResolverOcrDiskPath(input.filepath);
  const resolvedModel = resolveOcrModel(input.model);
  const prompt = resolveOcrPrompt(input.prompt);
  if (resolvedPath.kind === 'image') {
    const buffer = await fs.readFile(resolvedPath.diskPath);
    const base64Image = buffer.toString('base64');
    const mimeType = resolveImageMimeType(resolvedPath.filepath);
    if (resolvedModel.provider === 'openai') {
      return runOpenAiOcrRequest({
        model: resolvedModel.model,
        prompt,
        filepath: resolvedPath.filepath,
        base64Image,
        mimeType,
      });
    }
    if (resolvedModel.provider === 'anthropic') {
      return runAnthropicOcrRequest({
        model: resolvedModel.model,
        prompt,
        filepath: resolvedPath.filepath,
        base64Image,
        mimeType,
      });
    }
    if (resolvedModel.provider === 'gemini') {
      return runGeminiOcrRequest({
        model: resolvedModel.model,
        prompt,
        filepath: resolvedPath.filepath,
        base64Image,
        mimeType,
      });
    }
    return runOllamaOcrRequest({
      model: resolvedModel.model,
      prompt,
      filepath: resolvedPath.filepath,
      images: [base64Image],
    });
  }

  const extractedDocumentText = await extractPdfTextForOcr(resolvedPath.diskPath);
  if (resolvedModel.provider === 'openai') {
    return runOpenAiOcrRequest({
      model: resolvedModel.model,
      prompt,
      filepath: resolvedPath.filepath,
      extractedDocumentText,
    });
  }
  if (resolvedModel.provider === 'anthropic') {
    return runAnthropicOcrRequest({
      model: resolvedModel.model,
      prompt,
      filepath: resolvedPath.filepath,
      extractedDocumentText,
    });
  }
  if (resolvedModel.provider === 'gemini') {
    return runGeminiOcrRequest({
      model: resolvedModel.model,
      prompt,
      filepath: resolvedPath.filepath,
      extractedDocumentText,
    });
  }
  return runOllamaOcrRequest({
    model: resolvedModel.model,
    prompt,
    filepath: resolvedPath.filepath,
    extractedDocumentText,
  });
};

const queue = createManagedQueue<CaseResolverOcrQueueJobData>({
  name: 'case-resolver-ocr',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    await markCaseResolverOcrJobRunning(data.jobId, data.filepath);
    try {
      const extractedText = await runCaseResolverOcr({
        filepath: data.filepath,
        model: data.model,
        prompt: data.prompt,
      });
      await markCaseResolverOcrJobCompleted(data.jobId, extractedText);
      return { ok: true, jobId: data.jobId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'OCR runtime job failed.';
      await markCaseResolverOcrJobFailed(data.jobId, errorMessage);
      throw error;
    }
  },
  onCompleted: async (jobId, _result, data) => {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `OCR job ${data.jobId} completed`,
      context: { queueJobId: jobId, runtimeJobId: data.jobId },
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      action: 'onFailed',
      queueJobId: jobId,
      runtimeJobId: data.jobId,
    });
  },
});

export const startCaseResolverOcrQueue = (): void => {
  queue.startWorker();
};

export const enqueueCaseResolverOcrJob = async (
  data: CaseResolverOcrQueueJobData
): Promise<CaseResolverOcrDispatchMode> => {
  if (!isRedisAvailable()) {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Redis unavailable for OCR job ${data.jobId}; processing inline`,
      context: { runtimeJobId: data.jobId },
    });
    await queue.processInline(data);
    return 'inline';
  }

  try {
    await queue.enqueue(data, { jobId: data.jobId });
    return 'queued';
  } catch (enqueueError) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for OCR job ${data.jobId}; falling back to inline processing`,
      context: {
        runtimeJobId: data.jobId,
        error:
          enqueueError instanceof Error
            ? enqueueError.message
            : String(enqueueError),
      },
    });

    try {
      await queue.processInline(data);
      return 'inline';
    } catch (inlineError) {
      await ErrorSystem.captureException(inlineError, {
        service: LOG_SOURCE,
        action: 'inline-fallback-failed',
        runtimeJobId: data.jobId,
      });
      throw inlineError;
    }
  }
};
