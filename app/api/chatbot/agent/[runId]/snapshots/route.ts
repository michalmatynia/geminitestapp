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
    if (!("agentBrowserSnapshot" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent snapshots not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.snapshots.GET" }
      );
    }
    const { runId } = await params;
    const url = new URL(req.url);
    const stepId = url.searchParams.get("stepId");
    const limit = Number(url.searchParams.get("limit") ?? "12");
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 12;
    const snapshots = await prisma.agentBrowserSnapshot.findMany({
      where: { runId, ...(stepId ? { stepId } : {}) },
      orderBy: { createdAt: "desc" },
      take,
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][snapshots] Loaded", {
        runId,
        count: snapshots.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ snapshots });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.snapshots.GET",
      fallbackMessage: "Failed to load agent snapshots.",
    });
  }
}
