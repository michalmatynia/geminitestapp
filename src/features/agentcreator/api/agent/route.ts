import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/lib/db/prisma";
import { startAgentQueue } from "@/features/jobs/server";
import { logAgentAudit } from "@/features/agent-runtime/server";
import { promises as fs } from "fs";
import path from "path";
import type { AgentRunStatusType } from "@/features/agent-runtime/types/agent";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  try {
    startAgentQueue();
    if (!("chatbotAgentRun" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent runs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.GET" }
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
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.GET",
      fallbackMessage: "Failed to fetch agent runs.",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent runs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.POST" }
      );
    }
    let body: {
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
      toolRouterModel?: string;
      loopGuardModel?: string;
      approvalGateModel?: string;
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

    try {
      body = (await req.json()) as typeof body;
    } catch (_error) {
      return createErrorResponse(badRequestError("Invalid JSON payload"), {
        request: req,
        source: "chatbot.agent.POST",
      });
    }

    if (!body.prompt?.trim()) {
      return createErrorResponse(badRequestError("Prompt is required."), {
        request: req,
        source: "chatbot.agent.POST",
      });
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
        toolRouterModel: body.toolRouterModel?.trim() || null,
        loopGuardModel: body.loopGuardModel?.trim() || null,
        approvalGateModel: body.approvalGateModel?.trim() || null,
        memorySummarizationModel: body.memorySummarizationModel?.trim() || null,
        selectorInferenceModel: body.selectorInferenceModel?.trim() || null,
        outputNormalizationModel: body.outputNormalizationModel?.trim() || null,
        planSettings,
      });
    }

    const hasPreferenceOverrides =
      body.ignoreRobotsTxt !== undefined ||
      body.requireHumanApproval !== undefined ||
      Boolean(body.memoryValidationModel?.trim()) ||
      Boolean(body.plannerModel?.trim()) ||
      Boolean(body.selfCheckModel?.trim()) ||
      Boolean(body.extractionValidationModel?.trim()) ||
      Boolean(body.toolRouterModel?.trim()) ||
      Boolean(body.loopGuardModel?.trim()) ||
      Boolean(body.approvalGateModel?.trim()) ||
      Boolean(body.memorySummarizationModel?.trim()) ||
      Boolean(body.selectorInferenceModel?.trim()) ||
      Boolean(body.outputNormalizationModel?.trim());
    const shouldAttachPlanState = Boolean(planSettings || hasPreferenceOverrides);

    const run = await prisma.chatbotAgentRun.create({
      data: {
        prompt: body.prompt.trim(),
        model: body.model?.trim() || null,
        tools: body.tools ?? [],
        searchProvider: body.searchProvider?.trim() || null,
        agentBrowser: body.agentBrowser?.trim() || null,
        runHeadless: body.runHeadless ?? true,
        logLines: [`[${new Date().toISOString()}] Run queued.`],
        ...(shouldAttachPlanState
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
                  ...(body.toolRouterModel?.trim()
                    ? { toolRouterModel: body.toolRouterModel.trim() }
                    : {}),
                  ...(body.loopGuardModel?.trim()
                    ? { loopGuardModel: body.loopGuardModel.trim() }
                    : {}),
                  ...(body.approvalGateModel?.trim()
                    ? { approvalGateModel: body.approvalGateModel.trim() }
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
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.POST",
      fallbackMessage: "Failed to enqueue agent run.",
    });
  }
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!("chatbotAgentRun" in prisma)) {
      return createErrorResponse(
        internalError(
          "Agent runs not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.agent.DELETE" }
      );
    }
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "terminal";
    const terminalStatuses: AgentRunStatusType[] = [
      "completed",
      "failed",
      "stopped",
      "waiting_human",
    ];
    if (scope !== "terminal") {
      return createErrorResponse(badRequestError("Unsupported delete scope."), {
        request: req,
        source: "chatbot.agent.DELETE",
      });
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
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.DELETE",
      fallbackMessage: "Failed to delete agent runs.",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "chatbot.agent.GET" });
export const POST = apiHandler(POST_handler, { source: "chatbot.agent.POST" });
export const DELETE = apiHandler(DELETE_handler, { source: "chatbot.agent.DELETE" });
