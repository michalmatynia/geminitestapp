import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("agentBrowserSnapshot" in prisma)) {
      return NextResponse.json(
        { error: "Agent snapshots not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { snapshotId } = await params;
    const snapshot = await prisma.agentBrowserSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][snapshot] Loaded", {
        snapshotId,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ snapshot });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][snapshot] Failed to load", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent snapshot.", errorId },
      { status: 500 }
    );
  }
}
