import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = getAsset3DRepository();
  const tags = await repository.getTags();
  return NextResponse.json(tags);
}
