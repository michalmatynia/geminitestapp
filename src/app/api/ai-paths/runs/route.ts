export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import type { AiPathRunStatus } from "@/shared/types/ai-paths";
import { requireAiPathsAccess } from "@/features/ai/ai-paths/server";

const RUN_STATUSES: AiPathRunStatus[] = [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
];

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  const url = new URL(req.url);
  const pathId = url.searchParams.get("pathId")?.trim() || undefined;
  const query = url.searchParams.get("query")?.trim() || undefined;
  const source = url.searchParams.get("source")?.trim() || undefined;
  const sourceModeParam = url.searchParams.get("sourceMode")?.trim() || "";
  const sourceMode = sourceModeParam === "exclude" ? "exclude" : "include";
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
  const repo = getPathRunRepository();
  const result = await repo.listRuns({
    ...(!access.isElevated ? { userId: access.userId } : {}),
    ...(pathId ? { pathId } : {}),
    ...(query ? { query } : {}),
    ...(source ? { source, sourceMode } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  });
  return NextResponse.json(result);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "ai-paths.runs.list" });
