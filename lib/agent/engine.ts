import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { logAgentAudit } from "@/lib/agent/audit";
import { validateAndAddAgentLongTermMemory } from "@/lib/agent/memory";
import { runAgentTool } from "@/lib/agent/tools";
import {
  launchBrowser,
  createBrowserContext,
} from "@/lib/agent/tools/playwright/browser";
import type { Browser, BrowserContext } from "playwright";
import path from "path";
import { promises as fs } from "fs";
import type {
  AgentDecision,
  PlanStep,
  PlannerMeta,
} from "@/lib/agent/engine-types";
import {
  DEFAULT_OLLAMA_MODEL,
  DEBUG_CHATBOT,
} from "@/lib/agent/engine-config";
import { reminderList } from "@/lib/agent/engine-utils";
import {
  appendTaskTypeToPrompt,
  decideNextAction,
} from "@/lib/agent/engine-plan-utils";
import {
  buildCheckpointState,
  parseCheckpoint,
} from "@/lib/agent/engine-checkpoint";
import { prepareRunContext } from "@/lib/agent/engine-run-context";
import { initializePlanState } from "@/lib/agent/engine-run-plan";
import { runPlanStepLoop } from "@/lib/agent/engine-step-runner";
import { finalizeAgentRun } from "@/lib/agent/engine-run-finalize";

