import { NextRequest, NextResponse } from "next/server";

import {  apiHandlerWithParams, ApiHandlerContext , type ApiHandlerContext } from "@/shared/lib/api/api-handler";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";

async function GET_handler(
  _req: Request,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<NextResponse | Response> {
  try {
    const runId = params.runId;
    const repo = await getPathRunRepository();
    const run = await repo.findRunById(runId);
    if (!run) {
      throw notFoundError("Run not found", { runId });
    }
    const nodes = await repo.listRunNodes(runId);
    const events = await repo.listRunEvents(runId);
    return NextResponse.json({ run, nodes, events });
  } catch (error) {
    return createErrorResponse(error, {
      request: _req,
      source: "ai-paths.runs.detail",
      fallbackMessage: "Failed to load run details",
    });
  }
}

export const GET = apiHandlerWithParams(GET_handler, { source: "ai-paths.runs.detail" });
