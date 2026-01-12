import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotMessage" in prisma) || !("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { sessionId } = await params;
    const session = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
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
    const errorId = randomUUID();
    console.error("[chatbot][sessions][GET] Failed to fetch messages", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch messages.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotMessage" in prisma) || !("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { sessionId } = await params;
    const session = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    const body = (await req.json()) as { role?: string; content?: string };
    if (!body.role || !body.content?.trim()) {
      return NextResponse.json(
        { error: "Role and content are required." },
        { status: 400 }
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
    const errorId = randomUUID();
    console.error("[chatbot][sessions][POST] Failed to add message", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to add message.", errorId },
      { status: 500 }
    );
  }
}
