import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { runAgentBrowserControl } from "@/lib/agent/tools";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const body = (await req.json()) as {
      action?: string;
      url?: string;
      stepId?: string;
      stepLabel?: string;
    };
    const action = body.action as "goto" | "reload" | "snapshot" | undefined;
    if (!action || !["goto", "reload", "snapshot"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid control action." },
        { status: 400 }
      );
    }
    if (action === "goto" && !body.url?.trim()) {
      return NextResponse.json(
        { error: "URL is required for goto action." },
        { status: 400 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][control] Request", {
        runId,
        action,
        url: body.url?.trim(),
      });
    }

    const result = await runAgentBrowserControl({
      runId,
      action,
      url: body.url,
      stepId: body.stepId,
      stepLabel: body.stepLabel,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Control action failed.", errorId: result.errorId },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, output: result.output });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][control] Failed", { errorId, error });
    return NextResponse.json(
      { error: "Failed to run agent control action.", errorId },
      { status: 500 }
    );
  }
}
