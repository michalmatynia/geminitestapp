import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository, deleteAsset3D } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { asset3DUpdateInputSchema, type Asset3DUpdateInput } from '@/shared/contracts/viewer3d';
import { notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

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
