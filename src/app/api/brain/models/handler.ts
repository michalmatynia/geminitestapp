import { NextRequest, NextResponse } from 'next/server';

import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import type { BrainModelFamily, BrainModelModality } from '@/shared/contracts/ai-brain';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = 'nextUrl' in req && req.nextUrl ? req.nextUrl : new URL(req.url);
  const family = url.searchParams.get('family') as BrainModelFamily | null;
  const modality = url.searchParams.get('modality') as BrainModelModality | null;
  const streamingParam = url.searchParams.get('streaming');
  const streaming =
    streamingParam === 'true' ? true : streamingParam === 'false' ? false : undefined;
  const payload = await listBrainModels({
    ...(family ? { family } : {}),
    ...(modality ? { modality } : {}),
    ...(typeof streaming === 'boolean' ? { streaming } : {}),
  });
  return NextResponse.json(payload);
}
