export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from "@/features/jobs/server";
import type { ProductAiJobType } from "@/shared/types/jobs";

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const job = await enqueueProductAiJob(
    "system",
    "base64_all" as ProductAiJobType,
    { source: "base64_all" }
  );

  const inlineJobs =
    process.env.AI_JOBS_INLINE === "true" ||
    process.env.NODE_ENV !== "production";

  if (inlineJobs) {
    processSingleJob(job.id).catch(async (error: unknown) => {
      try {
        const { logSystemError } = await import("@/features/observability/server");
        await logSystemError({ 
          message: "[products.images.base64.all] Failed to run base64 job",
          error,
          source: "api/products/images/base64/all",
          context: { jobId: job.id }
        });
      } catch (logError) {
        console.error("[products.images.base64.all] Failed to run base64 job (and logging failed)", error, logError);
      }
    });
  } else {
    startProductAiJobQueue();
  }

  return NextResponse.json({
    status: "ok",
    jobId: job.id,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: "products.images.base64.all.POST" }
);
