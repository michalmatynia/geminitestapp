import { NextResponse } from "next/server";

import { getSettingsCacheStats, isSettingsCacheDebugEnabled } from "@/shared/lib/settings-cache";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  if (!isSettingsCacheDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(getSettingsCacheStats(), {
    headers: { "Cache-Control": "no-store" },
  });
}
