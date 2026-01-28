import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import {
  badRequestError,
  conflictError,
  internalError,
  notFoundError,
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const jobActionSchema = z.object({
  action: z.string().trim().optional(),
});

async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!("chatbotJob" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.[jobId].GET" }
      );
    }
    const { jobId } = await params;
    const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].GET",
      });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].GET",
      fallbackMessage: "Failed to load job.",
    });
  }
}

async function POST_handler(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!("chatbotJob" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.[jobId].POST" }
      );
    }
    const { jobId } = await params;
    const parsed = await parseJsonBody(req, jobActionSchema, {
      logPrefix: "chatbot.jobs.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    if (parsed.data.action !== "cancel") {
      return createErrorResponse(badRequestError("Unsupported action."), {
        request: req,
        source: "chatbot.jobs.[jobId].POST",
      });
    }
    const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].POST",
      });
    }
    if (["completed", "failed", "canceled"].includes(job.status)) {
      return NextResponse.json({ status: job.status });
    }
    const updated = await prisma.chatbotJob.update({
      where: { id: jobId },
      data: { status: "canceled", finishedAt: new Date() },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][POST] Canceled", { jobId });
    }
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].POST",
      fallbackMessage: "Failed to cancel job.",
    });
  }
}

async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!("chatbotJob" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.[jobId].DELETE" }
      );
    }
    const { jobId } = await params;
    const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return createErrorResponse(notFoundError("Job not found."), {
        request: req,
        source: "chatbot.jobs.[jobId].DELETE",
      });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    if (job.status === "running" && !force) {
      return createErrorResponse(
        conflictError("Job is running. Cancel it before deleting."),
        { request: req, source: "chatbot.jobs.[jobId].DELETE" }
      );
    }
    if (job.status === "running" && force) {
      await prisma.chatbotJob.update({
        where: { id: jobId },
        data: { status: "failed", finishedAt: new Date() },
      });
    }
    await prisma.chatbotJob.delete({ where: { id: jobId } });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][DELETE] Deleted", { jobId });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.[jobId].DELETE",
      fallbackMessage: "Failed to delete job.",
    });
  }
}

export const GET = apiHandlerWithParams<{ jobId: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.jobs.[jobId].GET" });
export const POST = apiHandlerWithParams<{ jobId: string }>(async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.jobs.[jobId].POST" });
export const DELETE = apiHandlerWithParams<{ jobId: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.jobs.[jobId].DELETE" });
