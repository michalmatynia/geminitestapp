export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProductAiJobs, deleteTerminalProductAiJobs, deleteAllProductAiJobs, cleanupStaleRunningProductAiJobs } from "@/features/jobs/server";
import { startProductAiJobQueue, getQueueStatus } from "@/features/jobs/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const staleCount = await cleanupStaleRunningProductAiJobs(1000 * 60 * 10);
    if (staleCount > 0) {
      console.log(`[api/products/ai-jobs] Marked ${staleCount} stale running jobs as failed`);
    }
    startProductAiJobQueue();
    const { searchParams } = new URL(req.url);

    // Check if requesting queue status
    const checkStatus = searchParams.get("status");
    if (checkStatus === "true") {
      const status = getQueueStatus();
      console.log("[api/products/ai-jobs] Queue status:", status);
      return NextResponse.json({ status });
    }

    const productId = searchParams.get("productId") || undefined;
    const jobs = await getProductAiJobs(productId);
    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.GET",
      fallbackMessage: "Failed to fetch jobs",
    });
  }
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
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
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.DELETE",
      fallbackMessage: "Failed to delete jobs",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.ai-jobs.GET" });
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
 { source: "products.ai-jobs.DELETE" });
