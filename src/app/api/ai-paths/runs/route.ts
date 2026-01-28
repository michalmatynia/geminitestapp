import { NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";
import type { AiPathRunStatus } from "@/shared/types/ai-paths";

const RUN_STATUSES: AiPathRunStatus[] = [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
];

async function GET_handler(req: Request) {
  try {
    const url = new URL(req.url);
    const pathId = url.searchParams.get("pathId")?.trim() || undefined;
    const statusParam = url.searchParams.get("status")?.trim() || "";
    const status = RUN_STATUSES.includes(statusParam as AiPathRunStatus)
      ? (statusParam as AiPathRunStatus)
      : undefined;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const limitRaw = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const offsetRaw = offsetParam ? Number.parseInt(offsetParam, 10) : NaN;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : undefined;
    const offset =
      Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : undefined;
    const repo = await getPathRunRepository();
    const result = await repo.listRuns({ pathId, status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.list",
      fallbackMessage: "Failed to load AI Path runs",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "ai-paths.runs.list" });
