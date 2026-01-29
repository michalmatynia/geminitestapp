import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function GET_handler(): Promise<Response> {
  const repository = getAsset3DRepository();
  const tags = await repository.getTags();
  return NextResponse.json(tags);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(),
 { source: "assets3d/tags.GET" });
