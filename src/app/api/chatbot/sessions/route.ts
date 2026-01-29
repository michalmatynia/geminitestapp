import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatbotSessionRepository } from "@/features/chatbot/server";
import type { ChatSession, UpdateSessionInput } from "@/shared/types/chatbot";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

type CreateSessionBody = {
  title?: string;
  settings?: ChatSession["settings"];
};

type UpdateSessionBody = {
  sessionId: string;
  title?: string;
};

type DeleteSessionBody = {
  sessionId: string;
};

const createSessionSchema = z.object({
  title: z.string().trim().optional(),
  settings: z.record(z.string(), z["unknown"]()).optional(),
});

const updateSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
  title: z.string().trim().optional(),
});

const deleteSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
});

// POST /api/chatbot/sessions - Create new session
async function POST_handler(req: NextRequest): Promise<Response> {
  const requestStart = Date.now();
  try {
    const parsed = await parseJsonBody(req, createSessionSchema, {
      logPrefix: "chatbot.sessions.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { title, settings } = parsed.data as CreateSessionBody;

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Request", {
        titleProvided: Boolean(title?.trim()),
      });
    }

    const session = await chatbotSessionRepository.create({
      title: title?.trim() || `Chat ${new Date().toLocaleString()}`,
      settings,
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Created", {
        sessionId: session.id,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.POST",
      fallbackMessage: "Failed to create session.",
    });
  }
}

// GET /api/chatbot/sessions - List all sessions
async function GET_handler(req: NextRequest): Promise<Response> {
  const requestStart = Date.now();
  try {
    const sessions = await chatbotSessionRepository.findAll();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET] Listed", {
        count: sessions.length,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.GET",
      fallbackMessage: "Failed to list sessions.",
    });
  }
}

// PATCH /api/chatbot/sessions - Update session (title)
async function PATCH_handler(req: NextRequest): Promise<Response> {
  const requestStart = Date.now();
  try {
    const parsed = await parseJsonBody(req, updateSessionSchema, {
      logPrefix: "chatbot.sessions.PATCH",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { sessionId, title } = parsed.data as UpdateSessionBody;

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Request", {
        sessionId,
        titleProvided: Boolean(title?.trim()),
      });
    }

    const updateData: UpdateSessionInput = {};
    if (title?.trim()) {
      updateData.title = title.trim();
    }

    const updated = await chatbotSessionRepository.update(sessionId, updateData);

    if (!updated) {
      return createErrorResponse(notFoundError("Session not found.", { sessionId }), {
        request: req,
        source: "chatbot.sessions.PATCH",
      });
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Updated", {
        sessionId: updated.id,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.PATCH",
      fallbackMessage: "Failed to update session.",
    });
  }
}

// DELETE /api/chatbot/sessions - Delete session
async function DELETE_handler(req: NextRequest): Promise<Response> {
  const requestStart = Date.now();
  try {
    const parsed = await parseJsonBody(req, deleteSessionSchema, {
      logPrefix: "chatbot.sessions.DELETE",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { sessionId } = parsed.data as DeleteSessionBody;

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Request", {
        sessionId,
      });
    }

    const deleted = await chatbotSessionRepository.delete(sessionId);

    if (!deleted) {
      return createErrorResponse(notFoundError("Session not found.", { sessionId }), {
        request: req,
        source: "chatbot.sessions.DELETE",
      });
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Deleted", {
        sessionId,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.DELETE",
      fallbackMessage: "Failed to delete session.",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "chatbot.sessions.POST" });
export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "chatbot.sessions.GET" });
export const PATCH = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
 { source: "chatbot.sessions.PATCH" });
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
 { source: "chatbot.sessions.DELETE" });
