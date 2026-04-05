import { NextRequest, NextResponse } from 'next/server';

import { reindexAsset3DUploadsFromDisk } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result = await reindexAsset3DUploadsFromDisk();
  return NextResponse.json(result);
}
