export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { reindexAsset3DUploadsFromDisk } from "@/features/viewer3d/utils/asset3dReindex";
import { ErrorSystem } from "@/features/observability/server";

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const result = await reindexAsset3DUploadsFromDisk();
  return NextResponse.json(result);
}

export const POST = apiHandler(POST_handler, { source: "assets3d/reindex.POST" });