export async function runAgentControlLoop(runId: string) {
  let sharedBrowser: Browser | null = null;
  let sharedContext: BrowserContext | null = null;
  try {
    if (!("chatbotAgentRun" in prisma)) {
      if (DEBUG_CHATBOT) {
        console.warn("[chatbot][agent][engine] Agent tables not initialized.");
      }
      return;
    }

    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      if (DEBUG_CHATBOT) {
        console.warn("[chatbot][agent][engine] Run not found", { runId });
      }
      return;
    }

    sharedBrowser = await launchBrowser(
      run.agentBrowser || "chromium",
      run.runHeadless ?? true
    );
    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });
    sharedContext = await createBrowserContext(sharedBrowser, runDir);

    await logAgentAudit(run.id, "info", "Agent loop started.");
    const {
      memoryKey,
      memoryContext: initialMemoryContext,
      settings,
      preferences: basePreferences,
      resolvedModel,
      memoryValidationModel,
      plannerModel,
      selfCheckModel,
      loopGuardModel,
      approvalGateModel,
      memorySummarizationModel,
      browserContext,
    } = await prepareRunContext({
      id: run.id,
      prompt: run.prompt,
      model: run.model ?? DEFAULT_OLLAMA_MODEL,
      memoryKey: run.memoryKey ?? null,
      planState: run.planState,
    });
    let memoryContext = initialMemoryContext;
    let planSteps: PlanStep[] = [];
    let taskType: PlannerMeta["taskType"] | null = null;
    let decision: AgentDecision = decideNextAction(run.prompt, memoryContext);
    let stepIndex = 0;
    const checkpoint = parseCheckpoint(run.planState);
    let summaryCheckpoint = checkpoint?.summaryCheckpoint ?? 0;
    let preferences = basePreferences;
    ({
      planSteps,
      taskType,
      decision,
      stepIndex,
      summaryCheckpoint,
      preferences,
    } = await initializePlanState({
      run: { id: run.id, prompt: run.prompt },
      checkpoint,
      memoryContext,
      browserContext,
      settings,
      preferences,
      plannerModel,
      loopGuardModel,
      memorySummarizationModel,
    }));

    await logAgentAudit(run.id, "info", "Decision made.", decision);

    if (decision.action === "tool") {
      await logAgentAudit(run.id, "warning", "Tool execution queued.", {
        toolName: decision.toolName,
        reason: decision.reason,
      });
      await logAgentAudit(run.id, "info", "Playwright tool starting.");

      let overallOk = true;
      let lastError: string | null = null;
      let requiresHuman = false;
      const stepRunResult = await runPlanStepLoop({
        run: {
          id: run.id,
          prompt: run.prompt,
          agentBrowser: run.agentBrowser,
          runHeadless: run.runHeadless,
        },
        sharedBrowser,
        sharedContext,
        planSteps,
        stepIndex,
        taskType,
        settings,
        preferences,
        memoryContext,
        summaryCheckpoint,
        memoryKey,
        memoryValidationModel,
        memorySummarizationModel,
        plannerModel,
        selfCheckModel,
        loopGuardModel,
        approvalGateModel,
        resolvedModel,
        browserContext,
        checkpoint,
      });
      planSteps = stepRunResult.planSteps;
      stepIndex = stepRunResult.stepIndex;
      taskType = stepRunResult.taskType;
      memoryContext = stepRunResult.memoryContext;
      summaryCheckpoint = stepRunResult.summaryCheckpoint;
      overallOk = stepRunResult.overallOk;
      lastError = stepRunResult.lastError;
      requiresHuman = stepRunResult.requiresHuman;

      if (planSteps.length === 0) {
        if (!sharedBrowser || !sharedContext) {
          throw new Error("Browser context is not available.");
        }
        const toolResult = await runAgentTool(
          {
            name: "playwright",
            input: {
              prompt: appendTaskTypeToPrompt(run.prompt, taskType),
              browser: run.agentBrowser || "chromium",
              runId: run.id,
              runHeadless: run.runHeadless,
            },
          },
          sharedBrowser,
          sharedContext
        );
        overallOk = toolResult.ok;
        lastError = toolResult.ok ? null : toolResult.error || "Tool failed.";
      }

      const { verificationContext, verification, improvementReview } =
        await finalizeAgentRun({
          run: { id: run.id, prompt: run.prompt },
          planSteps,
          taskType,
          overallOk,
          requiresHuman,
          lastError,
          summaryCheckpoint,
          settings,
          preferences,
          memoryContext,
          plannerModel,
          memorySummarizationModel,
        });
      if (improvementReview && memoryKey) {
        const memoryResult = await validateAndAddAgentLongTermMemory({
          memoryKey,
          runId: run.id,
          content: [
            `Self-improvement review: ${improvementReview.summary}`,
            improvementReview.mistakes.length
              ? reminderList("Mistakes", improvementReview.mistakes)
              : null,
            improvementReview.improvements.length
              ? reminderList("Improvements", improvementReview.improvements)
              : null,
            improvementReview.guardrails.length
              ? reminderList("Guardrails", improvementReview.guardrails)
              : null,
            improvementReview.toolAdjustments.length
              ? reminderList(
                  "Tool adjustments",
                  improvementReview.toolAdjustments
                )
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          summary: improvementReview.summary,
          tags: ["self-improvement", overallOk ? "completed" : "failed"],
          metadata: {
            prompt: run.prompt,
            taskType,
            status: overallOk ? "completed" : "failed",
            verification: verification ?? null,
            mistakes: improvementReview.mistakes,
            improvements: improvementReview.improvements,
            guardrails: improvementReview.guardrails,
            toolAdjustments: improvementReview.toolAdjustments,
            confidence: improvementReview.confidence ?? null,
          },
          importance: overallOk ? 3 : 4,
          model: memoryValidationModel ?? resolvedModel,
          summaryModel: memorySummarizationModel ?? resolvedModel,
          prompt: run.prompt,
        });
        if (memoryResult?.skipped) {
          await logAgentAudit(run.id, "warning", "Long-term memory rejected.", {
            type: "memory-validation",
            model: memoryResult.validation.model,
            issues: memoryResult.validation.issues,
            reason: memoryResult.validation.reason,
            scope: "self-improvement",
          });
        }
      }
      if (memoryKey) {
        const finalUrl = verificationContext?.url ?? null;
        let extractionSummary: {
          extractionType?: string;
          extractedCount?: number;
          items?: string[];
        } | null = null;
        if ("agentAuditLog" in prisma) {
          const latestExtraction = await prisma.agentAuditLog.findFirst({
            where: {
              runId: run.id,
              message: {
                in: ["Extracted product names.", "Extracted emails."],
              },
            },
            orderBy: { createdAt: "desc" },
            select: { metadata: true },
          });
          if (latestExtraction?.metadata) {
            const metadata = latestExtraction.metadata as {
              extractionType?: string;
              extractedCount?: number;
              items?: string[];
            };
            extractionSummary = {
              extractionType: metadata.extractionType,
              extractedCount: metadata.extractedCount,
              items: Array.isArray(metadata.items)
                ? metadata.items.slice(0, 10)
                : undefined,
            };
          }
        }
        const stepSummary = planSteps.map((step) => ({
          title: step.title,
          status: step.status,
          phase: step.phase ?? null,
          priority: step.priority ?? null,
        }));
        const summaryLines = [
          `Task: ${run.prompt}`,
          `Status: ${overallOk ? "completed" : "failed"}`,
          taskType ? `Task type: ${taskType}` : null,
          finalUrl ? `URL: ${finalUrl}` : null,
          verification?.verdict
            ? `Verification: ${verification.verdict}`
            : null,
          extractionSummary?.extractionType
            ? `Extraction: ${extractionSummary.extractionType} (${extractionSummary.extractedCount ?? 0})`
            : null,
        ].filter(Boolean);
        const summary = summaryLines.join(" · ");
        const runDetails = {
          id: run.id,
          prompt: run.prompt,
          model: run.model,
          tools: run.tools,
          searchProvider: run.searchProvider,
          agentBrowser: run.agentBrowser,
          runHeadless: run.runHeadless,
          status: overallOk ? "completed" : "failed",
          requiresHumanIntervention: run.requiresHumanIntervention,
          errorMessage: run.errorMessage,
          memoryKey: run.memoryKey,
          recordingPath: run.recordingPath,
          activeStepId: run.activeStepId,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          planState: run.planState ?? null,
        };
        const memoryResult = await validateAndAddAgentLongTermMemory({
          memoryKey,
          runId: run.id,
          content: [
            summary,
            "Steps:",
            ...stepSummary.map(
              (step, index) =>
                `${index + 1}. ${step.title} (${step.status}${
                  step.phase ? `, ${step.phase}` : ""
                })`
            ),
            verification?.evidence?.length
              ? `Evidence: ${verification.evidence.join(" | ")}`
              : null,
            verification?.missing?.length
              ? `Missing: ${verification.missing.join(" | ")}`
              : null,
            verification?.followUp
              ? `Follow-up: ${verification.followUp}`
              : null,
            extractionSummary?.items?.length
              ? `Sample items: ${extractionSummary.items.join(" | ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          summary,
          tags: ["agent-run", overallOk ? "completed" : "failed"],
          metadata: {
            run: runDetails,
            prompt: run.prompt,
            taskType,
            status: overallOk ? "completed" : "failed",
            url: finalUrl,
            runId: run.id,
            steps: stepSummary,
            verification: verification ?? null,
            extraction: extractionSummary,
          },
          importance: overallOk ? 3 : 2,
          model: memoryValidationModel ?? resolvedModel,
          summaryModel: memorySummarizationModel ?? resolvedModel,
          prompt: run.prompt,
        });
        if (memoryResult?.skipped) {
          await logAgentAudit(run.id, "warning", "Long-term memory rejected.", {
            type: "memory-validation",
            model: memoryResult.validation.model,
            issues: memoryResult.validation.issues,
            reason: memoryResult.validation.reason,
            scope: "run-summary",
          });
        }
      }
      await logAgentAudit(
        run.id,
        overallOk ? "info" : requiresHuman ? "warning" : "error",
        "Playwright tool finished.",
        {
          result: overallOk
            ? "completed"
            : requiresHuman
              ? "waiting_human"
              : "failed",
          error: lastError,
        }
      );
      return;
    }

    if (decision.action === "respond") {
      if (planSteps.length > 0) {
        planSteps = planSteps.map((step) => ({
          ...step,
          status: "completed",
        }));
        await logAgentAudit(run.id, "info", "Plan updated.", {
          type: "plan-update",
          steps: planSteps,
          result: "completed",
        });
      }
      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          activeStepId: null,
          planState: buildCheckpointState({
            steps: planSteps,
            activeStepId: null,
            approvalRequestedStepId: null,
            approvalGrantedStepId: null,
            summaryCheckpoint,
            settings,
            preferences,
          }),
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Agent responded (scaffold).`,
          },
        },
      });
      return;
    }

    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status: "waiting_human",
        requiresHumanIntervention: true,
        finishedAt: new Date(),
        activeStepId: planSteps[stepIndex]?.id ?? null,
        planState: buildCheckpointState({
          steps: planSteps,
          activeStepId: planSteps[stepIndex]?.id ?? null,
          lastError: checkpoint?.lastError ?? null,
          approvalRequestedStepId: null,
          approvalGrantedStepId: null,
          summaryCheckpoint,
          settings,
          preferences,
        }),
        checkpointedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Waiting for human input.`,
        },
      },
    });
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Unknown error";
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][engine] Failed", {
        runId,
        errorId,
        error,
      });
    }
    try {
      await logAgentAudit(runId, "error", "Agent loop failed.", {
        errorId,
        message,
      });
      if ("chatbotAgentRun" in prisma) {
        await prisma.chatbotAgentRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            errorMessage: message,
            finishedAt: new Date(),
            activeStepId: null,
            planState: Prisma.JsonNull,
            checkpointedAt: new Date(),
            logLines: {
              push: `[${new Date().toISOString()}] Agent failed (${errorId}).`,
            },
          },
        });
      }
    } catch (innerError) {
      if (DEBUG_CHATBOT) {
        console.error("[chatbot][agent][engine] Failed to persist error", {
          runId,
          errorId,
          innerError,
        });
      }
    }
  } finally {
    if (sharedContext) {
      await sharedContext.close().catch(() => {});
    }
    if (sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
    }
  }
}
