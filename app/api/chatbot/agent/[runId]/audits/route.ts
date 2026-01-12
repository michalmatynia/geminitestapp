import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("agentAuditLog" in prisma)) {
      return NextResponse.json(
        { error: "Agent steps not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const audits = await prisma.agentAuditLog.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][audits] Loaded", {
        runId,
        count: audits.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ audits });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][audits] Failed to load", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent steps.", errorId },
      { status: 500 }
    );
  }
}
