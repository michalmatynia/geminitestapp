import { NextRequest, NextResponse } from "next/server";
import { getSettingsCacheStats, isSettingsCacheDebugEnabled } from "@/shared/lib/settings-cache";
import { apiHandler } from "@/shared/lib/api/api-handler";
import { notFoundError } from "@/shared/errors/app-error";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext) {
  if (!isSettingsCacheDebugEnabled()) {
    throw notFoundError("Not found");
  }
  return NextResponse.json(getSettingsCacheStats(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = apiHandler(GET_handler, {
  source: "settings.cache.GET",
});
