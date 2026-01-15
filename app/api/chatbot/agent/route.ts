import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { startAgentQueue } from "@/lib/agent/core/queue";
import { logAgentAudit } from "@/lib/agent/audit";
import { promises as fs } from "fs";
import path from "path";
import { AgentRunStatus } from "@prisma/client";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET() {
  const requestStart = Date.now();
  try {
    startAgentQueue();
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const runs = await prisma.chatbotAgentRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        prompt: true,
        model: true,
        tools: true,
        searchProvider: true,
        agentBrowser: true,
        runHeadless: true,
        status: true,
        requiresHumanIntervention: true,
        errorMessage: true,
        logLines: true,
        recordingPath: true,
        activeStepId: true,
        checkpointedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { browserSnapshots: true, browserLogs: true },
        },
      },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][GET] Runs loaded", {
        count: runs.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ runs });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][GET] Failed to fetch runs", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch agent runs.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const body = (await req.json()) as {
      prompt?: string;
      model?: string;
      tools?: string[];
      searchProvider?: string;
      agentBrowser?: string;
      runHeadless?: boolean;
      ignoreRobotsTxt?: boolean;
      requireHumanApproval?: boolean;
      memoryValidationModel?: string;
      plannerModel?: string;
      selfCheckModel?: string;
      extractionValidationModel?: string;
      loopGuardModel?: string;
      memorySummarizationModel?: string;
      selectorInferenceModel?: string;
      outputNormalizationModel?: string;
      planSettings?: {
        maxSteps?: number;
        maxStepAttempts?: number;
        maxReplanCalls?: number;
        replanEverySteps?: number;
        maxSelfChecks?: number;
        loopGuardThreshold?: number;
        loopBackoffBaseMs?: number;
        loopBackoffMaxMs?: number;
      };
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }
    const normalizePlanSettings = (input?: {
      maxSteps?: number;
      maxStepAttempts?: number;
      maxReplanCalls?: number;
      replanEverySteps?: number;
      maxSelfChecks?: number;
      loopGuardThreshold?: number;
      loopBackoffBaseMs?: number;
      loopBackoffMaxMs?: number;
    }) => {
      if (!input) return null;
      const clampInt = (
        value: unknown,
        min: number,
        max: number,
        fallback: number
      ) => {
        const numeric =
          typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number(value)
              : NaN;
        if (!Number.isFinite(numeric)) return fallback;
        return Math.min(Math.max(Math.round(numeric), min), max);
      };
      return {
        maxSteps: clampInt(input.maxSteps, 1, 20, 12),
        maxStepAttempts: clampInt(input.maxStepAttempts, 1, 5, 2),
        maxReplanCalls: clampInt(input.maxReplanCalls, 0, 6, 2),
        replanEverySteps: clampInt(input.replanEverySteps, 1, 10, 2),
        maxSelfChecks: clampInt(input.maxSelfChecks, 0, 8, 4),
        loopGuardThreshold: clampInt(input.loopGuardThreshold, 1, 5, 2),
        loopBackoffBaseMs: clampInt(input.loopBackoffBaseMs, 250, 20000, 2000),
        loopBackoffMaxMs: clampInt(input.loopBackoffMaxMs, 1000, 60000, 12000),
      };
    };

    const planSettings = normalizePlanSettings(body.planSettings);

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Request", {
        promptLength: body.prompt.trim().length,
        model: body.model?.trim() || null,
        tools: body.tools ?? [],
        searchProvider: body.searchProvider?.trim() || null,
        agentBrowser: body.agentBrowser?.trim() || null,
        runHeadless: body.runHeadless ?? true,
        ignoreRobotsTxt: body.ignoreRobotsTxt ?? false,
        requireHumanApproval: body.requireHumanApproval ?? false,
        memoryValidationModel: body.memoryValidationModel?.trim() || null,
        plannerModel: body.plannerModel?.trim() || null,
        selfCheckModel: body.selfCheckModel?.trim() || null,
        extractionValidationModel:
          body.extractionValidationModel?.trim() || null,
        loopGuardModel: body.loopGuardModel?.trim() || null,
        memorySummarizationModel: body.memorySummarizationModel?.trim() || null,
        selectorInferenceModel: body.selectorInferenceModel?.trim() || null,
        outputNormalizationModel: body.outputNormalizationModel?.trim() || null,
        planSettings,
      });
    }

    const run = await prisma.chatbotAgentRun.create({
      data: {
        prompt: body.prompt.trim(),
        model: body.model?.trim() || null,
        tools: body.tools ?? [],
        searchProvider: body.searchProvider?.trim() || null,
        agentBrowser: body.agentBrowser?.trim() || null,
        runHeadless: body.runHeadless ?? true,
        logLines: [`[${new Date().toISOString()}] Run queued.`],
        ...(planSettings ||
        body.ignoreRobotsTxt !== undefined ||
        body.requireHumanApproval !== undefined
          ? {
              planState: {
                ...(planSettings ? { settings: planSettings } : {}),
                preferences: {
                  ignoreRobotsTxt: Boolean(body.ignoreRobotsTxt),
                  requireHumanApproval: Boolean(body.requireHumanApproval),
                  ...(body.memoryValidationModel?.trim()
                    ? {
                        memoryValidationModel:
                          body.memoryValidationModel.trim(),
                      }
                    : {}),
                  ...(body.plannerModel?.trim()
                    ? { plannerModel: body.plannerModel.trim() }
                    : {}),
                  ...(body.selfCheckModel?.trim()
                    ? { selfCheckModel: body.selfCheckModel.trim() }
                    : {}),
                  ...(body.extractionValidationModel?.trim()
                    ? {
                        extractionValidationModel:
                          body.extractionValidationModel.trim(),
                      }
                    : {}),
                  ...(body.loopGuardModel?.trim()
                    ? { loopGuardModel: body.loopGuardModel.trim() }
                    : {}),
                  ...(body.memorySummarizationModel?.trim()
                    ? {
                        memorySummarizationModel:
                          body.memorySummarizationModel.trim(),
                      }
                    : {}),
                  ...(body.selectorInferenceModel?.trim()
                    ? {
                        selectorInferenceModel:
                          body.selectorInferenceModel.trim(),
                      }
                    : {}),
                  ...(body.outputNormalizationModel?.trim()
                    ? {
                        outputNormalizationModel:
                          body.outputNormalizationModel.trim(),
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
    });
    await logAgentAudit(run.id, "info", "Agent run queued.", {
      model: run.model,
      tools: run.tools,
      searchProvider: run.searchProvider,
      agentBrowser: run.agentBrowser,
    });

    startAgentQueue();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][POST] Queued", {
        runId: run.id,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ runId: run.id, status: run.status });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][POST] Failed to enqueue run", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to enqueue agent run.", errorId },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return NextResponse.json(
        { error: "Agent runs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "terminal";
    const terminalStatuses: AgentRunStatus[] = [
      AgentRunStatus.completed,
      AgentRunStatus.failed,
      AgentRunStatus.stopped,
      AgentRunStatus.waiting_human,
    ];
    if (scope !== "terminal") {
      return NextResponse.json(
        { error: "Unsupported delete scope." },
        { status: 400 }
      );
    }
    const runs = await prisma.chatbotAgentRun.findMany({
      where: { status: { in: terminalStatuses } },
      select: { id: true },
    });
    const ids = runs.map((run) => run.id);
    if (ids.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }
    await prisma.chatbotAgentRun.deleteMany({
      where: { id: { in: ids } },
    });
    await Promise.all(
      ids.map((runId) =>
        fs.rm(path.join(process.cwd(), "tmp", "chatbot-agent", runId), {
          recursive: true,
          force: true,
        })
      )
    );
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][agent][DELETE] Deleted", {
        count: ids.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][agent][DELETE] Failed to delete runs", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete agent runs.", errorId },
      { status: 500 }
    );
  }
}
