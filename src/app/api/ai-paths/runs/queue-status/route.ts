export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { requireAiPathsAccess } from "@/features/ai/ai-paths/server";
import { getAiPathRunQueueStatus, startAiPathRunQueue } from "@/features/jobs/server";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsAccess();
    startAiPathRunQueue();
    const status = getAiPathRunQueueStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.queue-status",
      fallbackMessage: "Failed to fetch AI Paths queue status",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "ai-paths.runs.queue-status" }
);
