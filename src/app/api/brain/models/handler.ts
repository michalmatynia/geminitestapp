import { NextRequest, NextResponse } from 'next/server';

import { listBrainModels } from '@/features/ai/brain/server-model-catalog';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const payload = await listBrainModels();
  return NextResponse.json(payload);
}
