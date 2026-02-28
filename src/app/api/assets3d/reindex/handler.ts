import { NextRequest, NextResponse } from 'next/server';

import { reindexAsset3DUploadsFromDisk } from '@/shared/lib/viewer3d/utils/asset3dReindex';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result = await reindexAsset3DUploadsFromDisk();
  return NextResponse.json(result);
}
