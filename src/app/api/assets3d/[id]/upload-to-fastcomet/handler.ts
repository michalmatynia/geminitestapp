import { type NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

import { uploadMilkbarAsset3DInRedisRuntime } from '@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const ASSETS3D_LIST_CACHE_TAG = 'assets3d-list';

const getAsset3DDetailCacheTag = (id: string): string => `assets3d-detail:${id}`;

const revalidateAsset3DCache = (id: string): void => {
  revalidateTag(ASSETS3D_LIST_CACHE_TAG, 'max');
  revalidateTag(getAsset3DDetailCacheTag(id), 'max');
};

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const asset = await uploadMilkbarAsset3DInRedisRuntime({
    assetId: params.id,
    requestedAt: new Date().toISOString(),
  });
  revalidateAsset3DCache(params.id);
  return NextResponse.json({ asset });
}
