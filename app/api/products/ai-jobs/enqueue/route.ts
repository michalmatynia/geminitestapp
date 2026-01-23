import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueueProductAiJob, type ProductAiJobType } from "@/lib/services/productAiService";
import { startProductAiJobQueue, processSingleJob } from "@/lib/services/productAiQueue";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const enqueueSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  payload: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, enqueueSchema, {
      logPrefix: "products.ai-jobs.enqueue.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { productId, type, payload } = parsed.data;

    console.log(`[api/products/ai-jobs/enqueue] Received request - productId: ${productId}, type: ${type}`);

    const job = await enqueueProductAiJob(productId, type as ProductAiJobType, payload);
    console.log(`[api/products/ai-jobs/enqueue] Job ${job.id} created`);

    const inlineJobs =
      process.env.AI_JOBS_INLINE === "true" ||
      process.env.NODE_ENV !== "production";

    if (inlineJobs) {
      // WORKAROUND: In serverless/development, immediately process this job
      // since setInterval doesn't persist across function invocations
      console.log(`[api/products/ai-jobs/enqueue] About to call processSingleJob for job ${job.id}`);

      // Process the job asynchronously but log any errors
      processSingleJob(job.id)
        .then(() => {
          console.log(`[api/products/ai-jobs/enqueue] Job ${job.id} processing initiated successfully`);
        })
        .catch(err => {
          console.error(`[api/products/ai-jobs/enqueue] Failed to process job ${job.id}:`, err);
          console.error(`[api/products/ai-jobs/enqueue] Error stack:`, err.stack);
        });
    } else {
      // Start the queue worker (for persistent servers)
      startProductAiJobQueue();
    }

    console.log(`[api/products/ai-jobs/enqueue] Returning response to client`);
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.enqueue.POST",
      fallbackMessage: "Failed to enqueue job",
    });
  }
}
