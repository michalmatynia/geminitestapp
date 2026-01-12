import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("agentBrowserLog" in prisma)) {
      return NextResponse.json(
        { error: "Agent logs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const { searchParams } = new URL(req.url);
    const stepId = searchParams.get("stepId");
    const logs = await prisma.agentBrowserLog.findMany({
      where: stepId ? { runId, stepId } : { runId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][logs] Loaded", {
        runId,
        stepId,
        count: logs.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ logs });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][logs] Failed to load", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent logs.", errorId },
      { status: 500 }
    );
  }
}
