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
    if (!("agentAuditLog" in prisma)) {
      return NextResponse.json(
        { error: "Agent steps not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const url = new URL(req.url);
    const stepId = url.searchParams.get("stepId");
    const limit = Number(url.searchParams.get("limit") ?? "200");
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 500) : 200;
    const audits = await prisma.agentAuditLog.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take,
    });
    const filtered = stepId
      ? audits.filter((audit) => {
          const metadata = audit.metadata as
            | {
                stepId?: string;
                failedStepId?: string;
                activeStepId?: string;
                steps?: Array<{ id?: string }>;
              }
            | null;
          if (
            metadata?.stepId === stepId ||
            metadata?.failedStepId === stepId ||
            metadata?.activeStepId === stepId
          ) {
            return true;
          }
          if (Array.isArray(metadata?.steps)) {
            return metadata?.steps.some((step) => step?.id === stepId);
          }
          return false;
        })
      : audits;
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][audits] Loaded", {
        runId,
        count: filtered.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ audits: filtered });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][audits] Failed to load", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent steps.", errorId },
      { status: 500 }
    );
  }
}
