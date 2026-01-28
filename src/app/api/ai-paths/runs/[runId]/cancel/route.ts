import { NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { cancelPathRun } from "@/features/ai-paths/services/path-run-service";

async function POST_handler(
  req: Request,
  context: { params: { runId: string } }
) {
  try {
    const runId = context.params.runId;
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

export const POST = apiHandler(POST_handler, { source: "ai-paths.runs.cancel" });
