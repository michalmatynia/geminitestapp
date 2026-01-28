import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { resumePathRun } from "@/features/ai-paths/services/path-run-service";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";
import { startAiPathRunQueue } from "@/features/jobs/server";

const requeueSchema = z.object({
  runIds: z.array(z.string().trim().min(1)).optional(),
  pathId: z.string().trim().optional().nullable(),
  mode: z.enum(["resume", "replay"]).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, requeueSchema, {
      logPrefix: "ai-paths.runs.dead-letter.requeue",
    });
    if (!parsed.ok) return parsed.response;

    const runIds = Array.isArray(parsed.data.runIds) ? parsed.data.runIds : [];
    const pathId = parsed.data.pathId?.trim() || undefined;
    const mode = parsed.data.mode ?? "resume";
    const limit = parsed.data.limit ?? undefined;

    const repo = await getPathRunRepository();
    let targetRunIds = runIds;

    if (targetRunIds.length === 0) {
      const { runs } = await repo.listRuns({
        ...(pathId ? { pathId } : {}),
        status: "dead_lettered",
        ...(limit ? { limit } : {}),
      });
      targetRunIds = runs.map((run) => run.id);
    }

    if (targetRunIds.length === 0) {
      return NextResponse.json({ requeued: 0, runIds: [], errors: [] });
    }

    const requeuedRunIds: string[] = [];
    const errors: Array<{ runId: string; error: string }> = [];

    for (const runId of targetRunIds) {
      try {
        const run = await repo.findRunById(runId);
        if (!run) {
          errors.push({ runId, error: "Run not found" });
          continue;
        }
        if (run.status !== "dead_lettered") {
          errors.push({ runId, error: `Run is ${run.status}` });
          continue;
        }
        await resumePathRun(runId, mode);
        requeuedRunIds.push(runId);
      } catch (error) {
        errors.push({
          runId,
          error: error instanceof Error ? error.message : "Failed to requeue run",
        });
      }
    }

    if (requeuedRunIds.length > 0) {
      startAiPathRunQueue();
    }

    return NextResponse.json({
      requeued: requeuedRunIds.length,
      runIds: requeuedRunIds,
      errors,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.dead-letter.requeue",
      fallbackMessage: "Failed to requeue dead-letter runs",
    });
  }
}

export const POST = apiHandler(POST_handler, {
  source: "ai-paths.runs.dead-letter.requeue",
});
