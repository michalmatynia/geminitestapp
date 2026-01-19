import { NextRequest, NextResponse } from "next/server";
import { getProductAiJobs, deleteTerminalProductAiJobs } from "@/lib/services/productAiService";
import { startProductAiJobQueue, getQueueStatus } from "@/lib/services/productAiQueue";

export async function GET(req: NextRequest) {
  try {
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
    console.error("[api/products/ai-jobs] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "terminal") {
      const result = await deleteTerminalProductAiJobs();
      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  } catch (error) {
    console.error("[api/products/ai-jobs] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete jobs" }, { status: 500 });
  }
}
