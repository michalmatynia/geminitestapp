export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from "@/features/jobs/server";
import type { ProductAiJobType } from "@/shared/types/jobs";

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const job = await enqueueProductAiJob(
      "system",
      "base_images_sync_all" as ProductAiJobType,
      { source: "base_images_sync_all" }
    );

    const inlineJobs =
      process.env.AI_JOBS_INLINE === "true" ||
      process.env.NODE_ENV !== "production";

    if (inlineJobs) {
      processSingleJob(job.id).catch((error: unknown) => {
        console.error("[integrations.images.sync-base.all] Failed to run base image sync job", error);
      });
    } else {
      startProductAiJobQueue();
    }

    return NextResponse.json({ status: "ok", jobId: job.id });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.images.sync-base.all.POST",
      fallbackMessage: "Failed to enqueue Base.com image sync job",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: "integrations.images.sync-base.all.POST" }
);
