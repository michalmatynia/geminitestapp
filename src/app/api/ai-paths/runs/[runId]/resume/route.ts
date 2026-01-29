import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { resumePathRun } from "@/features/ai-paths/services/path-run-service";
import { startAiPathRunQueue } from "@/features/jobs/server";

const resumeSchema = z.object({
  mode: z.enum(["resume", "replay"]).optional(),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, resumeSchema, {
      logPrefix: "ai-paths.runs.resume",
    });
    if (!parsed.ok) return parsed.response as Response;

    const runId = params.runId;
    const mode = parsed.data.mode ?? "resume";
    const run = await resumePathRun(runId, mode);
    startAiPathRunQueue();
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.resume",
      fallbackMessage: "Failed to resume run",
    });
  }
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: "ai-paths.runs.resume",
});
