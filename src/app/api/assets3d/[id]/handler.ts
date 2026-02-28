import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository, deleteAsset3D } from '@/shared/lib/viewer3d/server';
import type { Asset3DUpdateInput } from '@/shared/lib/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError, badRequestError } from '@/shared/errors/app-error';

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
  let body: Asset3DUpdateInput;
  try {
    body = (await req.json()) as Asset3DUpdateInput;
  } catch {
    throw badRequestError('Invalid JSON body');
  }

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
