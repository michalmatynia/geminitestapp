import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { internalError, notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("agentBrowserSnapshot" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent snapshots not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.snapshot.GET" }
      );
    }
    const { snapshotId } = await params;
    const snapshot = await prisma.agentBrowserSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snapshot) {
      return createErrorResponse(notFoundError("Snapshot not found."), {
        request: req,
        source: "chatbot.agent.snapshot.GET",
      });
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][snapshot] Loaded", {
        snapshotId,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ snapshot });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.snapshot.GET",
      fallbackMessage: "Failed to load agent snapshot.",
    });
  }
}

export const GET = apiHandlerWithParams<any>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.agent.snapshots.[snapshotId].GET" });
