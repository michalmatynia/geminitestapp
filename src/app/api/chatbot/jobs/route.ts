export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatbotJobRepository } from "@/features/ai/chatbot/services/chatbot-job-repository";
import { chatbotSessionRepository } from "@/features/ai/chatbot/services/chatbot-session-repository";
import { startChatbotJobQueue } from "@/features/jobs/server";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
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

async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const jobs: ChatbotJob[] = await chatbotJobRepository.findAll(50);

  if (DEBUG_CHATBOT) {
    console.info("[chatbot][jobs][GET] Listed", { 
      count: jobs.length,
      requestId: ctx.requestId 
    });
  }

  return NextResponse.json({ jobs });
}

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const result: JsonParseResult<EnqueueJobRequest> = await parseJsonBody<EnqueueJobRequest>(req, enqueueJobSchema, {
    logPrefix: "chatbot.jobs.POST",
  });
  
  if (!result.ok) {
    return result.response;
  }

  const data: EnqueueJobRequest = result.data;
  const session = await chatbotSessionRepository.findById(data.sessionId);

  if (!session) {
    throw notFoundError("Session not found.");
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
        timestamp: new Date().toISOString(),
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
}

async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const scope = req.nextUrl.searchParams.get("scope") ?? "terminal";

  const terminalStatuses: ChatbotJobStatus[] = ["completed", "failed", "canceled"];

  if (scope !== "terminal") {
    throw badRequestError("Unsupported delete scope.");
  }

  const deletedCount: number = await chatbotJobRepository.deleteMany(terminalStatuses);

  if (DEBUG_CHATBOT) {
    console.info("[chatbot][jobs][DELETE] Deleted", { 
      count: deletedCount,
      requestId: ctx.requestId 
    });
  }

  return NextResponse.json({ deleted: deletedCount });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "chatbot.jobs.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "chatbot.jobs.POST" });
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
 { source: "chatbot.jobs.DELETE" });
