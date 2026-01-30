import { NextRequest, NextResponse } from "next/server";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { cancelPathRun } from "@/features/ai-paths/services/path-run-service";

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  try {
    const runId: string = params.runId;
    const run: unknown = await cancelPathRun(runId);
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.cancel",
      fallbackMessage: "Failed to cancel run",
    });
  }
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: "ai-paths.runs.cancel",
});
