import { NextRequest, NextResponse } from 'next/server';

import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import type { ImageStudioModelsResponse } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const payload = await listBrainModels({ family: 'image_generation' });
  const response: ImageStudioModelsResponse = {
    models: payload.models,
    source: 'brain',
    ...(payload.warning?.message ? { warning: payload.warning.message } : {}),
  };
  return NextResponse.json(response);
}
