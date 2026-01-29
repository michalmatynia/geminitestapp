import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository, deleteAsset3D } from "@/features/viewer3d/server";
import type { Asset3DUpdateInput } from "@/features/viewer3d/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import { notFoundError, badRequestError } from "@/shared/errors/app-error";

async function GET_handler(_req: NextRequest, _ctx: any, params: { id: string }): Promise<Response> {
  const repository = getAsset3DRepository();
  const asset = await repository.getAsset3DById(params.id);

  if (!asset) {
    throw notFoundError("3D asset not found", { id: params.id });
  }

  return NextResponse.json(asset);
}

async function PATCH_handler(req: NextRequest, _ctx: any, params: { id: string }): Promise<Response> {
  let body: Asset3DUpdateInput;
  try {
    body = (await req.json()) as Asset3DUpdateInput;
  } catch {
    throw badRequestError("Invalid JSON body");
  }

  const repository = getAsset3DRepository();
  const asset = await repository.updateAsset3D(params.id, body);

  if (!asset) {
    throw notFoundError("3D asset not found", { id: params.id });
  }

  return NextResponse.json(asset);
}

async function DELETE_handler(_req: NextRequest, _ctx: any, params: { id: string }): Promise<Response> {
  const success = await deleteAsset3D(params.id);

  if (!success) {
    throw notFoundError("3D asset not found", { id: params.id });
  }

  return NextResponse.json({ success: true });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "assets3d/[id].GET" });

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: "assets3d/[id].PATCH" });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "assets3d/[id].DELETE" });
