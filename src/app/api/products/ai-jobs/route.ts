export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getProductAiJobs, deleteTerminalProductAiJobs, deleteAllProductAiJobs, cleanupStaleRunningProductAiJobs } from "@/features/jobs/server";
import { startProductAiJobQueue, getQueueStatus } from "@/features/jobs/server";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const staleCount = await cleanupStaleRunningProductAiJobs(1000 * 60 * 10);
    if (staleCount > 0) {
      console.log(`[api/products/ai-jobs] Marked ${staleCount} stale running jobs as failed`);
    }
    const { searchParams } = new URL(req.url);

    // Check if requesting queue status
    const checkStatus = searchParams.get("status");
    if (checkStatus === "true") {
      const status = await getQueueStatus();
      console.log("[api/products/ai-jobs] Queue status:", status);
      return NextResponse.json({ status });
    }

    const productId = searchParams.get("productId") || undefined;
    const jobs = await getProductAiJobs(productId);
    const queueStatus = await getQueueStatus();
    if (!queueStatus.running) {
      const hasActiveJobs = jobs.some(
        (job) => job.status === "pending" || job.status === "running"
      );
      const hasScheduledJobs = jobs.some((job) => hasScheduledMarker(job.payload));
      if (hasActiveJobs || hasScheduledJobs) {
        startProductAiJobQueue();
      }
    }
    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      console.warn("[api/products/ai-jobs] Prisma schema mismatch; returning empty job list.", {
        code: error.code,
      });
      return NextResponse.json({ jobs: [] });
    }
    throw error;
  }
}

const hasScheduledMarker = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = ["runAt", "scheduledAt", "scheduleAt", "nextRunAt", "schedule", "scheduled", "cron"];
  if (keys.some((key) => record[key])) return true;
  const context = record.context;
  if (context && typeof context === "object") {
    const ctx = context as Record<string, unknown>;
    if (keys.some((key) => ctx[key])) return true;
  }
  return false;
};

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (scope === "terminal") {
    const count = await deleteTerminalProductAiJobs();
    return NextResponse.json({ success: true, count });
  }
  if (scope === "all") {
    const count = await deleteAllProductAiJobs();
    return NextResponse.json({ success: true, count });
  }

  throw badRequestError("Invalid scope");
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.ai-jobs.GET" });
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
 { source: "products.ai-jobs.DELETE" });
