import { type NextRequest, NextResponse } from 'next/server';

import {
  deleteAsset3D,
  findAsset3DRepositoryAsset,
  getAsset3DFromLookupRepositories,
} from '@/features/viewer3d/server';
import {
  deleteMilkbarAsset3DInRedisRuntime,
  isMilkbarAsset3DRecord,
} from '@/features/viewer3d/workers/milkbarAsset3DDeleteQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  asset3DUpdateInputSchema,
  type Asset3DRecord,
  type Asset3DUpdateInput,
} from '@/shared/contracts/viewer3d';
import { notFoundError } from '@/shared/errors/app-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { cacheTag, revalidateTag } from 'next/cache';

const ASSETS3D_LIST_CACHE_TAG = 'assets3d-list';

const getAsset3DDetailCacheTag = (id: string): string => `assets3d-detail:${id}`;

const revalidateAsset3DCache = (id: string): void => {
  revalidateTag(ASSETS3D_LIST_CACHE_TAG, 'max');
  revalidateTag(getAsset3DDetailCacheTag(id), 'max');
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const asset = await getAsset3DByIdCached(params.id);

  if (!asset) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  return NextResponse.json(asset);
}

async function getAsset3DByIdCached(id: string): Promise<Asset3DRecord | null> {
  'use cache';
  applyCacheLife('swr60');
  cacheTag(getAsset3DDetailCacheTag(id));

  return getAsset3DFromLookupRepositories(id);
}

export async function patchHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsed = await parseJsonBody(req, asset3DUpdateInputSchema, {
    logPrefix: 'assets3d.[id].PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const body: Asset3DUpdateInput = parsed.data;

  const match = await findAsset3DRepositoryAsset(params.id);
  if (match === null) {
    throw notFoundError('3D asset not found', { id: params.id });
  }
  const asset = await match.repository.updateAsset3D(params.id, body);

  if (!asset) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  revalidateAsset3DCache(params.id);

  return NextResponse.json(asset);
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const match = await findAsset3DRepositoryAsset(params.id);
  if (match === null) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  if (isMilkbarAsset3DRecord(match.asset)) {
    await deleteMilkbarAsset3DInRedisRuntime({
      assetId: params.id,
      requestedAt: new Date().toISOString(),
    });
    revalidateAsset3DCache(params.id);
    return NextResponse.json({ success: true });
  }

  const success = await deleteAsset3D(params.id);

  if (!success) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  revalidateAsset3DCache(params.id);

  return NextResponse.json({ success: true });
}
