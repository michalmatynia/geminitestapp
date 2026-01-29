import { NextResponse } from "next/server";

import { apiHandlerWithParams, ApiHandlerContext } from "@/shared/lib/api/api-handler";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { cancelPathRun } from "@/features/ai-paths/services/path-run-service";

async function POST_handler(
  req: Request,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<NextResponse | Response> {
  try {
    const runId = params.runId;
    const run = await cancelPathRun(runId);
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.cancel",
      fallbackMessage: "Failed to cancel run",
    });
  }
}

export const POST = apiHandlerWithParams(POST_handler, { source: "ai-paths.runs.cancel" });
