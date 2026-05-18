import { type NextRequest, NextResponse } from 'next/server';

import { uploadMilkbarAsset3DInRedisRuntime } from '@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const asset = await uploadMilkbarAsset3DInRedisRuntime({
    assetId: params.id,
    requestedAt: new Date().toISOString(),
  });
  return NextResponse.json({ asset });
}
