export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = getAsset3DRepository();
  const tags = await repository.getTags();
  return NextResponse.json(tags);
}

export const GET = apiHandler(GET_handler, { source: "assets3d/tags.GET" });
