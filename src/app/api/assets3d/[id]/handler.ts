import { type NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository, deleteAsset3D } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { asset3DUpdateInputSchema, type Asset3DUpdateInput } from '@/shared/contracts/viewer3d';
import { notFoundError } from '@/shared/errors/app-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

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

async function getAsset3DByIdCached(id: string) {
  'use cache';
  applyCacheLife('swr60');

  const repository = getAsset3DRepository();
  return repository.getAsset3DById(id);
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

  const repository = getAsset3DRepository();
  const asset = await repository.updateAsset3D(params.id, body);

  if (!asset) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  return NextResponse.json(asset);
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const success = await deleteAsset3D(params.id);

  if (!success) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  return NextResponse.json({ success: true });
}
