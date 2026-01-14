import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { logAgentAudit } from "@/lib/agent/audit";
import {
  addAgentMemory,
  listAgentLongTermMemory,
  listAgentMemory,
  validateAndAddAgentLongTermMemory,
} from "@/lib/agent/memory";
import { runAgentBrowserControl, runAgentTool } from "@/lib/agent/tools";
import {
  launchBrowser,
  createBrowserContext,
} from "@/lib/agent/tools/playwright/browser";
import type { Browser, BrowserContext } from "playwright";
import path from "path";
import { promises as fs } from "fs";
import unknownToErrorMessage from "@/lib/utils/helperNotification";
import type {
  AgentDecision,
  PlanStep,
  PlannerMeta,
} from "@/lib/agent/engine-types";
import {
  DEFAULT_OLLAMA_MODEL,
  DEBUG_CHATBOT,
  resolveAgentPlanSettings,
  resolveAgentPreferences,
} from "@/lib/agent/engine-config";
import {
  buildSelfImprovementPlaybook,
  jsonValueToRecord,
  reminderList,
  sleep,
} from "@/lib/agent/engine-utils";
import {
  appendTaskTypeToPrompt,
  buildBranchStepsFromAlternatives,
  decideNextAction,
  isExtractionStep,
  shouldEvaluateReplan,
} from "@/lib/agent/engine-plan-utils";
import {
  buildCheckpointState,
  parseCheckpoint,
  persistCheckpoint,
} from "@/lib/agent/engine-checkpoint";
import {
  evaluateApprovalGateWithLLM,
  requiresHumanApproval,
} from "@/lib/agent/engine-approvals";
import { addProblemSolutionMemory } from "@/lib/agent/engine-memory";
import {
  buildLoopGuardReview,
  detectLoopPattern,
} from "@/lib/agent/engine-loop-guard";
import {
  buildAdaptivePlanReview,
  buildCheckpointBriefWithLLM,
  buildMidRunAdaptationWithLLM,
  buildPlanWithLLM,
  buildResumePlanReview,
  buildSelfCheckReview,
  buildSelfImprovementReviewWithLLM,
  guardRepetitionWithLLM,
  summarizePlannerMemoryWithLLM,
  verifyPlanWithLLM,
} from "@/lib/agent/engine-plan-llm";
import { getBrowserContextSummary } from "@/lib/agent/engine-browser-context";

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
    let memoryKey = run.memoryKey;
    if (!memoryKey) {
      memoryKey = run.id;
      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: { memoryKey },
      });
    }
    await addAgentMemory({
      runId: run.id,
      scope: "session",
      content: run.prompt,
      metadata: { source: "user" },
    });

    const memory = await listAgentMemory({ runId: run.id, scope: "session" });
    const sessionContext = memory.map((item) => item.content).slice(-8);
    const longTermItems = memoryKey
      ? await listAgentLongTermMemory({ memoryKey, limit: 4 })
      : [];
    const longTermProblemItems = memoryKey
      ? await listAgentLongTermMemory({
          memoryKey,
          limit: 4,
          tags: ["problem-solution"],
        })
      : [];
    const longTermImprovementItems = memoryKey
      ? await listAgentLongTermMemory({
          memoryKey,
          limit: 3,
          tags: ["self-improvement"],
        })
      : [];
    const selfImprovementPlaybook = buildSelfImprovementPlaybook(
      longTermImprovementItems.map((item) => ({
        summary: item.summary,
        content: item.content,
        metadata: jsonValueToRecord(item.metadata),
      }))
    );
    const longTermContext = [
      ...longTermItems,
      ...longTermProblemItems,
      ...longTermImprovementItems,
    ]
      .map((item) => item.summary || item.content)
      .filter(Boolean)
      .map((item) => `Long-term memory: ${item}`);
    let memoryContext = [
      ...sessionContext,
      ...longTermContext,
      ...(selfImprovementPlaybook ? [selfImprovementPlaybook] : []),
    ].slice(-10);
    const resolvedModel = run.model || DEFAULT_OLLAMA_MODEL;
    const settings = resolveAgentPlanSettings(run.planState);
    const preferences = resolveAgentPreferences(run.planState);
    const memoryValidationModel =
      typeof preferences.memoryValidationModel === "string" &&
      preferences.memoryValidationModel.trim()
        ? preferences.memoryValidationModel.trim()
        : null;
    const plannerModel =
      typeof preferences.plannerModel === "string" &&
      preferences.plannerModel.trim()
        ? preferences.plannerModel.trim()
        : resolvedModel;
    const selfCheckModel =
      typeof preferences.selfCheckModel === "string" &&
      preferences.selfCheckModel.trim()
        ? preferences.selfCheckModel.trim()
        : plannerModel;
    const loopGuardModel =
      typeof preferences.loopGuardModel === "string" &&
      preferences.loopGuardModel.trim()
        ? preferences.loopGuardModel.trim()
        : plannerModel;
    const approvalGateModel =
      typeof preferences.approvalGateModel === "string" &&
      preferences.approvalGateModel.trim()
        ? preferences.approvalGateModel.trim()
        : null;
    const memorySummarizationModel =
      typeof preferences.memorySummarizationModel === "string" &&
      preferences.memorySummarizationModel.trim()
        ? preferences.memorySummarizationModel.trim()
        : resolvedModel;
    const browserContext = await getBrowserContextSummary(run.id);
    if (longTermImprovementItems.length > 0) {
      await logAgentAudit(run.id, "info", "Self-improvement memory loaded.", {
        type: "self-improvement-context",
        count: longTermImprovementItems.length,
      });
    }
    if (selfImprovementPlaybook) {
      await logAgentAudit(run.id, "info", "Self-improvement playbook ready.", {
        type: "self-improvement-playbook",
      });
    }
    await logAgentAudit(run.id, "info", "Planner context prepared.", {
      type: "planner-context",
      reason: "initial",
      prompt: run.prompt,
      model: plannerModel,
      memory: memoryContext,
      browserContext,
    });
    let planSteps: PlanStep[] = [];
    let taskType: PlannerMeta["taskType"] | null = null;
    let hasBrowserContext = Boolean(
      browserContext?.url && browserContext.url !== "about:blank"
    );
    let decision: AgentDecision = decideNextAction(run.prompt, memoryContext);
    let planHierarchy: {
      goals: Array<{
        id: string;
        title: string;
        successCriteria?: string | null;
        subgoals: Array<{
          id: string;
          title: string;
          successCriteria?: string | null;
          steps: Array<{
            title: string;
            tool?: "playwright" | "none";
            expectedObservation?: string | null;
            successCriteria?: string | null;
          }>;
        }>;
      }>;
    } | null = null;
    let stepIndex = 0;

    const checkpoint = parseCheckpoint(run.planState);
    const summaryInterval = 5;
    let summaryCheckpoint = checkpoint?.summaryCheckpoint ?? 0;
    if (checkpoint?.steps?.length) {
      planSteps = checkpoint.steps;
      taskType = checkpoint.taskType ?? null;
      const checkpointPreferences = checkpoint.preferences ?? null;
      if (checkpointPreferences?.ignoreRobotsTxt !== undefined) {
        preferences.ignoreRobotsTxt = Boolean(
          checkpointPreferences.ignoreRobotsTxt
        );
      }
      if (checkpointPreferences?.requireHumanApproval !== undefined) {
        preferences.requireHumanApproval = Boolean(
          checkpointPreferences.requireHumanApproval
        );
      }
      if (typeof checkpointPreferences?.plannerModel === "string") {
        preferences.plannerModel = checkpointPreferences.plannerModel;
      }
      if (typeof checkpointPreferences?.selfCheckModel === "string") {
        preferences.selfCheckModel = checkpointPreferences.selfCheckModel;
      }
      if (typeof checkpointPreferences?.loopGuardModel === "string") {
        preferences.loopGuardModel = checkpointPreferences.loopGuardModel;
      }
      if (typeof checkpointPreferences?.approvalGateModel === "string") {
        preferences.approvalGateModel = checkpointPreferences.approvalGateModel;
      }
      if (typeof checkpointPreferences?.memorySummarizationModel === "string") {
        preferences.memorySummarizationModel =
          checkpointPreferences.memorySummarizationModel;
      }
      if (typeof checkpoint.summaryCheckpoint === "number") {
        summaryCheckpoint = checkpoint.summaryCheckpoint;
      }
      let resumedWithNewPlan = false;
      if (
        checkpoint.resumeRequestedAt &&
        checkpoint.resumeRequestedAt !== checkpoint.resumeProcessedAt
      ) {
        const resumeContext = await getBrowserContextSummary(run.id);
        const resumeReview = await buildResumePlanReview({
          prompt: run.prompt,
          memory: memoryContext,
          model: memorySummarizationModel,
          browserContext: resumeContext,
          currentPlan: planSteps,
          activeStepId: checkpoint.activeStepId ?? null,
          lastError: checkpoint.lastError ?? null,
          runId: run.id,
          maxSteps: settings.maxSteps,
          maxStepAttempts: settings.maxStepAttempts,
        });
        if (resumeReview.shouldReplan && resumeReview.steps.length > 0) {
          planSteps = resumeReview.steps;
          stepIndex = 0;
          resumedWithNewPlan = true;
          taskType = resumeReview.meta?.taskType ?? taskType;
          await logAgentAudit(run.id, "warning", "Resume plan refreshed.", {
            type: "resume-plan",
            steps: planSteps,
            reason: resumeReview.reason,
            plannerMeta: resumeReview.meta ?? null,
            hierarchy: resumeReview.hierarchy ?? null,
          });
        } else {
          await logAgentAudit(run.id, "info", "Resume summary prepared.", {
            type: "resume-summary",
            summary: resumeReview.summary ?? null,
            reason: resumeReview.reason,
            plannerMeta: resumeReview.meta ?? null,
          });
        }
        await persistCheckpoint({
          runId: run.id,
          steps: planSteps,
          activeStepId: planSteps[stepIndex]?.id ?? null,
          lastError: checkpoint.lastError ?? null,
          taskType,
          resumeRequestedAt: checkpoint.resumeRequestedAt,
          resumeProcessedAt: new Date().toISOString(),
          approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null,
          approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null,
          summaryCheckpoint,
          settings,
          preferences,
        });
      }
      if (!resumedWithNewPlan && checkpoint.activeStepId) {
        const activeIndex = planSteps.findIndex(
          (step) => step.id === checkpoint.activeStepId
        );
        stepIndex = activeIndex === -1 ? 0 : activeIndex;
      } else {
        const firstPending = planSteps.findIndex(
          (step) => step.status !== "completed"
        );
        stepIndex = firstPending === -1 ? 0 : firstPending;
      }
      decision = {
        action: "tool",
        reason: "Resuming from checkpoint.",
        toolName: "playwright",
      };
      await logAgentAudit(run.id, "info", "Checkpoint loaded.", {
        type: "checkpoint-load",
        activeStepId: checkpoint.activeStepId ?? null,
        stepCount: planSteps.length,
      });
    } else {
      const planResult = await buildPlanWithLLM({
        prompt: run.prompt,
        memory: memoryContext,
        model: plannerModel,
        guardModel: loopGuardModel,
        browserContext,
        maxSteps: settings.maxSteps,
        maxStepAttempts: settings.maxStepAttempts,
      });

      planSteps = planResult.steps;
      planHierarchy = planResult.hierarchy ?? null;
      taskType = planResult.meta?.taskType ?? null;
      if (planSteps.length > 0) {
        await logAgentAudit(run.id, "info", "Plan created.", {
          type: "plan",
          steps: planSteps,
          source: planResult.source,
          hierarchy: planHierarchy,
          plannerMeta: planResult.meta ?? null,
        });
        const branchAlternatives = buildBranchStepsFromAlternatives(
          planResult.meta?.alternatives ?? undefined, // null -> undefined
          settings.maxStepAttempts,
          Math.min(6, settings.maxSteps)
        );
        if (branchAlternatives.length > 0) {
          await logAgentAudit(run.id, "info", "Plan branch created.", {
            type: "plan-branch",
            branchSteps: branchAlternatives,
            reason: "planner-alternatives",
            plannerMeta: planResult.meta ?? null,
          });
        }
      }
      decision = planResult.decision;
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[0]?.id ?? null,
        lastError: null,
        taskType,
        summaryCheckpoint,
        approvalRequestedStepId: null,
        approvalGrantedStepId: null,
        settings,
        preferences,
      });
    }

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
      const branchedStepIds = new Set<string>();
      let replanCount = 0;
      let selfCheckCount = 0;
      let lastContextUrl = browserContext?.url ?? null;
      let consecutiveFailures = 0;
      let approvalRequestedStepId: string | null =
        checkpoint?.approvalRequestedStepId ?? null;
      const approvalGrantedStepId: string | null =
        checkpoint?.approvalGrantedStepId ?? null;
      let checkpointBriefStepId: string | null =
        checkpoint?.checkpointStepId ?? null;
      let checkpointBriefError: string | null = checkpoint?.lastError ?? null;
      const midRunInterval = 3;
      let stagnationCount = 0;
      let noContextCount = 0;
      let lastStableUrl = lastContextUrl;
      let lastExtractionCheckAt = 0;
      let loopGuardCooldown = 0;
      let loopSignalStreak = 0;
      let loopBackoffMs = 0;
      const recentStepTrace: Array<{
        title: string;
        status: PlanStep["status"];
        tool?: string | null;
        url: string | null;
      }> = [];
      const maybeUpdateCheckpointBrief = async (
        activeStepIdForBrief: string | null
      ) => {
        if (!activeStepIdForBrief) return;
        if (
          checkpointBriefStepId === activeStepIdForBrief &&
          checkpointBriefError === (lastError ?? null)
        ) {
          return;
        }
        const briefContext = await getBrowserContextSummary(run.id);
        const brief = await buildCheckpointBriefWithLLM({
          prompt: run.prompt,
          model: memorySummarizationModel,
          memory: memoryContext,
          steps: planSteps,
          activeStepId: activeStepIdForBrief,
          lastError,
          browserContext: briefContext,
          runId: run.id,
        });
        if (!brief) return;
        checkpointBriefStepId = activeStepIdForBrief;
        checkpointBriefError = lastError ?? null;
        await persistCheckpoint({
          runId: run.id,
          steps: planSteps,
          activeStepId: activeStepIdForBrief,
          lastError,
          taskType,
          approvalRequestedStepId,
          approvalGrantedStepId,
          checkpointBrief: brief.summary,
          checkpointNextActions: brief.nextActions,
          checkpointRisks: brief.risks,
          checkpointStepId: checkpointBriefStepId,
          checkpointCreatedAt: new Date().toISOString(),
          summaryCheckpoint,
          settings,
          preferences,
        });
        await logAgentAudit(run.id, "info", "Checkpoint brief saved.", {
          type: "checkpoint-brief",
          stepId: activeStepIdForBrief,
          summary: brief.summary,
        });
      };
      const logBranchAlternatives = async (
        meta: PlannerMeta | null | undefined,
        reason: string
      ) => {
        const branchAlternatives = buildBranchStepsFromAlternatives(
          meta?.alternatives ?? undefined, // null -> undefined
          settings.maxStepAttempts,
          Math.min(6, settings.maxSteps)
        );
        if (branchAlternatives.length === 0) return;
        await logAgentAudit(run.id, "info", "Plan branch created.", {
          type: "plan-branch",
          branchSteps: branchAlternatives,
          reason,
          plannerMeta: meta ?? null,
        });
      };
      while (stepIndex < planSteps.length) {
        const step = planSteps[stepIndex];
        if (step.status === "completed") {
          stepIndex += 1;
          continue;
        }
        let requiresApproval = false;
        let approvalReason: string | null = null;
        let approvalRisk: string | null = null;
        let approvalSource = "heuristic";
        if (
          preferences.requireHumanApproval &&
          approvalGrantedStepId !== step.id
        ) {
          requiresApproval = requiresHumanApproval(step, run.prompt);
          if (!requiresApproval && approvalGateModel) {
            const gateContext = await getBrowserContextSummary(run.id);
            const gateDecision = await evaluateApprovalGateWithLLM({
              prompt: run.prompt,
              step,
              model: approvalGateModel,
              browserContext: gateContext,
              runId: run.id,
            });
            if (gateDecision) {
              requiresApproval = gateDecision.requiresApproval;
              approvalReason = gateDecision.reason ?? null;
              approvalRisk = gateDecision.riskLevel ?? null;
              approvalSource = "policy-model";
              await logAgentAudit(run.id, "info", "Approval gate evaluated.", {
                type: "approval-gate-review",
                stepId: step.id,
                stepTitle: step.title,
                requiresApproval,
                reason: approvalReason,
                riskLevel: approvalRisk,
                model: approvalGateModel,
              });
            }
          }
        }
        if (
          preferences.requireHumanApproval &&
          requiresApproval &&
          approvalGrantedStepId !== step.id
        ) {
          approvalRequestedStepId = step.id;
          await prisma.chatbotAgentRun.update({
            where: { id: run.id },
            data: {
              status: "waiting_human",
              requiresHumanIntervention: true,
              activeStepId: step.id,
              planState: buildCheckpointState({
                steps: planSteps,
                activeStepId: step.id,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              }),
              checkpointedAt: new Date(),
              logLines: {
                push: `[${new Date().toISOString()}] Approval required for step.`,
              },
            },
          });
          await logAgentAudit(run.id, "warning", "Approval required.", {
            type: "approval-gate",
            stepId: step.id,
            stepTitle: step.title,
            source: approvalSource,
            reason: approvalReason,
            riskLevel: approvalRisk,
          });
          return;
        }
        const attempts = (step.attempts ?? 0) + 1;
        planSteps = planSteps.map((item) =>
          item.id === step.id ? { ...item, status: "running", attempts } : item
        );
        await logAgentAudit(run.id, "info", "Plan updated.", {
          type: "plan-update",
          steps: planSteps,
          activeStepId: step.id,
        });
        await persistCheckpoint({
          runId: run.id,
          steps: planSteps,
          activeStepId: step.id,
          lastError,
          taskType,
          approvalRequestedStepId,
          approvalGrantedStepId,
          summaryCheckpoint,
          settings,
          preferences,
        });

        if (step.tool === "none") {
          planSteps = planSteps.map((item) =>
            item.id === step.id ? { ...item, status: "completed" } : item
          );
          await logAgentAudit(run.id, "info", "Plan updated.", {
            type: "plan-update",
            steps: planSteps,
            result: "completed",
          });
          await maybeUpdateCheckpointBrief(step.id);
          const completedCount = planSteps.filter(
            (item) => item.status === "completed"
          ).length;
          if (
            completedCount >= summaryInterval &&
            completedCount % summaryInterval === 0 &&
            completedCount !== summaryCheckpoint
          ) {
            const summaryContext = await getBrowserContextSummary(run.id);
            const summary = await summarizePlannerMemoryWithLLM({
              prompt: run.prompt,
              model: memorySummarizationModel,
              memory: memoryContext,
              steps: planSteps,
              browserContext: summaryContext,
              runId: run.id,
            });
            if (summary) {
              await addAgentMemory({
                runId: run.id,
                scope: "session",
                content: summary,
                metadata: { type: "planner-summary", completedCount },
              });
              memoryContext = [...memoryContext, summary].slice(-10);
              summaryCheckpoint = completedCount;
              await logAgentAudit(run.id, "info", "Planner summary saved.", {
                type: "planner-summary",
                completedCount,
                summary,
              });
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: step.id,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              });
            }
          }
          continue;
        }

        const shouldInitializeBrowser = !hasBrowserContext || stepIndex === 0;
        const previousUrl = lastContextUrl;
        const shouldRunExtraction = isExtractionStep(
          step,
          run.prompt,
          taskType
        );
        const toolPrompt = appendTaskTypeToPrompt(
          run.prompt,
          shouldRunExtraction ? "extract_info" : taskType
        );
        const toolName =
          shouldInitializeBrowser || shouldRunExtraction
            ? "playwright"
            : "snapshot";
        const toolStart = Date.now();
        const toolContext = {
          type: "tool-execution",
          toolName,
          stepId: step.id,
          stepTitle: step.title,
          shouldRunExtraction,
          shouldInitializeBrowser,
        };
        await logAgentAudit(
          run.id,
          "info",
          "Tool execution started.",
          toolContext
        );
        const toolTimeoutId = setTimeout(() => {
          void logAgentAudit(
            run.id,
            "warning",
            "Tool execution taking longer than expected.",
            {
              ...toolContext,
              elapsedMs: Date.now() - toolStart,
            }
          );
        }, 20000);
        let toolResult: Awaited<ReturnType<typeof runAgentTool>> | null = null;
        let toolError: unknown = null;
        try {
          toolResult =
            shouldInitializeBrowser || shouldRunExtraction
              ? await runAgentTool(
                  {
                    name: "playwright",
                    input: {
                      prompt: toolPrompt,
                      browser: run.agentBrowser || "chromium",
                      runId: run.id,
                      runHeadless: run.runHeadless,
                      stepId: step.id,
                      stepLabel: step.title,
                    },
                  },
                  sharedBrowser,
                  sharedContext
                )
              : await runAgentBrowserControl({
                  runId: run.id,
                  action: "snapshot",
                  stepId: step.id,
                  stepLabel: step.title,
                });
        } catch (error) {
          toolError = error;
        } finally {
          clearTimeout(toolTimeoutId);
          const errorMessage =
            toolResult?.error ?? unknownToErrorMessage(toolError);

          await logAgentAudit(
            run.id,
            toolError ? "error" : "info",
            "Tool execution finished.",
            {
              ...toolContext,
              ok: toolResult?.ok ?? false,
              error: errorMessage,
              durationMs: Date.now() - toolStart,
            }
          );
        }
        if (toolError || !toolResult) {
          throw toolError instanceof Error
            ? toolError
            : new Error("Tool execution failed.");
        }

        if (!toolResult.ok) {
          overallOk = false;
          lastError = toolResult.error || "Tool failed.";
          requiresHuman =
            typeof lastError === "string" &&
            /requires human|cloudflare challenge/i.test(lastError);
          consecutiveFailures += 1;
        } else {
          consecutiveFailures = 0;
        }

        planSteps = planSteps.map((item) =>
          item.id === step.id
            ? {
                ...item,
                status: toolResult.ok ? "completed" : "failed",
                snapshotId: toolResult.output?.snapshotId ?? null,
                logCount: toolResult.output?.logCount ?? null,
              }
            : item
        );
        if (toolResult.output?.snapshotId) {
          const outputUrl =
            typeof toolResult.output?.url === "string"
              ? toolResult.output.url
              : null;
          hasBrowserContext = Boolean(outputUrl && outputUrl !== "about:blank");
          if (hasBrowserContext && outputUrl) {
            lastContextUrl = outputUrl;
            noContextCount = 0;
            if (lastStableUrl === outputUrl) {
              stagnationCount += 1;
            } else {
              stagnationCount = 0;
              lastStableUrl = outputUrl;
            }
          } else {
            noContextCount += 1;
          }
        }
        await logAgentAudit(run.id, "info", "Plan updated.", {
          type: "plan-update",
          steps: planSteps,
          result: toolResult.ok ? "completed" : "failed",
        });
        await persistCheckpoint({
          runId: run.id,
          steps: planSteps,
          activeStepId: toolResult.ok
            ? (planSteps[stepIndex + 1]?.id ?? null)
            : step.id,
          lastError,
          taskType,
          approvalRequestedStepId,
          approvalGrantedStepId,
          summaryCheckpoint,
          settings,
          preferences,
        });
        await maybeUpdateCheckpointBrief(
          toolResult.ok ? (planSteps[stepIndex + 1]?.id ?? null) : step.id
        );

        loopGuardCooldown = Math.max(0, loopGuardCooldown - 1);
        recentStepTrace.push({
          title: step.title,
          status: toolResult.ok ? "completed" : "failed",
          tool: step.tool ?? null,
          url: lastContextUrl,
        });
        if (recentStepTrace.length > 6) {
          recentStepTrace.splice(0, recentStepTrace.length - 6);
        }
        const loopSignal = detectLoopPattern(recentStepTrace);
        if (loopSignal) {
          loopSignalStreak += 1;
        } else {
          loopSignalStreak = 0;
          loopBackoffMs = 0;
        }
        if (
          loopSignal &&
          loopSignalStreak >= settings.loopGuardThreshold &&
          loopGuardCooldown === 0 &&
          replanCount < settings.maxReplanCalls
        ) {
          const baseBackoff = Math.max(0, settings.loopBackoffBaseMs);
          const maxBackoff = Math.max(baseBackoff, settings.loopBackoffMaxMs);
          loopBackoffMs = loopBackoffMs
            ? Math.min(loopBackoffMs * 2, maxBackoff)
            : baseBackoff;
          if (loopBackoffMs > 0) {
            await sleep(loopBackoffMs);
          }
          const loopContext = await getBrowserContextSummary(run.id);
          const loopReview = await buildLoopGuardReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: loopGuardModel,
            browserContext: loopContext,
            currentPlan: planSteps,
            completedIndex: stepIndex,
            loopSignal,
            lastError,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
          });
          loopGuardCooldown = 2;
          await logAgentAudit(run.id, "warning", "Loop guard evaluated.", {
            type: "loop-guard",
            action: loopReview.action,
            reason: loopReview.reason,
            loop: loopSignal,
            backoffMs: loopBackoffMs,
            streak: loopSignalStreak,
          });
          if (loopReview.action === "wait_human") {
            requiresHuman = true;
            lastError =
              loopReview.reason ?? "Loop guard requested human input.";
            break;
          }
          if (loopReview.action === "replan" && loopReview.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: loopGuardModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: loopReview.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = loopReview.meta?.taskType ?? taskType;
            replanCount += 1;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: loopReview.reason,
              plannerMeta: loopReview.meta ?? null,
              hierarchy: loopReview.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(loopReview.meta, "loop-guard");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
            stepIndex = nextIndex;
            overallOk = true;
            lastError = null;
            continue;
          }
        }

        if (toolResult.ok && replanCount < settings.maxReplanCalls) {
          const stepContext = await getBrowserContextSummary(run.id);
          const stepReview = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: plannerModel,
            browserContext: stepContext,
            currentPlan: planSteps,
            completedIndex: stepIndex,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
            trigger: "step-complete",
            signals: {
              stepId: step.id,
              stepTitle: step.title,
              stepStatus: "completed",
              url: lastContextUrl,
            },
          });
          if (stepReview.shouldReplan && stepReview.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: loopGuardModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: stepReview.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = stepReview.meta?.taskType ?? taskType;
            replanCount += 1;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: stepReview.reason ?? "step-complete",
              plannerMeta: stepReview.meta ?? null,
              hierarchy: stepReview.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(stepReview.meta, "step-complete");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
            stepIndex = nextIndex;
            overallOk = true;
            lastError = null;
            continue;
          }
        }

        if (!toolResult.ok) {
          if (attempts < (step.maxAttempts ?? settings.maxStepAttempts)) {
            if (branchedStepIds.has(step.id)) {
              break;
            }
            const replanBrowserContext = await getBrowserContextSummary(run.id);
            await logAgentAudit(
              run.id,
              "warning",
              "Planner context prepared.",
              {
                type: "planner-context",
                reason: "replan-after-failure",
                prompt: run.prompt,
                model: plannerModel,
                memory: memoryContext,
                browserContext: replanBrowserContext,
                lastError,
                previousPlan: planSteps.map((item) => ({
                  id: item.id,
                  title: item.title,
                  status: item.status,
                  tool: item.tool,
                })),
              }
            );
            const branchResult = await buildPlanWithLLM({
              prompt: run.prompt,
              memory: memoryContext,
              model: plannerModel,
              guardModel: loopGuardModel,
              lastError,
              runId: run.id,
              browserContext: replanBrowserContext,
              mode: "branch",
              failedStep: {
                id: step.id,
                title: step.title,
                expectedObservation: step.expectedObservation ?? null,
                successCriteria: step.successCriteria ?? null,
              },
              maxSteps: settings.maxSteps,
              maxStepAttempts: settings.maxStepAttempts,
            });
            if (branchResult.branchSteps?.length) {
              const failedIndex = planSteps.findIndex(
                (item) => item.id === step.id
              );
              const insertAt =
                failedIndex === -1 ? planSteps.length : failedIndex + 1;
              planSteps = [
                ...planSteps.slice(0, insertAt),
                ...branchResult.branchSteps,
                ...planSteps.slice(insertAt),
              ];
              await logAgentAudit(run.id, "warning", "Plan branch created.", {
                type: "plan-branch",
                failedStepId: step.id,
                branchSteps: branchResult.branchSteps,
                reason: "step-failed",
                lastError,
                plannerMeta: branchResult.meta ?? null,
                stepId: step.id,
                activeStepId: step.id,
              });
              if (memoryKey && lastError) {
                await addProblemSolutionMemory({
                  memoryKey,
                  runId: run.id,
                  problem: lastError,
                  countermeasure: "Created branch steps for failed step.",
                  context: {
                    stepId: step.id,
                    stepTitle: step.title,
                    reason: "step-failed",
                  },
                  tags: ["branch"],
                  model: memoryValidationModel ?? resolvedModel,
                  summaryModel: memorySummarizationModel ?? resolvedModel,
                  prompt: run.prompt,
                });
              }
              branchedStepIds.add(step.id);
              await logAgentAudit(run.id, "info", "Plan updated.", {
                type: "plan-update",
                steps: planSteps,
                activeStepId: planSteps[insertAt]?.id ?? null,
              });
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[insertAt]?.id ?? null,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              });
              stepIndex = insertAt;
              overallOk = true;
              lastError = null;
              continue;
            }
            const replanResult = await buildPlanWithLLM({
              prompt: run.prompt,
              memory: memoryContext,
              model: plannerModel,
              guardModel: loopGuardModel,
              previousPlan: planSteps,
              lastError,
              runId: run.id,
              browserContext: replanBrowserContext,
              maxSteps: settings.maxSteps,
              maxStepAttempts: settings.maxStepAttempts,
            });
            if (replanResult.steps.length > 0) {
              planSteps = replanResult.steps;
              taskType = replanResult.meta?.taskType ?? taskType;
              await logAgentAudit(run.id, "warning", "Plan created.", {
                type: "plan",
                steps: planSteps,
                source: replanResult.source,
                reason: "replan-after-failure",
                hierarchy: replanResult.hierarchy ?? null,
                plannerMeta: replanResult.meta ?? null,
                stepId: step.id,
                activeStepId: step.id,
              });
              const branchAlternatives = buildBranchStepsFromAlternatives(
                replanResult.meta?.alternatives,
                settings.maxStepAttempts,
                Math.min(6, settings.maxSteps)
              );
              if (branchAlternatives.length > 0) {
                await logAgentAudit(run.id, "info", "Plan branch created.", {
                  type: "plan-branch",
                  branchSteps: branchAlternatives,
                  reason: "replan-alternatives",
                  plannerMeta: replanResult.meta ?? null,
                });
              }
              if (memoryKey && lastError) {
                await addProblemSolutionMemory({
                  memoryKey,
                  runId: run.id,
                  problem: lastError,
                  countermeasure: "Replanned after failure.",
                  context: {
                    stepId: step.id,
                    stepTitle: step.title,
                    reason: "replan-after-failure",
                  },
                  tags: ["replan"],
                  model: memoryValidationModel ?? resolvedModel,
                  summaryModel: memorySummarizationModel ?? resolvedModel,
                  prompt: run.prompt,
                });
              }
              decision = replanResult.decision;
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[0]?.id ?? null,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              });
              stepIndex = 0;
              overallOk = true;
              lastError = null;
              continue;
            }
          }
          if (
            consecutiveFailures >= 2 &&
            replanCount < settings.maxReplanCalls
          ) {
            const failureContext = await getBrowserContextSummary(run.id);
            const deadEndReview = await buildAdaptivePlanReview({
              prompt: run.prompt,
              memory: memoryContext,
              model: plannerModel,
              browserContext: failureContext,
              currentPlan: planSteps,
              completedIndex: stepIndex,
              runId: run.id,
              maxSteps: settings.maxSteps,
              maxStepAttempts: settings.maxStepAttempts,
              trigger: "dead-end",
              signals: {
                consecutiveFailures,
                lastError,
                lastContextUrl,
              },
            });
            if (deadEndReview.shouldReplan && deadEndReview.steps.length > 0) {
              const nextIndex = stepIndex + 1;
              const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
              const nextSteps = deadEndReview.steps.slice(0, remainingSlots);
              planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
              taskType = deadEndReview.meta?.taskType ?? taskType;
              replanCount += 1;
              await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
                type: "plan-replan",
                steps: planSteps,
                reason: "dead-end",
                plannerMeta: deadEndReview.meta ?? null,
                hierarchy: deadEndReview.hierarchy ?? null,
                stepId: step.id,
                activeStepId: step.id,
              });
              await logBranchAlternatives(deadEndReview.meta, "dead-end");
              if (memoryKey) {
                await addProblemSolutionMemory({
                  memoryKey,
                  runId: run.id,
                  problem: lastError ?? "Repeated tool failures (dead-end).",
                  countermeasure: "Replanned due to dead-end.",
                  context: {
                    stepId: step.id,
                    stepTitle: step.title,
                    reason: "dead-end",
                  },
                  tags: ["dead-end"],
                  model: memoryValidationModel ?? resolvedModel,
                  summaryModel: memorySummarizationModel ?? resolvedModel,
                  prompt: run.prompt,
                });
              }
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[nextIndex]?.id ?? null,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              });
              stepIndex = nextIndex;
              overallOk = true;
              lastError = null;
              continue;
            }
          }
          break;
        }
        const completedCount = planSteps.filter(
          (item) => item.status === "completed"
        ).length;
        if (
          stagnationCount >= 2 &&
          replanCount < settings.maxReplanCalls &&
          completedCount > 0
        ) {
          const stagnationContext = await getBrowserContextSummary(run.id);
          const stagnationReview = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: plannerModel,
            browserContext: stagnationContext,
            currentPlan: planSteps,
            completedIndex: stepIndex,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
            trigger: "stagnation",
            signals: {
              stagnationCount,
              lastContextUrl,
            },
          });
          if (
            stagnationReview.shouldReplan &&
            stagnationReview.steps.length > 0
          ) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const nextSteps = stagnationReview.steps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = stagnationReview.meta?.taskType ?? taskType;
            replanCount += 1;
            stagnationCount = 0;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: "stagnation",
              plannerMeta: stagnationReview.meta ?? null,
              hierarchy: stagnationReview.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(stagnationReview.meta, "stagnation");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (
          taskType === "extract_info" &&
          completedCount >= 2 &&
          completedCount !== lastExtractionCheckAt &&
          replanCount < settings.maxReplanCalls &&
          "agentAuditLog" in prisma
        ) {
          lastExtractionCheckAt = completedCount;
          const extractionAudit = await prisma.agentAuditLog.findFirst({
            where: {
              runId: run.id,
              message: {
                in: ["Extracted product names.", "Extracted emails."],
              },
            },
            select: { id: true },
          });
          if (!extractionAudit) {
            const extractionContext = await getBrowserContextSummary(run.id);
            const extractionReview = await buildAdaptivePlanReview({
              prompt: run.prompt,
              memory: memoryContext,
              model: plannerModel,
              browserContext: extractionContext,
              currentPlan: planSteps,
              completedIndex: stepIndex,
              runId: run.id,
              maxSteps: settings.maxSteps,
              maxStepAttempts: settings.maxStepAttempts,
              trigger: "missing-extraction",
              signals: {
                completedCount,
                lastContextUrl,
              },
            });
            if (
              extractionReview.shouldReplan &&
              extractionReview.steps.length > 0
            ) {
              const nextIndex = stepIndex + 1;
              const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
              const nextSteps = extractionReview.steps.slice(0, remainingSlots);
              planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
              taskType = extractionReview.meta?.taskType ?? taskType;
              replanCount += 1;
              await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
                type: "plan-replan",
                steps: planSteps,
                reason: "missing-extraction",
                plannerMeta: extractionReview.meta ?? null,
                hierarchy: extractionReview.hierarchy ?? null,
                stepId: step.id,
                activeStepId: step.id,
              });
              await logBranchAlternatives(
                extractionReview.meta,
                "missing-extraction"
              );
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[nextIndex]?.id ?? null,
                lastError,
                taskType,
                approvalRequestedStepId,
                approvalGrantedStepId,
                summaryCheckpoint,
                settings,
                preferences,
              });
            }
          }
        }
        if (
          completedCount >= summaryInterval &&
          completedCount % summaryInterval === 0 &&
          completedCount !== summaryCheckpoint
        ) {
          const summaryContext = await getBrowserContextSummary(run.id);
          const summary = await summarizePlannerMemoryWithLLM({
            prompt: run.prompt,
            model: memorySummarizationModel,
            memory: memoryContext,
            steps: planSteps,
            browserContext: summaryContext,
            runId: run.id,
          });
          if (summary) {
            await addAgentMemory({
              runId: run.id,
              scope: "session",
              content: summary,
              metadata: { type: "planner-summary", completedCount },
            });
            memoryContext = [...memoryContext, summary].slice(-10);
            summaryCheckpoint = completedCount;
            await logAgentAudit(run.id, "info", "Planner summary saved.", {
              type: "planner-summary",
              completedCount,
              summary,
            });
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[stepIndex + 1]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (
          noContextCount >= 2 &&
          replanCount < settings.maxReplanCalls &&
          completedCount > 0
        ) {
          const noContextReview = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: plannerModel,
            browserContext: await getBrowserContextSummary(run.id),
            currentPlan: planSteps,
            completedIndex: stepIndex,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
            trigger: "no-browser-context",
            signals: {
              noContextCount,
              lastContextUrl,
            },
          });
          if (
            noContextReview.shouldReplan &&
            noContextReview.steps.length > 0
          ) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const nextSteps = noContextReview.steps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = noContextReview.meta?.taskType ?? taskType;
            replanCount += 1;
            noContextCount = 0;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: "no-browser-context",
              plannerMeta: noContextReview.meta ?? null,
              hierarchy: noContextReview.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(
              noContextReview.meta,
              "no-browser-context"
            );
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (
          completedCount >= midRunInterval &&
          completedCount % midRunInterval === 0 &&
          replanCount < settings.maxReplanCalls
        ) {
          const adaptContext = await getBrowserContextSummary(run.id);
          const adaptResult = await buildMidRunAdaptationWithLLM({
            prompt: run.prompt,
            model: plannerModel,
            memory: memoryContext,
            steps: planSteps,
            browserContext: adaptContext,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
          });
          if (adaptResult.shouldReplan && adaptResult.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: loopGuardModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: adaptResult.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = adaptResult.meta?.taskType ?? taskType;
            replanCount += 1;
            await logAgentAudit(run.id, "warning", "Plan adapted mid-run.", {
              type: "plan-adapt",
              steps: planSteps,
              reason: adaptResult.reason,
              plannerMeta: adaptResult.meta ?? null,
              hierarchy: adaptResult.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(adaptResult.meta, "mid-run-adapt");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (selfCheckCount < settings.maxSelfChecks) {
          const selfCheckContext = await getBrowserContextSummary(run.id);
          const selfCheck = await buildSelfCheckReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: selfCheckModel,
            browserContext: selfCheckContext,
            step,
            stepIndex,
            lastError,
            taskType,
            completedCount,
            previousUrl,
            lastContextUrl,
            stagnationCount,
            noContextCount,
            replanCount,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
          });
          selfCheckCount += 1;
          await logAgentAudit(run.id, "info", "Self-check completed.", {
            type: "self-check",
            stepId: step.id,
            stepTitle: step.title,
            action: selfCheck.action,
            reason: selfCheck.reason,
            notes: selfCheck.notes,
            questions: selfCheck.questions,
            evidence: selfCheck.evidence,
            confidence: selfCheck.confidence,
            missingInfo: selfCheck.missingInfo,
            blockers: selfCheck.blockers,
            hypotheses: selfCheck.hypotheses,
            verificationSteps: selfCheck.verificationSteps,
            toolSwitch: selfCheck.toolSwitch,
            abortSignals: selfCheck.abortSignals,
            finishSignals: selfCheck.finishSignals,
          });
          if (selfCheck.action === "wait_human") {
            requiresHuman = true;
            lastError = selfCheck.reason ?? "Self-check requested human input.";
            break;
          }
          if (selfCheck.action === "replan" && selfCheck.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: loopGuardModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: selfCheck.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = selfCheck.meta?.taskType ?? taskType;
            await logAgentAudit(
              run.id,
              "warning",
              "Plan replaced by self-check.",
              {
                type: "self-check-replan",
                steps: planSteps,
                reason: selfCheck.reason,
                plannerMeta: selfCheck.meta ?? null,
                hierarchy: selfCheck.hierarchy ?? null,
                stepId: step.id,
                activeStepId: step.id,
              }
            );
            await logBranchAlternatives(selfCheck.meta, "self-check");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (
          previousUrl &&
          lastContextUrl &&
          lastContextUrl !== previousUrl &&
          replanCount < settings.maxReplanCalls
        ) {
          const shiftContext = await getBrowserContextSummary(run.id);
          const shiftReview = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: plannerModel,
            browserContext: shiftContext,
            currentPlan: planSteps,
            completedIndex: stepIndex,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
            trigger: "context-shift",
            signals: {
              previousUrl,
              lastContextUrl,
            },
          });
          if (shiftReview.shouldReplan && shiftReview.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const nextSteps = shiftReview.steps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = shiftReview.meta?.taskType ?? taskType;
            replanCount += 1;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: "context-shift",
              plannerMeta: shiftReview.meta ?? null,
              hierarchy: shiftReview.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(shiftReview.meta, "context-shift");
            if (memoryKey) {
              await addProblemSolutionMemory({
                memoryKey,
                runId: run.id,
                problem: "Context shifted (URL changed).",
                countermeasure: "Replanned after context shift.",
                context: {
                  stepId: step.id,
                  stepTitle: step.title,
                  reason: "context-shift",
                },
                tags: ["context-shift"],
                model: memoryValidationModel ?? resolvedModel,
                summaryModel: memorySummarizationModel ?? resolvedModel,
                prompt: run.prompt,
              });
            }
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        if (
          shouldEvaluateReplan(
            stepIndex,
            planSteps,
            settings.replanEverySteps
          ) &&
          replanCount < settings.maxReplanCalls
        ) {
          const reviewContext = await getBrowserContextSummary(run.id);
          const reviewResult = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: plannerModel,
            browserContext: reviewContext,
            currentPlan: planSteps,
            completedIndex: stepIndex,
            runId: run.id,
            maxSteps: settings.maxSteps,
            maxStepAttempts: settings.maxStepAttempts,
            trigger: "scheduled-replan",
            signals: {
              completedCount,
              replanEverySteps: settings.replanEverySteps,
            },
          });
          if (reviewResult.shouldReplan && reviewResult.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: loopGuardModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: reviewResult.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = reviewResult.meta?.taskType ?? taskType;
            replanCount += 1;
            await logAgentAudit(run.id, "warning", "Plan re-evaluated.", {
              type: "plan-replan",
              steps: planSteps,
              reason: reviewResult.reason,
              plannerMeta: reviewResult.meta ?? null,
              hierarchy: reviewResult.hierarchy ?? null,
              stepId: step.id,
              activeStepId: step.id,
            });
            await logBranchAlternatives(reviewResult.meta, "scheduled-replan");
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
              summaryCheckpoint,
              settings,
              preferences,
            });
          }
        }
        stepIndex += 1;
      }

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

      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: {
          status: overallOk
            ? "completed"
            : requiresHuman
              ? "waiting_human"
              : "failed",
          requiresHumanIntervention: requiresHuman,
          finishedAt: new Date(),
          errorMessage: overallOk ? null : lastError,
          activeStepId: null,
          planState: buildCheckpointState({
            steps: planSteps,
            activeStepId: null,
            lastError,
            approvalRequestedStepId: null,
            approvalGrantedStepId: null,
            summaryCheckpoint,
            settings,
            preferences,
          }),
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Playwright tool ${overallOk ? "completed" : "failed"}.`,
          },
        },
      });
      const verificationContext = await getBrowserContextSummary(run.id);
      const verification = await verifyPlanWithLLM({
        prompt: run.prompt,
        model: plannerModel,
        memory: memoryContext,
        steps: planSteps,
        browserContext: verificationContext,
        runId: run.id,
      });
      const improvementReview = await buildSelfImprovementReviewWithLLM({
        prompt: run.prompt,
        model: memorySummarizationModel,
        memory: memoryContext,
        steps: planSteps,
        verification,
        taskType,
        lastError,
        browserContext: verificationContext,
        runId: run.id,
      });
      if (improvementReview) {
        await logAgentAudit(
          run.id,
          "info",
          "Self-improvement review completed.",
          {
            type: "self-improvement",
            summary: improvementReview.summary,
            mistakes: improvementReview.mistakes,
            improvements: improvementReview.improvements,
            guardrails: improvementReview.guardrails,
            toolAdjustments: improvementReview.toolAdjustments,
            confidence: improvementReview.confidence,
          }
        );
        await addAgentMemory({
          runId: run.id,
          scope: "session",
          content: [
            "Self-improvement review",
            improvementReview.summary,
            improvementReview.mistakes.length
              ? `Mistakes: ${improvementReview.mistakes.join(" | ")}`
              : null,
            improvementReview.improvements.length
              ? `Improvements: ${improvementReview.improvements.join(" | ")}`
              : null,
            improvementReview.guardrails.length
              ? `Guardrails: ${improvementReview.guardrails.join(" | ")}`
              : null,
            improvementReview.toolAdjustments.length
              ? `Tool tweaks: ${improvementReview.toolAdjustments.join(" | ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          metadata: {
            type: "self-improvement",
            confidence: improvementReview.confidence,
          },
        });
        if (memoryKey) {
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
            await logAgentAudit(
              run.id,
              "warning",
              "Long-term memory rejected.",
              {
                type: "memory-validation",
                model: memoryResult.validation.model,
                issues: memoryResult.validation.issues,
                reason: memoryResult.validation.reason,
                scope: "self-improvement",
              }
            );
          }
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
          lastError,
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
            planState: null,
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
