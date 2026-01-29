import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatbotJobRepository } from "@/features/chatbot/services/chatbot-job-repository";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import {
  badRequestError,
  conflictError,
  notFoundError,
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const jobActionSchema = z.object({
  action: z.string().trim().optional(),
});

async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  try {
    const { jobId } = params;
    const job = await chatbotJobRepository.findById(jobId);
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].GET",
        requestId: ctx.requestId,
      });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].GET",
      fallbackMessage: "Failed to load job.",
      requestId: ctx.requestId,
    });
  }
}

async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  try {
    const { jobId } = params;
    const result = await parseJsonBody(req, jobActionSchema, {
      logPrefix: "chatbot.jobs.POST",
    });
    if (!result.ok) {
      return result.response;
    }
    
    const { data } = result;
    if (data.action !== "cancel") {
      return createErrorResponse(badRequestError("Unsupported action."), {
        request: req,
        source: "chatbot.jobs.[jobId].POST",
        requestId: ctx.requestId,
      });
    }
    const job = await chatbotJobRepository.findById(jobId);
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].POST",
        requestId: ctx.requestId,
      });
    }
    if (["completed", "failed", "canceled"].includes(job.status)) {
      return NextResponse.json({ status: job.status });
    }
    const updated = await chatbotJobRepository.update(jobId, {
      status: "canceled",
      finishedAt: new Date(),
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][POST] Canceled", { 
        jobId,
        requestId: ctx.requestId 
      });
    }
    return NextResponse.json({ status: updated?.status });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].POST",
      fallbackMessage: "Failed to cancel job.",
      requestId: ctx.requestId,
    });
  }
}

async function DELETE_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  try {
    const { jobId } = params;
    const job = await chatbotJobRepository.findById(jobId);
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].DELETE",
        requestId: ctx.requestId,
      });
    }
    const force = req.nextUrl.searchParams.get("force") === "true";
    if (job.status === "running" && !force) {
      return createErrorResponse(
        conflictError("Job is running. Cancel it before deleting."),
        { 
          request: req, 
          source: "chatbot.jobs.[jobId].DELETE",
          requestId: ctx.requestId,
        }
      );
    }
    if (job.status === "running" && force) {
      await chatbotJobRepository.update(jobId, {
        status: "failed",
        finishedAt: new Date(),
      });
    }
    await chatbotJobRepository.delete(jobId);
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][DELETE] Deleted", { 
        jobId,
        requestId: ctx.requestId 
      });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].DELETE",
      fallbackMessage: "Failed to delete job.",
      requestId: ctx.requestId,
    });
  }
}

export const GET = apiHandlerWithParams<{ jobId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => GET_handler(req, { params: Promise.resolve(params) }),
 { source: "chatbot.jobs.[jobId].GET" });
export const POST = apiHandlerWithParams<{ jobId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => POST_handler(req, { params: Promise.resolve(params) }),
 { source: "chatbot.jobs.[jobId].POST" });
export const DELETE = apiHandlerWithParams<{ jobId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { jobId: string }): Promise<Response> => DELETE_handler(req, { params: Promise.resolve(params) }),
 { source: "chatbot.jobs.[jobId].DELETE" });