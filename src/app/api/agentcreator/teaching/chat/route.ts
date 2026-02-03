export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import type { ChatMessage } from "@/shared/types/chatbot";
import { runTeachingChat } from "@/features/ai/agentcreator/teaching/server/chat";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const chatSchema = z.object({
  agentId: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, chatSchema, {
      logPrefix: "agentcreator.teaching.chat.POST",
    });
    if (!parsed.ok) return parsed.response;

    const { agentId, messages } = parsed.data;
    const result = await runTeachingChat({
      agentId,
      messages: messages as ChatMessage[],
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes("not found") ? 404 : msg.includes("Missing") ? 400 : 500;
    if (status === 400) {
      return NextResponse.json({ error: msg }, { status });
    }
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.chat.POST",
      fallbackMessage: "Failed to run teaching chat.",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "agentcreator.teaching.chat.POST" }
);
