import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { startChatbotJobQueue } from "@/lib/chatbot/jobs/queue";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function GET() {
  try {
    if (!("chatbotJob" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot jobs not initialized. Run prisma generate/db push." },
        { status: 500 }
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
    const errorId = randomUUID();
    console.error("[chatbot][jobs][GET] Failed to list jobs", { errorId, error });
    return NextResponse.json(
      { error: "Failed to list jobs.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!("chatbotJob" in prisma) || !("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot jobs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const body = (await req.json()) as {
      sessionId?: string;
      model?: string;
      messages?: ChatMessage[];
      userMessage?: string;
    };

    if (!body.sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }
    if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Model and messages are required." },
        { status: 400 }
      );
    }

    const session = await prisma.chatbotSession.findUnique({
      where: { id: body.sessionId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const trimmedUserMessage = body.userMessage?.trim();
    if (trimmedUserMessage) {
      const latest = await prisma.chatbotMessage.findFirst({
        where: { sessionId: body.sessionId },
        orderBy: { createdAt: "desc" },
        select: { role: true, content: true },
      });
      if (!latest || latest.role !== "user" || latest.content !== trimmedUserMessage) {
        await prisma.chatbotMessage.create({
          data: {
            sessionId: body.sessionId,
            role: "user",
            content: trimmedUserMessage,
          },
        });
        await prisma.chatbotSession.update({
          where: { id: body.sessionId },
          data: { updatedAt: new Date() },
        });
      }
    }

    const job = await prisma.chatbotJob.create({
      data: {
        sessionId: body.sessionId,
        model: body.model,
        payload: {
          model: body.model,
          messages: body.messages,
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
    const errorId = randomUUID();
    console.error("[chatbot][jobs][POST] Failed to enqueue job", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to enqueue job.", errorId },
      { status: 500 }
    );
  }
}
