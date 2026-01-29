import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, internalError, notFoundError } from "@/shared/errors/app-error";
import {  apiHandlerWithParams , type ApiHandlerContext } from "@/shared/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const messageSchema = z.object({
  role: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!("chatbotMessage" in prisma) || !("chatbotSession" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chat sessions not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.sessions.[sessionId].messages.GET" }
      );
    }
    const { sessionId } = params;
    const session = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return createErrorResponse(notFoundError("Session not found."), {
        request: req,
        source: "chatbot.sessions.[sessionId].messages.GET",
      });
    }
    const messages = await prisma.chatbotMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET] Messages loaded", {
        sessionId,
        count: messages.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ messages });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.[sessionId].messages.GET",
      fallbackMessage: "Failed to fetch messages.",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!("chatbotMessage" in prisma) || !("chatbotSession" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chat sessions not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.sessions.[sessionId].messages.POST" }
      );
    }
    const { sessionId } = params;
    const session = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return createErrorResponse(notFoundError("Session not found."), {
        request: req,
        source: "chatbot.sessions.[sessionId].messages.POST",
      });
    }
    const parsed = await parseJsonBody(req, messageSchema, {
      logPrefix: "chatbot.sessions.messages.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.data;
    if (!body.role || !body.content?.trim()) {
      return createErrorResponse(
        badRequestError("Role and content are required."),
        { request: req, source: "chatbot.sessions.[sessionId].messages.POST" }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Request", {
        sessionId,
        role: body.role,
        contentLength: body.content.trim().length,
      });
    }
    const message = await prisma.chatbotMessage.create({
      data: {
        sessionId,
        role: body.role,
        content: body.content.trim(),
      },
    });
    await prisma.chatbotSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Created", {
        messageId: message.id,
        sessionId,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ message });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.sessions.[sessionId].messages.POST",
      fallbackMessage: "Failed to add message.",
    });
  }
}

export const GET = apiHandlerWithParams<{ sessionId: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> =>
    GET_handler(req, { params: Promise.resolve(params) }),
  { source: "chatbot.sessions.[sessionId].messages.GET" }
);
export const POST = apiHandlerWithParams<{ sessionId: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> =>
    POST_handler(req, { params: Promise.resolve(params) }),
  { source: "chatbot.sessions.[sessionId].messages.POST" }
);
