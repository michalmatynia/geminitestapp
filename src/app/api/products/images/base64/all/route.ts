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
      "base64_all" as ProductAiJobType,
      { source: "base64_all" }
    );

    const inlineJobs =
      process.env.AI_JOBS_INLINE === "true" ||
      process.env.NODE_ENV !== "production";

    if (inlineJobs) {
      processSingleJob(job.id).catch((error: unknown) => {
        console.error("[products.images.base64.all] Failed to run base64 job", error);
      });
    } else {
      startProductAiJobQueue();
    }

    return NextResponse.json({
      status: "ok",
      jobId: job.id,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.images.base64.all.POST",
      fallbackMessage: "Failed to convert images to base64",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: "products.images.base64.all.POST" }
);
