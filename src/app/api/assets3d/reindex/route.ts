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

export const POST = apiHandler(async (req: NextRequest, ctx: ApiHandlerContext) => {
  try {
    return await POST_handler(req, ctx);
  } catch (error) {
    await ErrorSystem.captureException(error, { service: "api/assets3d/reindex", method: "POST" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reindex assets" },
      { status: 500 }
    );
  }
}, { source: "assets3d/reindex.POST" });

