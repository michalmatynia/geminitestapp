import { NextRequest, NextResponse } from "next/server";
import { getProductAiJob, cancelProductAiJob, deleteProductAiJob } from "@/lib/services/productAiService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getProductAiJob(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    console.error(`[api/products/ai-jobs/[jobId]] GET error:`, error);
    const message = error instanceof Error ? error.message : "Failed to fetch job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { action } = await req.json();
    if (action === "cancel") {
      const job = await cancelProductAiJob(jobId);
      return NextResponse.json({ success: true, job });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    await deleteProductAiJob(jobId);
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
