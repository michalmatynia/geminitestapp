import { NextRequest, NextResponse } from "next/server";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";
import { assertAiPathRunAccess, requireAiPathsAccess } from "@/features/ai-paths/server";

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  try {
    const access = await requireAiPathsAccess();
    const runId = params.runId;
    const repo = getPathRunRepository();
    const run = await repo.findRunById(runId);
    if (run === null) {
      throw notFoundError("Run not found", { runId });
    }
    assertAiPathRunAccess(access, run);
    const nodes = await repo.listRunNodes(runId);
    const events = await repo.listRunEvents(runId);
    return NextResponse.json({ run, nodes, events });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.detail",
      fallbackMessage: "Failed to load run details",
    });
  }
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, { source: "ai-paths.runs.detail" });
