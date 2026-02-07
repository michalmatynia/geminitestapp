export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { notFoundError } from "@/shared/errors/app-error";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import { assertAiPathRunAccess, requireAiPathsAccess } from "@/features/ai/ai-paths/server";

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
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
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, { source: "ai-paths.runs.detail" });
