import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { internalError } from "@/lib/errors/app-error";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("agentBrowserLog" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent logs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.logs.GET" }
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
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.logs.GET",
      fallbackMessage: "Failed to load agent logs.",
    });
  }
}
