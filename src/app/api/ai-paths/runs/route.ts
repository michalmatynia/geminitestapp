export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import type { AiPathRunStatus } from "@/shared/types/ai-paths";
import {
  canAccessGlobalAiPathRuns,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from "@/features/ai/ai-paths/server";
import { removePathRunQueueEntries } from "@/features/jobs/workers/aiPathRunQueue";
import type { AiPathRunListOptions } from "@/features/ai/ai-paths/types/path-run-repository";

const DEFAULT_STALE_RUNNING_MAX_AGE_MS = 30 * 60 * 1000;

const RUN_STATUSES: AiPathRunStatus[] = [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
];

const TERMINAL_STATUSES: AiPathRunStatus[] = [
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
  const staleRunningMaxAgeMsRaw = Number.parseInt(
    process.env.AI_PATHS_STALE_RUNNING_MAX_AGE_MS ?? "",
    10
  );
  const staleRunningMaxAgeMs =
    Number.isFinite(staleRunningMaxAgeMsRaw) && staleRunningMaxAgeMsRaw > 0
      ? staleRunningMaxAgeMsRaw
      : DEFAULT_STALE_RUNNING_MAX_AGE_MS;
  try {
    await repo.markStaleRunningRuns(staleRunningMaxAgeMs);
  } catch {
    // Non-fatal cleanup best effort.
  }
  const hasGlobalRunAccess = canAccessGlobalAiPathRuns(access);
  const result = await repo.listRuns({
    ...(!hasGlobalRunAccess ? { userId: access.userId } : {}),
    ...(pathId ? { pathId } : {}),
    ...(query ? { query } : {}),
    ...(source ? { source, sourceMode } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  });
  return NextResponse.json(result);
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  enforceAiPathsActionRateLimit(access, "runs-clear");
  const url = new URL(req.url);
  const scopeRaw = url.searchParams.get("scope")?.trim().toLowerCase() || "terminal";
  const scope = scopeRaw === "all" ? "all" : "terminal";
  const pathId = url.searchParams.get("pathId")?.trim() || undefined;
  const source = url.searchParams.get("source")?.trim() || undefined;
  const sourceModeParam = url.searchParams.get("sourceMode")?.trim() || "";
  const sourceMode = sourceModeParam === "exclude" ? "exclude" : "include";

  const repo = getPathRunRepository();
  const hasGlobalRunAccess = canAccessGlobalAiPathRuns(access);
  const listOptions: AiPathRunListOptions = {};
  if (!hasGlobalRunAccess) {
    listOptions.userId = access.userId;
  }
  if (pathId) {
    listOptions.pathId = pathId;
  }
  if (source) {
    listOptions.source = source;
    listOptions.sourceMode = sourceMode;
  }
  if (scope === "terminal") {
    listOptions.statuses = TERMINAL_STATUSES;
  }
  const { runs } = await repo.listRuns(listOptions);
  const runIds = runs.map((run) => run.id).filter((runId): runId is string => Boolean(runId));
  if (runIds.length > 0) {
    await removePathRunQueueEntries(runIds);
  }
  const result = await repo.deleteRuns({
    ...listOptions,
  });

  return NextResponse.json({ deleted: result.count, scope });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "ai-paths.runs.list" });

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
 { source: "ai-paths.runs.clear" });
