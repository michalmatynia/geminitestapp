import { NextRequest, NextResponse } from "next/server";
import { enqueueProductAiJob } from "@/lib/services/productAiService";
import { startProductAiJobQueue, processSingleJob } from "@/lib/services/productAiQueue";

export async function POST(req: NextRequest) {
  try {
    const { productId, type, payload } = await req.json();

    console.log(`[api/products/ai-jobs/enqueue] Received request - productId: ${productId}, type: ${type}`);

    if (!productId || !type) {
      return NextResponse.json({ error: "productId and type are required" }, { status: 400 });
    }

    const job = await enqueueProductAiJob(productId, type, payload);
    console.log(`[api/products/ai-jobs/enqueue] Job ${job.id} created`);

    // Start the queue worker (for persistent servers)
    startProductAiJobQueue();

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

    console.log(`[api/products/ai-jobs/enqueue] Returning response to client`);
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("[api/products/ai-jobs/enqueue] POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to enqueue job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
