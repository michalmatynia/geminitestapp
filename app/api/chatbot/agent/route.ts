import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { startAgentQueue } from "@/lib/agent/queue";
import { logAgentAudit } from "@/lib/agent/audit";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET() {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const runs = await prisma.chatbotAgentRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        prompt: true,
        model: true,
        tools: true,
        searchProvider: true,
        agentBrowser: true,
        runHeadless: true,
        status: true,
        requiresHumanIntervention: true,
        errorMessage: true,
        logLines: true,
        recordingPath: true,
        activeStepId: true,
        checkpointedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { browserSnapshots: true, browserLogs: true },
        },
      },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][GET] Runs loaded", {
        count: runs.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ runs });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][GET] Failed to fetch runs", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch agent runs.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const body = (await req.json()) as {
      prompt?: string;
      model?: string;
      tools?: string[];
      searchProvider?: string;
      agentBrowser?: string;
      runHeadless?: boolean;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Request", {
        promptLength: body.prompt.trim().length,
        model: body.model?.trim() || null,
        tools: body.tools ?? [],
        searchProvider: body.searchProvider?.trim() || null,
        agentBrowser: body.agentBrowser?.trim() || null,
        runHeadless: body.runHeadless ?? true,
      });
    }

    const run = await prisma.chatbotAgentRun.create({
      data: {
        prompt: body.prompt.trim(),
        model: body.model?.trim() || null,
        tools: body.tools ?? [],
        searchProvider: body.searchProvider?.trim() || null,
        agentBrowser: body.agentBrowser?.trim() || null,
        runHeadless: body.runHeadless ?? true,
        logLines: [`[${new Date().toISOString()}] Run queued.`],
      },
    });
    await logAgentAudit(run.id, "info", "Agent run queued.", {
      model: run.model,
      tools: run.tools,
      searchProvider: run.searchProvider,
      agentBrowser: run.agentBrowser,
    });

    startAgentQueue();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Queued", {
        runId: run.id,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ runId: run.id, status: run.status });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][POST] Failed to enqueue run", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to enqueue agent run.", errorId },
      { status: 500 }
    );
  }
}
