import { NextRequest, NextResponse } from "next/server";
import { enqueueProductAiJob } from "@/lib/services/productAiService";
import { startProductAiJobQueue } from "@/lib/services/productAiQueue";

export async function POST(req: NextRequest) {
  try {
    const { productId, type, payload } = await req.json();

    if (!productId || !type) {
      return NextResponse.json({ error: "productId and type are required" }, { status: 400 });
    }

    const job = await enqueueProductAiJob(productId, type, payload);
    startProductAiJobQueue();

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("[api/products/ai-jobs/enqueue] POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to enqueue job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
