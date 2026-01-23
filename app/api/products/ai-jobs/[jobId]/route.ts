import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductAiJob, cancelProductAiJob, deleteProductAiJob } from "@/lib/services/productAiService";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

const actionSchema = z.object({
  action: z.string().trim().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      throw badRequestError("Job id is required");
    }
    const job = await getProductAiJob(jobId);
    if (!job) {
      throw notFoundError("Job not found", { jobId });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.job.GET",
      fallbackMessage: "Failed to fetch job",
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      throw badRequestError("Job id is required");
    }
    const parsed = await parseJsonBody(req, actionSchema, {
      logPrefix: "products.ai-jobs.job.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { action } = parsed.data;
    if (action === "cancel") {
      const job = await cancelProductAiJob(jobId);
      return NextResponse.json({ success: true, job });
    }
    throw badRequestError("Invalid action");
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.job.POST",
      fallbackMessage: "Failed to update job",
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      throw badRequestError("Job id is required");
    }
    await deleteProductAiJob(jobId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.job.DELETE",
      fallbackMessage: "Failed to delete job",
    });
  }
}
