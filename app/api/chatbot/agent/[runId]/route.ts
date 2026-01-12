import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][GET] Run loaded", {
        runId,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ run });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][GET] Failed to load run", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent run.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const body = (await req.json()) as { action?: string };
    if (body.action !== "stop") {
      return NextResponse.json(
        { error: "Unsupported action." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Request", {
        runId,
        action: body.action,
      });
    }

    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    if (["completed", "failed", "stopped"].includes(run.status)) {
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Already terminal", {
          runId,
          status: run.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: run.status });
    }

    const updated = await prisma.chatbotAgentRun.update({
      where: { id: runId },
      data: {
        status: "stopped",
        finishedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Run stopped by user.`,
        },
      },
    });
    await logAgentAudit(updated.id, "warning", "Agent run stopped by user.");

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Stopped", {
        runId,
        status: updated.status,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][POST] Failed to stop run", { errorId, error });
    return NextResponse.json(
      { error: "Failed to stop agent run.", errorId },
      { status: 500 }
    );
  }
}
