export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { cancelPathRun } from "@/features/ai/ai-paths/services/path-run-service";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import { notFoundError } from "@/shared/errors/app-error";
import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from "@/features/ai/ai-paths/server";

async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  enforceAiPathsActionRateLimit(access, "run-cancel");
  const runId: string = params.runId;
  const repo = getPathRunRepository();
  const existing = await repo.findRunById(runId);
  if (!existing) {
    throw notFoundError("Run not found", { runId });
  }
  assertAiPathRunAccess(access, existing);
  const run: unknown = await cancelPathRun(runId);
  return NextResponse.json({ run });
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: "ai-paths.runs.cancel",
});
