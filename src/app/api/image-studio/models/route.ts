export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS,
  toLikelyImageModelIds,
  uniqueSortedModelIds,
} from '@/features/ai/image-studio/utils/image-models';
import {
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type ImageStudioModelsResponse = {
  models: string[];
  source: 'openai' | 'fallback';
  warning?: string;
};

const readOpenAiKey = async (): Promise<string | null> => {
  const key =
    (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await getSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY'] ||
    null;
  return key?.trim() ? key.trim() : null;
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const fallbackModels = uniqueSortedModelIds(IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS);
  const apiKey = await readOpenAiKey();

  if (!apiKey) {
    const response: ImageStudioModelsResponse = {
      models: fallbackModels,
      source: 'fallback',
      warning: 'OpenAI API key missing. Showing fallback image-capable models.',
    };
    return NextResponse.json(response);
  }

  try {
    const client = new OpenAI({ apiKey });
    const listResponse = await client.models.list();
    const discovered = (listResponse.data ?? [])
      .map((item: { id?: string | null }) => (typeof item?.id === 'string' ? item.id : ''))
      .filter(Boolean);

    const likelyImageModels = toLikelyImageModelIds(discovered);
    const merged = uniqueSortedModelIds([
      ...likelyImageModels,
      ...fallbackModels,
    ]);

    const response: ImageStudioModelsResponse = {
      models: merged,
      source: 'openai',
      ...(likelyImageModels.length === 0
        ? { warning: 'No image-capable GPT models were discovered from OpenAI. Showing fallback models.' }
        : {}),
    };
    return NextResponse.json(response);
  } catch {
    const response: ImageStudioModelsResponse = {
      models: fallbackModels,
      source: 'fallback',
      warning: 'Failed to fetch models from OpenAI. Showing fallback image-capable models.',
    };
    return NextResponse.json(response);
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'image-studio.models.GET',
  }
);
