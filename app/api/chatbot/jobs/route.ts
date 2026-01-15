import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { startChatbotJobQueue } from "@/lib/chatbot/jobs/queue";
import { ChatbotJobStatus } from "@prisma/client";
import { parseJsonBody } from "@/lib/api/parse-json";

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
    console.error("[chatbot][jobs][GET] Failed to list jobs", {
      errorId,
      error,
    });
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

    const parsed = await parseJsonBody(req, enqueueJobSchema, {
      logPrefix: "chatbot-jobs",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const session = await prisma.chatbotSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
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

export async function DELETE(req: Request) {
  try {
    if (!("chatbotJob" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot jobs not initialized. Run prisma generate/db push." },
        { status: 500 }
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
      return NextResponse.json(
        { error: "Unsupported delete scope." },
        { status: 400 }
      );
    }

    const result = await prisma.chatbotJob.deleteMany({
      where: { status: { in: terminalStatuses } },
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][DELETE] Deleted", { count: result.count });
    }

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][jobs][DELETE] Failed to delete jobs", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete jobs.", errorId },
      { status: 500 }
    );
  }
}
