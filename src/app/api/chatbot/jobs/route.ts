import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatbotJobRepository } from "@/features/chatbot/services/chatbot-job-repository";
import { chatbotSessionRepository } from "@/features/chatbot/services/chatbot-session-repository";
import { startChatbotJobQueue } from "@/features/jobs/server";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler, type ApiHandlerContext } from "@/shared/lib/api/api-handler";
import type { JsonParseResult } from "@/shared/types/api";
import type { ChatMessage, ChatbotJobStatus, ChatbotJob } from "@/shared/types/chatbot";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

interface EnqueueJobRequest {
  sessionId: string;
  model: string;
  messages: ChatMessage[];
  userMessage?: string;
}

const enqueueJobSchema = z.object({
  sessionId: z.string().trim().min(1),
  model: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  userMessage: z.string().trim().optional(),
}) as z.ZodSchema<EnqueueJobRequest>;

async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<NextResponse> {
  try {
    const jobs: ChatbotJob[] = await chatbotJobRepository.findAll(50);

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][GET] Listed", { 
        count: jobs.length,
        requestId: ctx.requestId 
      });
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.GET",
      fallbackMessage: "Failed to list jobs.",
      requestId: ctx.requestId,
    });
  }
}

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<NextResponse> {
  try {
    const result: JsonParseResult<EnqueueJobRequest> = await parseJsonBody<EnqueueJobRequest>(req, enqueueJobSchema, {
      logPrefix: "chatbot.jobs.POST",
    });
    
    if (!result.ok) {
      return result.response;
    }

    const data: EnqueueJobRequest = result.data;
    const session = await chatbotSessionRepository.findById(data.sessionId);

    if (!session) {
      return createErrorResponse(notFoundError("Session not found."), {
        request: req,
        source: "chatbot.jobs.POST",
        requestId: ctx.requestId,
      });
    }

    const trimmedUserMessage: string | undefined = data.userMessage?.trim();
    if (trimmedUserMessage) {
      const latest = session.messages[session.messages.length - 1];

      if (
        !latest ||
        latest.role !== "user" ||
        latest.content !== trimmedUserMessage
      ) {
        await chatbotSessionRepository.addMessage(session.id, {
          role: "user",
          content: trimmedUserMessage,
          timestamp: new Date(),
        });
      }
    }

    const job: ChatbotJob = await chatbotJobRepository.create({
      sessionId: session.id,
      model: data.model,
      payload: {
        model: data.model,
        messages: data.messages,
      },
    });

    startChatbotJobQueue();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][POST] Queued", {
        jobId: job.id,
        sessionId: job.sessionId,
        requestId: ctx.requestId,
      });
    }

    const responsePayload = { jobId: job.id, status: job.status };
    return NextResponse.json(responsePayload);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.POST",
      fallbackMessage: "Failed to enqueue job.",
      requestId: ctx.requestId,
    });
  }
}

async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<NextResponse> {
  try {
    const scope = req.nextUrl.searchParams.get("scope") ?? "terminal";

    const terminalStatuses: ChatbotJobStatus[] = ["completed", "failed", "canceled"];

    if (scope !== "terminal") {
      return createErrorResponse(badRequestError("Unsupported delete scope."), {
        request: req,
        source: "chatbot.jobs.DELETE",
        requestId: ctx.requestId,
      });
    }

    const deletedCount: number = await chatbotJobRepository.deleteMany(terminalStatuses);

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][DELETE] Deleted", { 
        count: deletedCount,
        requestId: ctx.requestId 
      });
    }

    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.jobs.DELETE",
      fallbackMessage: "Failed to delete jobs.",
      requestId: ctx.requestId,
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "chatbot.jobs.GET" });
export const POST = apiHandler(POST_handler, { source: "chatbot.jobs.POST" });
export const DELETE = apiHandler(DELETE_handler, { source: "chatbot.jobs.DELETE" });