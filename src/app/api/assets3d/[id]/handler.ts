import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository, deleteAsset3D } from '@/features/viewer3d/server';
import type { Asset3DUpdateInput } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = getAsset3DRepository();
  const asset = await repository.getAsset3DById(params.id);

  if (!asset) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  return NextResponse.json(asset);
}

export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'assets3d.[id].PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.data as Asset3DUpdateInput;

  const repository = getAsset3DRepository();
  const asset = await repository.updateAsset3D(params.id, body);

  if (!asset) {
    throw notFoundError('3D asset not found', { id: params.id });
  }

  return NextResponse.json(asset);
}

export async function DELETE_handler(
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
