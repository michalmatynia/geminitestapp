import { NextRequest, NextResponse } from "next/server";
import { getProductAiJobs, deleteTerminalProductAiJobs, deleteAllProductAiJobs, cleanupStaleRunningProductAiJobs } from "@/features/jobs/services/productAiService";
import { startProductAiJobQueue, getQueueStatus } from "@/features/jobs/workers/productAiQueue";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function GET_handler(req: NextRequest) {
  try {
    const staleResult = await cleanupStaleRunningProductAiJobs(1000 * 60 * 10);
    if (staleResult.count > 0) {
      console.log(`[api/products/ai-jobs] Marked ${staleResult.count} stale running jobs as failed`);
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
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.GET",
      fallbackMessage: "Failed to fetch jobs",
    });
  }
}

async function DELETE_handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "terminal") {
      const result = await deleteTerminalProductAiJobs();
      return NextResponse.json({ success: true, count: result.count });
    }
    if (scope === "all") {
      const result = await deleteAllProductAiJobs();
      return NextResponse.json({ success: true, count: result.count });
    }

    throw badRequestError("Invalid scope");
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.DELETE",
      fallbackMessage: "Failed to delete jobs",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.ai-jobs.GET" });
export const DELETE = apiHandler(DELETE_handler, { source: "products.ai-jobs.DELETE" });
