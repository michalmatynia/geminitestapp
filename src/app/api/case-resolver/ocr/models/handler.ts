import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '@/features/ai/image-studio/utils/studio-settings';
import {
  CASE_RESOLVER_OCR_OPENAI_MODEL_FALLBACKS,
  isLikelyCaseResolverOcrCapableModelId,
  toLikelyCaseResolverOcrModelIds,
  uniqueSortedCaseResolverOcrModelIds,
} from '@/features/case-resolver/ocr-models';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODELS_TIMEOUT_MS = 2_500;

type CaseResolverOcrModelKeySource =
  | 'image_studio_openai_api_key'
  | 'openai_api_key'
  | 'env_openai_api_key'
  | 'none';

type CaseResolverOcrModelsResponse = {
  models: string[];
  ollamaModels: string[];
  otherModels: string[];
  keySource: CaseResolverOcrModelKeySource;
  warning?: {
    code: string;
    message: string;
  };
};

const resolveOpenAiKey = async (): Promise<{
  key: string | null;
  source: CaseResolverOcrModelKeySource;
}> => {
  const imageStudioKey = (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ?? '';
  if (imageStudioKey) {
    return {
      key: imageStudioKey,
      source: 'image_studio_openai_api_key',
    };
  }

  return {
    key: null,
    source: 'none',
  };
};

const fetchOllamaModels = async (): Promise<string[] | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_MODELS_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      models?: Array<{ name?: string | null }>;
    };
    const names = (payload.models ?? [])
      .map((model: { name?: string | null }): string =>
        typeof model.name === 'string' ? model.name.trim() : ''
      )
      .filter(Boolean);
    return toLikelyCaseResolverOcrModelIds(names);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isLikelyOpenAiOcrModel = (modelId: string): boolean => {
  const normalized = modelId.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('gpt-image') || normalized.startsWith('dall-e')) return false;
  if (
    normalized.startsWith('gpt-') ||
    normalized.startsWith('ft:gpt-') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.startsWith('chatgpt-')
  ) {
    return true;
  }
  return isLikelyCaseResolverOcrCapableModelId(normalized);
};

const fetchOpenAiModels = async (apiKey: string): Promise<string[] | null> => {
  try {
    const client = new OpenAI({ apiKey });
    const listResponse = await client.models.list();
    const discovered = (listResponse.data ?? [])
      .map((entry: { id?: string | null }): string =>
        typeof entry.id === 'string' ? entry.id.trim() : ''
      )
      .filter(Boolean);
    return uniqueSortedCaseResolverOcrModelIds(
      discovered.filter((modelId: string): boolean => isLikelyOpenAiOcrModel(modelId))
    );
  } catch {
    return null;
  }
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const [{ key, source }, ollamaModels] = await Promise.all([
    resolveOpenAiKey(),
    fetchOllamaModels(),
  ]);

  const openAiModels = key ? await fetchOpenAiModels(key) : null;
  const fallbackModels = toLikelyCaseResolverOcrModelIds(CASE_RESOLVER_OCR_OPENAI_MODEL_FALLBACKS);
  const normalizedOllamaModels = uniqueSortedCaseResolverOcrModelIds(ollamaModels ?? []);
  const normalizedOtherModels = uniqueSortedCaseResolverOcrModelIds([
    ...(openAiModels ?? []),
    ...fallbackModels,
  ]);
  const mergedModels = uniqueSortedCaseResolverOcrModelIds([
    ...normalizedOllamaModels,
    ...normalizedOtherModels,
  ]);

  let warning: CaseResolverOcrModelsResponse['warning'] = undefined;
  if (source === 'none') {
    warning = {
      code: 'OPENAI_KEY_MISSING',
      message:
        'Image Studio OpenAI key is missing. Showing OCR fallback models and OCR-capable local Ollama models.',
    };
  } else if (openAiModels === null) {
    warning = {
      code: 'OPENAI_MODELS_UNAVAILABLE',
      message:
        'Failed to fetch OpenAI model list. Showing OCR fallback models and OCR-capable local Ollama models.',
    };
  }

  const response: CaseResolverOcrModelsResponse = {
    models: mergedModels,
    ollamaModels: normalizedOllamaModels,
    otherModels: normalizedOtherModels,
    keySource: source,
    ...(warning ? { warning } : {}),
  };
  return NextResponse.json(response);
}
