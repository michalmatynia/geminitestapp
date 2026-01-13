import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";
import { promises as fs } from "fs";
import path from "path";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][GET] Run loaded", {
        runId,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ run });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][GET] Failed to load run", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load agent run.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
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
      stepId?: string;
      status?: "completed" | "failed" | "pending";
    };
    if (
      !body.action ||
      !["stop", "resume", "retry_step", "override_step", "approve_step"].includes(
        body.action
      )
    ) {
      return NextResponse.json(
        { error: "Unsupported action." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Request", {
        runId,
        action: body.action,
      });
    }

    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    if (body.action === "resume") {
      if (run.status === "running") {
        return NextResponse.json({ status: run.status });
      }
      const resumeStepId =
        typeof body.stepId === "string" && body.stepId.trim()
          ? body.stepId.trim()
          : null;
      const resumePlanState =
        run.planState && typeof run.planState === "object"
          ? {
              ...(run.planState as Record<string, unknown>),
              resumeRequestedAt: new Date().toISOString(),
              ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
            }
          : {
              resumeRequestedAt: new Date().toISOString(),
              ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
            };
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: "queued",
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: resumePlanState,
          ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
          logLines: {
            push: `[${new Date().toISOString()}] Run resume requested.`,
          },
        },
      });
      await logAgentAudit(updated.id, "info", "Agent run resume requested.");
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Resumed", {
          runId,
          status: updated.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === "retry_step") {
      if (run.status === "running") {
        return NextResponse.json(
          { error: "Run is running. Stop it before retrying steps." },
          { status: 409 }
        );
      }
      if (!body.stepId?.trim()) {
        return NextResponse.json(
          { error: "stepId is required for retry_step." },
          { status: 400 }
        );
      }
      const planState =
        run.planState && typeof run.planState === "object"
          ? (run.planState as Record<string, unknown>)
          : null;
      const steps = Array.isArray(planState?.steps) ? planState?.steps : null;
      if (!steps) {
        return NextResponse.json(
          { error: "No plan steps available to retry." },
          { status: 400 }
        );
      }
      const nextSteps = steps.map((step) => {
        if (step && typeof step === "object" && step.id === body.stepId) {
          const typed = step as {
            id: string;
            status?: string;
            attempts?: number;
            maxAttempts?: number;
          };
          return {
            ...typed,
            status: "pending",
            attempts: 0,
            maxAttempts: (typed.maxAttempts ?? 1) + 1,
          };
        }
        return step;
      });
      const now = new Date().toISOString();
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: "queued",
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: {
            ...(planState ?? {}),
            steps: nextSteps,
            activeStepId: body.stepId,
            resumeRequestedAt: now,
            updatedAt: now,
          },
          activeStepId: body.stepId,
          logLines: {
            push: `[${new Date().toISOString()}] Step retry requested (${body.stepId}).`,
          },
        },
      });
      await logAgentAudit(updated.id, "warning", "Step retry requested.", {
        stepId: body.stepId,
      });
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Step retry queued", {
          runId,
          stepId: body.stepId,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === "override_step") {
      if (run.status === "running") {
        return NextResponse.json(
          { error: "Run is running. Stop it before overriding steps." },
          { status: 409 }
        );
      }
      if (!body.stepId?.trim() || !body.status) {
        return NextResponse.json(
          { error: "stepId and status are required for override_step." },
          { status: 400 }
        );
      }
      const planState =
        run.planState && typeof run.planState === "object"
          ? (run.planState as Record<string, unknown>)
          : null;
      const steps = Array.isArray(planState?.steps) ? planState?.steps : null;
      if (!steps) {
        return NextResponse.json(
          { error: "No plan steps available to override." },
          { status: 400 }
        );
      }
      const nextSteps = steps.map((step) => {
        if (step && typeof step === "object" && step.id === body.stepId) {
          return { ...step, status: body.status };
        }
        return step;
      });
      const nextActive =
        body.status === "completed"
          ? (nextSteps.find(
              (step) =>
                step &&
                typeof step === "object" &&
                (step as { status?: string }).status !== "completed"
            ) as { id?: string } | undefined)?.id ?? null
          : body.stepId;
      const now = new Date().toISOString();
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          planState: {
            ...(planState ?? {}),
            steps: nextSteps,
            activeStepId: nextActive,
            updatedAt: now,
          },
          activeStepId: nextActive,
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Step overridden (${body.stepId} -> ${body.status}).`,
          },
        },
      });
      await logAgentAudit(updated.id, "warning", "Step overridden.", {
        stepId: body.stepId,
        status: body.status,
      });
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Step overridden", {
          runId,
          stepId: body.stepId,
          status: body.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === "approve_step") {
      if (run.status === "running") {
        return NextResponse.json(
          { error: "Run is running. Stop it before approving steps." },
          { status: 409 }
        );
      }
      if (!body.stepId?.trim()) {
        return NextResponse.json(
          { error: "stepId is required for approve_step." },
          { status: 400 }
        );
      }
      const planState =
        run.planState && typeof run.planState === "object"
          ? (run.planState as Record<string, unknown>)
          : null;
      const now = new Date().toISOString();
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: "queued",
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: {
            ...(planState ?? {}),
            approvalRequestedStepId: null,
            approvalGrantedStepId: body.stepId.trim(),
            activeStepId: body.stepId.trim(),
            updatedAt: now,
          },
          activeStepId: body.stepId.trim(),
          logLines: {
            push: `[${new Date().toISOString()}] Step approval granted (${body.stepId}).`,
          },
        },
      });
      await logAgentAudit(updated.id, "warning", "Step approval granted.", {
        stepId: body.stepId.trim(),
      });
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Step approved", {
          runId,
          stepId: body.stepId.trim(),
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (["completed", "failed", "stopped"].includes(run.status)) {
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][agent][POST] Already terminal", {
          runId,
          status: run.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: run.status });
    }

    const updated = await prisma.chatbotAgentRun.update({
      where: { id: runId },
      data: {
        status: "stopped",
        finishedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Run stopped by user.`,
        },
      },
    });
    await logAgentAudit(updated.id, "warning", "Agent run stopped by user.");

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Stopped", {
        runId,
        status: updated.status,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][POST] Failed to update run", { errorId, error });
    return NextResponse.json(
      { error: "Failed to update agent run.", errorId },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { runId } = await params;
    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    if (run.status === "running" && !force) {
      return NextResponse.json(
        { error: "Run is running. Stop it before deleting." },
        { status: 409 }
      );
    }
    if (run.status === "running" && force) {
      await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: { status: "stopped", finishedAt: new Date() },
      });
    }
    await prisma.chatbotAgentRun.delete({ where: { id: runId } });
    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.rm(runDir, { recursive: true, force: true });
    await logAgentAudit(runId, "warning", "Agent run deleted.", {
      deletedAt: new Date().toISOString(),
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][DELETE] Deleted", {
        runId,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][DELETE] Failed to delete run", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete agent run.", errorId },
      { status: 500 }
    );
  }
}
