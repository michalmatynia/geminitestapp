import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { startChatbotJobQueue } from "@/features/jobs/server";
import { ChatbotJobStatus } from "@prisma/client";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, internalError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const enqueueJobSchema = z.object({
  sessionId: z.string().trim().min(1),
  model: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  userMessage: z.string().trim().optional(),
});

async function GET_handler(req: Request) {
  try {
    if (!("chatbotJob" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.GET" }
      );
    }

    const jobs = await prisma.chatbotJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][GET] Listed", { count: jobs.length });
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.GET",
      fallbackMessage: "Failed to list jobs.",
    });
  }
}

async function POST_handler(req: Request) {
  try {
    if (!("chatbotJob" in prisma) || !("chatbotSession" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.POST" }
      );
    }

    const parsed = await parseJsonBody(req, enqueueJobSchema, {
      logPrefix: "chatbot.jobs.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const session = await prisma.chatbotSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true },
    });

    if (!session) {
      return createErrorResponse(notFoundError("Session not found."), {
        request: req,
        source: "chatbot.jobs.POST",
      });
    }

    const trimmedUserMessage = parsed.data.userMessage?.trim();
    if (trimmedUserMessage) {
      const latest = await prisma.chatbotMessage.findFirst({
        where: { sessionId: parsed.data.sessionId },
        orderBy: { createdAt: "desc" },
        select: { role: true, content: true },
      });

      if (
        !latest ||
        latest.role !== "user" ||
        latest.content !== trimmedUserMessage
      ) {
        await prisma.chatbotMessage.create({
          data: {
            sessionId: parsed.data.sessionId,
            role: "user",
            content: trimmedUserMessage,
          },
        });

        await prisma.chatbotSession.update({
          where: { id: parsed.data.sessionId },
          data: { updatedAt: new Date() },
        });
      }
    }

    const job = await prisma.chatbotJob.create({
      data: {
        sessionId: parsed.data.sessionId,
        model: parsed.data.model,
        payload: {
          model: parsed.data.model,
          messages: parsed.data.messages as ChatMessage[],
        },
      },
    });

    startChatbotJobQueue();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][POST] Queued", {
        jobId: job.id,
        sessionId: job.sessionId,
      });
    }

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.POST",
      fallbackMessage: "Failed to enqueue job.",
    });
  }
}

async function DELETE_handler(req: Request) {
  try {
    if (!("chatbotJob" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot jobs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.jobs.DELETE" }
      );
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "terminal";

    // IMPORTANT: Use Prisma enum values (typed, mutable array) — no "as const"
    const terminalStatuses: ChatbotJobStatus[] = [
      ChatbotJobStatus.completed,
      ChatbotJobStatus.failed,
      ChatbotJobStatus.canceled,
    ];

    if (scope !== "terminal") {
      return createErrorResponse(badRequestError("Unsupported delete scope."), {
        request: req,
        source: "chatbot.jobs.DELETE",
      });
    }

    const result = await prisma.chatbotJob.deleteMany({
      where: { status: { in: terminalStatuses } },
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][DELETE] Deleted", { count: result.count });
    }

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.DELETE",
      fallbackMessage: "Failed to delete jobs.",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "chatbot.jobs.GET" });
export const POST = apiHandler(POST_handler, { source: "chatbot.jobs.POST" });
export const DELETE = apiHandler(DELETE_handler, { source: "chatbot.jobs.DELETE" });
