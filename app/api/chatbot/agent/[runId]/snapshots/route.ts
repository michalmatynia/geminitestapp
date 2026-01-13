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
    if (!("agentBrowserSnapshot" in prisma)) {
      return NextResponse.json(
        { error: "Agent snapshots not initialized. Run prisma generate/db push." },
        { status: 500 }
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
    const errorId = randomUUID();
    console.error("[chatbot][agent][snapshots] Failed to load", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent snapshots.", errorId },
      { status: 500 }
    );
  }
}
