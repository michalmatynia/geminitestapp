import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductAiJob, cancelProductAiJob, deleteProductAiJob } from "@/features/jobs/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const actionSchema = z.object({
  action: z.string().trim().min(1),
});

async function GET_handler(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
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
      source: "products.ai-jobs.[jobId].GET",
      fallbackMessage: "Failed to fetch job",
    });
  }
}

async function POST_handler(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
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
      source: "products.ai-jobs.[jobId].POST",
      fallbackMessage: "Failed to update job",
    });
  }
}

async function DELETE_handler(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
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
      source: "products.ai-jobs.[jobId].DELETE",
      fallbackMessage: "Failed to delete job",
    });
  }
}

export const GET = apiHandlerWithParams<{ jobId: string }>(async (req: NextRequest, _ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => GET_handler(req, { params: Promise.resolve(params) }), { source: "products.ai-jobs.[jobId].GET" });
export const POST = apiHandlerWithParams<{ jobId: string }>(async (req: NextRequest, _ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => POST_handler(req, { params: Promise.resolve(params) }), { source: "products.ai-jobs.[jobId].POST" });
export const DELETE = apiHandlerWithParams<{ jobId: string }>(async (req: NextRequest, _ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "products.ai-jobs.[jobId].DELETE" });
