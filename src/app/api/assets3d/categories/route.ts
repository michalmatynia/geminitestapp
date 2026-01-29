import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = getAsset3DRepository();
  const categories = await repository.getCategories();
  return NextResponse.json(categories);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "assets3d/categories.GET" });
