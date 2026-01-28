import { NextResponse } from "next/server";
import { chatbotSessionRepository } from "@/features/chatbot/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

// GET /api/chatbot/sessions/[sessionId] - Get session by ID
async function GET_handler(
  req: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    const params = await props.params;
    const session = await chatbotSessionRepository.findById(params.sessionId);

    if (!session) {
      return createErrorResponse(notFoundError("Session not found."), {
        request: req,
        source: "chatbot.sessions.[sessionId].GET",
      });
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET:sessionId] Found", {
        sessionId: session.id,
        messageCount: session.messages.length,
      });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[chatbot][sessions][GET:sessionId] Failed", error);
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.[sessionId].GET",
      fallbackMessage: "Failed to fetch session.",
    });
  }
}

export const GET = apiHandlerWithParams<{ sessionId: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.sessions.[sessionId].GET" });
