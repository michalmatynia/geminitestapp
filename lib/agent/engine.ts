import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { logAgentAudit } from "@/lib/agent/audit";
import {
  addAgentLongTermMemory,
  addAgentMemory,
  listAgentLongTermMemory,
  listAgentMemory,
} from "@/lib/agent/memory";
import { runAgentBrowserControl, runAgentTool } from "@/lib/agent/tools";

type AgentDecision = {
  action: "respond" | "tool" | "wait_human";
  reason: string;
  toolName?: string;
};

type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  tool?: "playwright" | "none";
  expectedObservation?: string | null;
  successCriteria?: string | null;
  goalId?: string | null;
  subgoalId?: string | null;
  phase?: "observe" | "act" | "verify" | "recover" | null;
  priority?: number | null;
  dependsOn?: string[] | null;
  attempts?: number;
  maxAttempts?: number;
  snapshotId?: string | null;
  logCount?: number | null;
};

type PlannerCritique = {
  assumptions?: string[];
  risks?: string[];
  unknowns?: string[];
  safetyChecks?: string[];
  questions?: string[];
};

type PlannerAlternative = {
  title: string;
  rationale?: string | null;
  steps: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
};

type PlannerMeta = {
  critique?: PlannerCritique | null;
  alternatives?: PlannerAlternative[] | null;
  safetyChecks?: string[];
  questions?: string[];
  taskType?: "web_task" | "extract_info";
  summary?: string | null;
  constraints?: string[];
  successSignals?: string[];
};

type AgentPlanSettings = {
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
};

type AgentPlanPreferences = {
  ignoreRobotsTxt?: boolean;
  requireHumanApproval?: boolean;
};

type AgentCheckpoint = {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
  updatedAt: string;
};

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const MAX_PLAN_STEPS = 12;
const MAX_STEP_ATTEMPTS = 2;
const MAX_REPLAN_CALLS = 2;
const REPLAN_EVERY_STEPS = 2;
const MAX_SELF_CHECKS = 4;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3-vl:30b";
const DEFAULT_AGENT_SETTINGS: AgentPlanSettings = {
  maxSteps: MAX_PLAN_STEPS,
  maxStepAttempts: MAX_STEP_ATTEMPTS,
  maxReplanCalls: MAX_REPLAN_CALLS,
  replanEverySteps: REPLAN_EVERY_STEPS,
  maxSelfChecks: MAX_SELF_CHECKS,
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
};

function resolveAgentPlanSettings(planState: unknown): AgentPlanSettings {
  const rawSettings =
    planState && typeof planState === "object"
      ? (planState as { settings?: Partial<AgentPlanSettings> }).settings
      : null;
  return {
    maxSteps: clampInt(rawSettings?.maxSteps, 1, 20, DEFAULT_AGENT_SETTINGS.maxSteps),
    maxStepAttempts: clampInt(
      rawSettings?.maxStepAttempts,
      1,
      5,
      DEFAULT_AGENT_SETTINGS.maxStepAttempts
    ),
    maxReplanCalls: clampInt(
      rawSettings?.maxReplanCalls,
      0,
      6,
      DEFAULT_AGENT_SETTINGS.maxReplanCalls
    ),
    replanEverySteps: clampInt(
      rawSettings?.replanEverySteps,
      1,
      10,
      DEFAULT_AGENT_SETTINGS.replanEverySteps
    ),
    maxSelfChecks: clampInt(
      rawSettings?.maxSelfChecks,
      0,
      8,
      DEFAULT_AGENT_SETTINGS.maxSelfChecks
    ),
  };
}

function resolveAgentPreferences(planState: unknown): AgentPlanPreferences {
  const rawPreferences =
    planState && typeof planState === "object"
      ? (planState as { preferences?: AgentPlanPreferences }).preferences
      : null;
  return {
    ignoreRobotsTxt: Boolean(rawPreferences?.ignoreRobotsTxt),
    requireHumanApproval: Boolean(rawPreferences?.requireHumanApproval),
  };
}

export async function runAgentControlLoop(runId: string) {
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
      longTermImprovementItems
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
      model: resolvedModel,
      memory: memoryContext,
      browserContext,
    });
    let planSteps: PlanStep[] = [];
    let taskType: PlannerMeta["taskType"] | null = null;
    let hasBrowserContext = Boolean(
      browserContext?.url && browserContext.url !== "about:blank"
    );
    const settings = resolveAgentPlanSettings(run.planState);
    const preferences = resolveAgentPreferences(run.planState);
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
        preferences.ignoreRobotsTxt = Boolean(checkpointPreferences.ignoreRobotsTxt);
      }
      if (checkpointPreferences?.requireHumanApproval !== undefined) {
        preferences.requireHumanApproval = Boolean(
          checkpointPreferences.requireHumanApproval
        );
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
          model: resolvedModel,
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
        model: resolvedModel,
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
          planResult.meta?.alternatives,
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
      let approvalRequestedStepId: string | null = checkpoint?.approvalRequestedStepId ?? null;
      let approvalGrantedStepId: string | null = checkpoint?.approvalGrantedStepId ?? null;
      let checkpointBriefStepId: string | null = checkpoint?.checkpointStepId ?? null;
      let checkpointBriefError: string | null = checkpoint?.lastError ?? null;
      const midRunInterval = 3;
      let stagnationCount = 0;
      let noContextCount = 0;
      let lastStableUrl = lastContextUrl;
      let lastExtractionCheckAt = 0;
      let loopGuardCooldown = 0;
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
          model: resolvedModel,
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
          meta?.alternatives,
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
        if (
          preferences.requireHumanApproval &&
          requiresHumanApproval(step, run.prompt) &&
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
          });
          return;
        }
        const attempts = (step.attempts ?? 0) + 1;
        planSteps = planSteps.map((item) =>
          item.id === step.id
            ? { ...item, status: "running", attempts }
            : item
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
              model: resolvedModel,
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

        const shouldInitializeBrowser =
          !hasBrowserContext || stepIndex === 0;
        const previousUrl = lastContextUrl;
        const shouldRunExtraction = isExtractionStep(step, run.prompt, taskType);
        const toolPrompt = appendTaskTypeToPrompt(
          run.prompt,
          shouldRunExtraction ? "extract_info" : taskType
        );
        const toolResult =
          shouldInitializeBrowser || shouldRunExtraction
            ? await runAgentTool({
                name: "playwright",
                input: {
                  prompt: toolPrompt,
                  browser: run.agentBrowser || "chromium",
                  runId: run.id,
                  runHeadless: run.runHeadless,
                  stepId: step.id,
                  stepLabel: step.title,
                },
              })
            : await runAgentBrowserControl({
                runId: run.id,
                action: "snapshot",
                stepId: step.id,
                stepLabel: step.title,
              });

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
                snapshotId:
                  (toolResult.output?.snapshotId as string | null | undefined) ??
                  null,
                logCount:
                  (toolResult.output?.logCount as number | null | undefined) ??
                  null,
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
            ? planSteps[stepIndex + 1]?.id ?? null
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
          toolResult.ok ? planSteps[stepIndex + 1]?.id ?? null : step.id
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
        if (
          loopSignal &&
          loopGuardCooldown === 0 &&
          replanCount < settings.maxReplanCalls
        ) {
          const loopContext = await getBrowserContextSummary(run.id);
          const loopReview = await buildLoopGuardReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: resolvedModel,
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
          });
          if (loopReview.action === "wait_human") {
            requiresHuman = true;
            lastError = loopReview.reason ?? "Loop guard requested human input.";
            break;
          }
          if (loopReview.action === "replan" && loopReview.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
            const guardedSteps = await guardRepetitionWithLLM({
              prompt: run.prompt,
              model: resolvedModel,
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

        if (!toolResult.ok) {
          if (attempts < (step.maxAttempts ?? settings.maxStepAttempts)) {
            if (branchedStepIds.has(step.id)) {
              break;
            }
            const replanBrowserContext = await getBrowserContextSummary(run.id);
            await logAgentAudit(run.id, "warning", "Planner context prepared.", {
              type: "planner-context",
              reason: "replan-after-failure",
              prompt: run.prompt,
              model: resolvedModel,
              memory: memoryContext,
              browserContext: replanBrowserContext,
              lastError,
              previousPlan: planSteps.map((item) => ({
                id: item.id,
                title: item.title,
                status: item.status,
                tool: item.tool,
              })),
            });
            const branchResult = await buildPlanWithLLM({
              prompt: run.prompt,
              memory: memoryContext,
              model: resolvedModel,
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
              model: resolvedModel,
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
          if (consecutiveFailures >= 2 && replanCount < settings.maxReplanCalls) {
            const failureContext = await getBrowserContextSummary(run.id);
            const deadEndReview = await buildAdaptivePlanReview({
              prompt: run.prompt,
              memory: memoryContext,
              model: resolvedModel,
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
            model: resolvedModel,
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
          if (stagnationReview.shouldReplan && stagnationReview.steps.length > 0) {
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
              message: { in: ["Extracted product names.", "Extracted emails."] },
            },
            select: { id: true },
          });
          if (!extractionAudit) {
            const extractionContext = await getBrowserContextSummary(run.id);
            const extractionReview = await buildAdaptivePlanReview({
              prompt: run.prompt,
              memory: memoryContext,
              model: resolvedModel,
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
            if (extractionReview.shouldReplan && extractionReview.steps.length > 0) {
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
            model: resolvedModel,
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
            model: resolvedModel,
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
          if (noContextReview.shouldReplan && noContextReview.steps.length > 0) {
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
            model: resolvedModel,
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
              model: resolvedModel,
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
            model: resolvedModel,
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
              model: resolvedModel,
              memory: memoryContext,
              currentPlan: planSteps,
              candidateSteps: selfCheck.steps,
              runId: run.id,
              maxSteps: remainingSlots,
            });
            const nextSteps = guardedSteps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = selfCheck.meta?.taskType ?? taskType;
            await logAgentAudit(run.id, "warning", "Plan replaced by self-check.", {
              type: "self-check-replan",
              steps: planSteps,
              reason: selfCheck.reason,
              plannerMeta: selfCheck.meta ?? null,
              hierarchy: selfCheck.hierarchy ?? null,
            });
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
            model: resolvedModel,
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
          shouldEvaluateReplan(stepIndex, planSteps, settings.replanEverySteps) &&
          replanCount < settings.maxReplanCalls
        ) {
          const reviewContext = await getBrowserContextSummary(run.id);
          const reviewResult = await buildAdaptivePlanReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: resolvedModel,
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
              model: resolvedModel,
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
            });
            await logBranchAlternatives(
              reviewResult.meta,
              "scheduled-replan"
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
        stepIndex += 1;
      }

      if (planSteps.length === 0) {
        const toolResult = await runAgentTool({
          name: "playwright",
          input: {
            prompt: appendTaskTypeToPrompt(run.prompt, taskType),
            browser: run.agentBrowser || "chromium",
            runId: run.id,
            runHeadless: run.runHeadless,
          },
        });
        overallOk = toolResult.ok;
        lastError = toolResult.ok ? null : toolResult.error || "Tool failed.";
      }

      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: {
          status: overallOk ? "completed" : requiresHuman ? "waiting_human" : "failed",
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
        model: resolvedModel,
        memory: memoryContext,
        steps: planSteps,
        browserContext: verificationContext,
        runId: run.id,
      });
      const improvementReview = await buildSelfImprovementReviewWithLLM({
        prompt: run.prompt,
        model: resolvedModel,
        memory: memoryContext,
        steps: planSteps,
        verification,
        taskType,
        lastError,
        browserContext: verificationContext,
        runId: run.id,
      });
      if (improvementReview) {
        await logAgentAudit(run.id, "info", "Self-improvement review completed.", {
          type: "self-improvement",
          summary: improvementReview.summary,
          mistakes: improvementReview.mistakes,
          improvements: improvementReview.improvements,
          guardrails: improvementReview.guardrails,
          toolAdjustments: improvementReview.toolAdjustments,
          confidence: improvementReview.confidence,
        });
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
        await addAgentLongTermMemory({
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
              ? reminderList("Tool adjustments", improvementReview.toolAdjustments)
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
          verification?.verdict ? `Verification: ${verification.verdict}` : null,
          extractionSummary?.extractionType
            ? `Extraction: ${extractionSummary.extractionType} (${extractionSummary.extractedCount ?? 0})`
            : null,
        ].filter(Boolean);
        const summary = summaryLines.join(" · ");
        await addAgentLongTermMemory({
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
            verification?.followUp ? `Follow-up: ${verification.followUp}` : null,
            extractionSummary?.items?.length
              ? `Sample items: ${extractionSummary.items.join(" | ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          summary,
          tags: ["agent-run", overallOk ? "completed" : "failed"],
          metadata: {
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
        });
      }
      await logAgentAudit(
        run.id,
        overallOk ? "info" : requiresHuman ? "warning" : "error",
        "Playwright tool finished.",
        {
          result: overallOk ? "completed" : requiresHuman ? "waiting_human" : "failed",
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
      console.error("[chatbot][agent][engine] Failed", { runId, errorId, error });
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
  }
}

function parseCheckpoint(payload: unknown): AgentCheckpoint | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Partial<AgentCheckpoint>;
  if (!Array.isArray(raw.steps)) return null;
  return {
    steps: raw.steps as PlanStep[],
    activeStepId: raw.activeStepId ?? null,
    lastError: raw.lastError ?? null,
    taskType: raw.taskType ?? null,
    resumeRequestedAt: raw.resumeRequestedAt ?? null,
    resumeProcessedAt: raw.resumeProcessedAt ?? null,
    approvalRequestedStepId:
      typeof raw.approvalRequestedStepId === "string"
        ? raw.approvalRequestedStepId
        : null,
    approvalGrantedStepId:
      typeof raw.approvalGrantedStepId === "string"
        ? raw.approvalGrantedStepId
        : null,
    checkpointBrief:
      typeof raw.checkpointBrief === "string" ? raw.checkpointBrief : null,
    checkpointNextActions: Array.isArray(raw.checkpointNextActions)
      ? (raw.checkpointNextActions as string[])
      : null,
    checkpointRisks: Array.isArray(raw.checkpointRisks)
      ? (raw.checkpointRisks as string[])
      : null,
    checkpointStepId:
      typeof raw.checkpointStepId === "string" ? raw.checkpointStepId : null,
    checkpointCreatedAt:
      typeof raw.checkpointCreatedAt === "string" ? raw.checkpointCreatedAt : null,
    summaryCheckpoint:
      typeof raw.summaryCheckpoint === "number" ? raw.summaryCheckpoint : null,
    settings: raw.settings ?? null,
    preferences: raw.preferences ?? null,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function buildCheckpointState(payload: {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
}) {
  return {
    steps: payload.steps,
    activeStepId: payload.activeStepId,
    lastError: payload.lastError ?? null,
    taskType: payload.taskType ?? null,
    resumeRequestedAt: payload.resumeRequestedAt ?? null,
    resumeProcessedAt: payload.resumeProcessedAt ?? null,
    approvalRequestedStepId: payload.approvalRequestedStepId ?? null,
    approvalGrantedStepId: payload.approvalGrantedStepId ?? null,
    checkpointBrief: payload.checkpointBrief ?? null,
    checkpointNextActions: payload.checkpointNextActions ?? null,
    checkpointRisks: payload.checkpointRisks ?? null,
    checkpointStepId: payload.checkpointStepId ?? null,
    checkpointCreatedAt: payload.checkpointCreatedAt ?? null,
    summaryCheckpoint: payload.summaryCheckpoint ?? null,
    settings: payload.settings ?? null,
    preferences: payload.preferences ?? null,
    updatedAt: new Date().toISOString(),
  };
}

async function persistCheckpoint(payload: {
  runId: string;
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
}) {
  await prisma.chatbotAgentRun.update({
    where: { id: payload.runId },
    data: {
      planState: buildCheckpointState(payload),
      activeStepId: payload.activeStepId,
      checkpointedAt: new Date(),
    },
  });
  await logAgentAudit(payload.runId, "info", "Checkpoint saved.", {
    type: "checkpoint-save",
    activeStepId: payload.activeStepId,
    stepCount: payload.steps.length,
  });
}

function decideNextAction(prompt: string, memory: string[]): AgentDecision {
  const lower = prompt.toLowerCase();
  if (lower.includes("browse") || lower.includes("website")) {
    return {
      action: "tool",
      reason: "Prompt implies browser automation.",
      toolName: "playwright",
    };
  }
  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("signin")
  ) {
    return {
      action: "tool",
      reason: "Prompt includes a login flow.",
      toolName: "playwright",
    };
  }

  if (memory.length > 0) {
    return {
      action: "respond",
      reason: "Sufficient context to respond in scaffold.",
    };
  }

  return {
    action: "wait_human",
    reason: "Not enough context; human input required.",
  };
}

function buildPlan(prompt: string, maxSteps = MAX_PLAN_STEPS): string[] {
  const normalized = prompt.trim();
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  const steps: string[] = [];

  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("signin")
  ) {
    steps.push("Open the target website.");
    steps.push("Locate the sign-in form.");
    steps.push("Fill in the credentials.");
    steps.push("Submit the form and wait for the next page.");
    steps.push("Verify the expected page or account state.");
  } else if (lower.includes("browse") || lower.includes("website")) {
    steps.push("Open the target URL.");
    steps.push("Wait for the page to finish loading.");
    steps.push("Locate the requested content.");
    steps.push("Capture the relevant details.");
  } else {
    const sentences = normalized
      .split(/[.!?]\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      steps.push(sentence);
      if (steps.length >= maxSteps) break;
    }
  }

  return steps.slice(0, maxSteps);
}

async function buildPlanWithLLM({
  prompt,
  memory,
  model,
  previousPlan,
  lastError,
  runId,
  browserContext,
  mode = "plan",
  failedStep,
  maxSteps: maxStepsParam,
  maxStepAttempts: maxStepAttemptsParam,
}: {
  prompt: string;
  memory: string[];
  model: string;
  previousPlan?: PlanStep[];
  lastError?: string | null;
  runId?: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  mode?: "plan" | "branch";
  failedStep?: {
    id: string;
    title: string;
    expectedObservation?: string | null;
    successCriteria?: string | null;
  } | null;
  maxSteps?: number;
  maxStepAttempts?: number;
}): Promise<{
  steps: PlanStep[];
  decision: AgentDecision;
  source: "llm" | "heuristic";
  branchSteps?: PlanStep[];
  meta?: PlannerMeta;
  hierarchy?: {
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
  } | null;
}> {
  const maxSteps = Math.min(Math.max(maxStepsParam ?? MAX_PLAN_STEPS, 1), 20);
  const maxStepAttempts = clampInt(
    maxStepAttemptsParam ?? MAX_STEP_ATTEMPTS,
    1,
    5,
    MAX_STEP_ATTEMPTS
  );
  const fallbackPlanTitles = buildPlan(prompt, maxSteps);
  const fallbackSteps = fallbackPlanTitles.map((title) => ({
    id: randomUUID(),
    title,
    status: "pending" as const,
    tool: "playwright" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "act" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));

  try {
    const systemPrompt =
      mode === "branch"
        ? "You are an agent planner. Output only JSON with keys: decision, branchSteps, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Provide 1-4 alternate steps to recover from the failed step. tool is 'playwright' or 'none'."
        : `You are an agent planner. Output only JSON with keys: decision, goals, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. goals: array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Use 2-4 goals, 1-3 subgoals each, and max ${maxSteps} total steps. tool is 'playwright' or 'none'. If you cannot provide goals, you may include steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              previousPlan,
              lastError,
              browserContext,
              maxSteps,
              mode,
              failedStep,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Planner LLM failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content);
    if (!parsed) {
      throw new Error("Planner LLM returned invalid JSON.");
    }
    const meta = normalizePlannerMeta(parsed);
    let hierarchy = mode === "plan" ? normalizePlanHierarchy(parsed) : null;
    if (!hierarchy && mode === "plan" && Array.isArray(parsed.steps)) {
      const expanded = await expandHierarchyFromStepsWithLLM({
        prompt,
        model,
        memory,
        steps: parsed.steps,
        meta,
        runId,
      });
      if (expanded) {
        hierarchy = expanded;
      }
    }
    if (hierarchy) {
      const enriched = await enrichPlanHierarchyWithLLM({
        prompt,
        model,
        memory,
        hierarchy,
        meta,
        runId,
      });
      if (enriched) {
        hierarchy = enriched;
      }
    }
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps = buildPlanStepsFromSpecs(
      stepSpecs,
      meta,
      mode === "plan",
      maxStepAttempts
    ).slice(0, maxSteps);
    const dedupeResult = await dedupePlanStepsWithLLM({
      prompt,
      model,
      memory,
      steps,
      meta,
      runId,
      maxSteps,
      maxStepAttempts,
    });
    if (dedupeResult.length > 0) {
      steps = dedupeResult;
    }
    const initialGuarded = await guardRepetitionWithLLM({
      prompt,
      model,
      memory,
      currentPlan: steps,
      candidateSteps: steps,
      runId,
      maxSteps,
    });
    if (initialGuarded.length > 0) {
      steps = initialGuarded;
    }
    if (mode === "plan") {
      const evaluation = await evaluatePlanWithLLM({
        prompt,
        model,
        memory,
        steps,
        hierarchy,
        meta,
        runId,
        maxSteps,
        maxStepAttempts,
      });
      if (evaluation && evaluation.score < 70 && evaluation.revisedSteps.length) {
        steps = evaluation.revisedSteps;
      }
      const optimization = await optimizePlanWithLLM({
        prompt,
        model,
        memory,
        steps,
        hierarchy,
        meta,
        runId,
        maxSteps,
        maxStepAttempts,
      });
      if (optimization?.optimizedSteps?.length) {
        steps = optimization.optimizedSteps;
      }
    }
    const branchSpecs = (parsed.branchSteps ?? parsed.steps ?? []).slice(0, 4);
    const branchSteps = branchSpecs.map(
      (step: {
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
      }) => ({
        id: randomUUID(),
        title: step.title?.trim() || "Review the page state.",
        status: "pending" as const,
        tool: step.tool === "none" ? "none" : "playwright",
        expectedObservation: step.expectedObservation?.trim() || null,
        successCriteria: step.successCriteria?.trim() || null,
        attempts: 0,
        maxAttempts: maxStepAttempts,
      })
    );
    const fallbackBranchSteps = buildBranchStepsFromAlternatives(
      meta?.alternatives,
      maxStepAttempts,
      maxSteps
    );
    const decision = normalizeDecision(parsed.decision, steps, prompt, memory);
    return {
      steps: steps.length ? steps : fallbackSteps,
      decision,
      source: "llm",
      meta,
      hierarchy,
      branchSteps: branchSteps.length
        ? branchSteps
        : fallbackBranchSteps.length
          ? fallbackBranchSteps
          : undefined,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      steps: fallbackSteps,
      decision: decideNextAction(prompt, memory),
      source: "heuristic",
      meta: null,
    };
  }
}

function shouldEvaluateReplan(
  stepIndex: number,
  steps: PlanStep[],
  replanEverySteps: number
) {
  if (steps.length < 3) return false;
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) return false;
  return (nextIndex % replanEverySteps) === 0;
}

function appendTaskTypeToPrompt(
  prompt: string,
  taskType: PlannerMeta["taskType"] | null
) {
  if (!taskType) return prompt;
  return `${prompt}\n\nTask type: ${taskType}`;
}

async function buildAdaptivePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  runId,
  maxSteps,
  maxStepAttempts,
  trigger,
  signals,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
  trigger?: string;
  signals?: Record<string, unknown>;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent replanner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays. The user input includes trigger and signals fields; use them to focus the replan.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              trigger,
              signals,
              browserContext,
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner review failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          shouldReplan?: boolean;
          reason?: string;
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          critique?: PlannerCritique;
          alternatives?: PlannerAlternative[];
          summary?: string;
          constraints?: string[];
          successSignals?: string[];
          taskType?: string;
        }
      | null;
    if (!parsed) {
      throw new Error("Planner review returned invalid JSON.");
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
      : [];
    if (shouldReplan && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if (shouldReplan && steps.length === 0) {
      return { shouldReplan: false, reason: parsed.reason, steps: [] };
    }
    return {
      shouldReplan,
      reason: parsed.reason,
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner review fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldReplan: false, steps: [] };
  }
}

async function buildSelfCheckReview({
  prompt,
  memory,
  model,
  browserContext,
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
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  step: PlanStep;
  stepIndex: number;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  completedCount?: number;
  previousUrl?: string | null;
  lastContextUrl?: string | null;
  stagnationCount?: number;
  noContextCount?: number;
  replanCount?: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  action: "continue" | "replan" | "wait_human";
  reason?: string;
  notes?: string;
  questions?: string[];
  evidence?: string[];
  confidence?: number;
  missingInfo?: string[];
  blockers?: string[];
  hypotheses?: string[];
  verificationSteps?: string[];
  toolSwitch?: string;
  abortSignals?: string[];
  finishSignals?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent self-checker. Output only JSON with keys: action, reason, notes, questions, evidence, confidence, missingInfo, blockers, hypotheses, verificationSteps, toolSwitch, abortSignals, finishSignals, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is 'continue', 'replan', or 'wait_human'. Provide 5-8 self-questions that test assumptions, evidence quality, tool choice, and completion criteria. evidence is a list of observable facts from the context. confidence is 0-100. If action is 'replan', include goals (planner schema with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. toolSwitch is a short suggestion like 'use search' or 'use playwright'. abortSignals are conditions that should stop the run. finishSignals are conditions that indicate the goal is satisfied. summary is a short plan summary. constraints and successSignals are arrays.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              taskType,
              lastError,
              completedCount,
              previousUrl,
              lastContextUrl,
              stagnationCount,
              noContextCount,
              replanCount,
              step: {
                id: step.id,
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              },
              stepIndex,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Self-check failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          action?: string;
          reason?: string;
          notes?: string;
          questions?: string[];
          evidence?: string[];
          confidence?: number;
          missingInfo?: string[];
          blockers?: string[];
          hypotheses?: string[];
          verificationSteps?: string[];
          toolSwitch?: string;
          abortSignals?: string[];
          finishSignals?: string[];
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          critique?: PlannerCritique;
          alternatives?: PlannerAlternative[];
          summary?: string;
          constraints?: string[];
          successSignals?: string[];
          taskType?: string;
        }
      | null;
    if (!parsed) {
      throw new Error("Self-check returned invalid JSON.");
    }
    const action =
      parsed.action === "replan" || parsed.action === "wait_human"
        ? parsed.action
        : "continue";
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps =
      action === "replan"
        ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
            0,
            maxSteps
          )
        : [];
    if (action === "replan" && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    return {
      action,
      reason: parsed.reason,
      notes: parsed.notes,
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      missingInfo: normalizeStringList(parsed.missingInfo),
      blockers: normalizeStringList(parsed.blockers),
      hypotheses: normalizeStringList(parsed.hypotheses),
      verificationSteps: normalizeStringList(parsed.verificationSteps),
      toolSwitch:
        typeof parsed.toolSwitch === "string" ? parsed.toolSwitch.trim() : undefined,
      abortSignals: normalizeStringList(parsed.abortSignals),
      finishSignals: normalizeStringList(parsed.finishSignals),
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Self-check fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { action: "continue", steps: [] };
  }
}

type LoopSignal = {
  reason: string;
  pattern: string;
  titles: string[];
  urls: Array<string | null>;
  statuses: Array<PlanStep["status"]>;
};

const detectLoopPattern = (
  recent: Array<{
    title: string;
    status: PlanStep["status"];
    tool?: string | null;
    url: string | null;
  }>
): LoopSignal | null => {
  if (recent.length < 3) return null;
  const lastThree = recent.slice(-3);
  const lastFour = recent.slice(-4);
  const titlesThree = lastThree.map((item) => item.title);
  const titlesFour = lastFour.map((item) => item.title);
  const urlsThree = lastThree.map((item) => item.url);
  const statusesThree = lastThree.map((item) => item.status);
  const sameTitle =
    new Set(titlesThree.map((title) => title.toLowerCase())).size === 1;
  if (sameTitle) {
    return {
      reason: "Repeated the same step multiple times.",
      pattern: "repeat-same-step",
      titles: titlesThree,
      urls: urlsThree,
      statuses: statusesThree,
    };
  }
  if (lastFour.length === 4) {
    const [a, b, c, d] = titlesFour.map((title) => title.toLowerCase());
    if (a === c && b === d && a !== b) {
      return {
        reason: "Alternating between the same two steps.",
        pattern: "alternate-two-steps",
        titles: titlesFour,
        urls: lastFour.map((item) => item.url),
        statuses: lastFour.map((item) => item.status),
      };
    }
  }
  const stableUrl =
    urlsThree[0] &&
    urlsThree.every((url) => url && url === urlsThree[0]) &&
    statusesThree.filter((status) => status === "failed").length >= 2;
  if (stableUrl) {
    return {
      reason: "Repeated failures on the same URL.",
      pattern: "same-url-failures",
      titles: titlesThree,
      urls: urlsThree,
      statuses: statusesThree,
    };
  }
  return null;
};

async function buildLoopGuardReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  loopSignal,
  lastError,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  loopSignal: LoopSignal;
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  action: "continue" | "replan" | "wait_human";
  reason?: string;
  questions?: string[];
  evidence?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a loop-guard. Output only JSON with keys: action, reason, questions, evidence, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is 'continue', 'replan', or 'wait_human'. Provide 2-4 questions that test whether the agent is looping. If action is 'replan', include goals (planner schema) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              lastError,
              loopSignal,
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Loop guard failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          action?: string;
          reason?: string;
          questions?: string[];
          evidence?: string[];
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          taskType?: string;
        }
      | null;
    if (!parsed) return { action: "continue", steps: [] };
    const action =
      parsed.action === "replan" || parsed.action === "wait_human"
        ? parsed.action
        : "continue";
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps =
      action === "replan"
        ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
            0,
            maxSteps
          )
        : [];
    if (action === "replan" && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Loop guard completed.",
          metadata: {
            action,
            reason: parsed.reason ?? null,
            loop: loopSignal,
          },
        },
      });
    }
    return {
      action,
      reason: parsed.reason,
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Loop guard failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { action: "continue", steps: [] };
  }
}

async function buildResumePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  activeStepId,
  lastError,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  summary?: string | null;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent resume planner. Output only JSON with keys: shouldReplan, reason, summary, goals, critique, alternatives, taskType, constraints, successSignals. shouldReplan is boolean. summary is a short resume briefing. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. constraints and successSignals are arrays.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              activeStepId,
              lastError,
              currentPlan: currentPlan.map((step) => ({
                id: step.id,
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Resume planner failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          shouldReplan?: boolean;
          reason?: string;
          summary?: string;
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          critique?: PlannerCritique;
          alternatives?: PlannerAlternative[];
          summary?: string;
          constraints?: string[];
          successSignals?: string[];
          taskType?: string;
        }
      | null;
    if (!parsed) {
      throw new Error("Resume planner returned invalid JSON.");
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const steps = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
      : [];
    return {
      shouldReplan,
      reason: parsed.reason,
      summary: parsed.summary?.trim() || null,
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Resume planner fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldReplan: false, steps: [] };
  }
}

function parsePlanJson(content: string) {
  if (!content) return null;
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : content;
  const match = raw.match(/\{[\s\S]*\}$/);
  const jsonText = match ? match[0] : raw;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizePlannerMeta(parsed: {
  critique?: PlannerCritique;
  selfCritique?: PlannerCritique;
  alternatives?: PlannerAlternative[];
  safetyChecks?: string[];
  questions?: string[];
  taskType?: string;
  summary?: string;
  constraints?: string[];
  successSignals?: string[];
}) {
  const critique = normalizeCritique(parsed.critique ?? parsed.selfCritique);
  const safetyChecks = normalizeStringList(parsed.safetyChecks);
  const questions = normalizeStringList(parsed.questions);
  const normalizedSafetyChecks = [
    ...new Set([
      ...(critique?.safetyChecks ?? []),
      ...(safetyChecks ?? []),
    ]),
  ];
  const normalizedQuestions = [
    ...new Set([...(critique?.questions ?? []), ...(questions ?? [])]),
  ];
  const alternatives = normalizeAlternatives(parsed.alternatives);
  const taskType = normalizeTaskType(parsed.taskType);
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : null;
  const constraints = normalizeStringList(parsed.constraints);
  const successSignals = normalizeStringList(parsed.successSignals);
  return {
    critique,
    alternatives,
    safetyChecks: normalizedSafetyChecks.length ? normalizedSafetyChecks : undefined,
    questions: normalizedQuestions.length ? normalizedQuestions : undefined,
    taskType,
    summary: summary || undefined,
    constraints: constraints.length ? constraints : undefined,
    successSignals: successSignals.length ? successSignals : undefined,
  } satisfies PlannerMeta;
}

function normalizeCritique(value?: PlannerCritique | null) {
  if (!value) return null;
  const assumptions = normalizeStringList(value.assumptions);
  const risks = normalizeStringList(value.risks);
  const unknowns = normalizeStringList(value.unknowns);
  const safetyChecks = normalizeStringList(value.safetyChecks);
  const questions = normalizeStringList(value.questions);
  const hasAny =
    assumptions.length ||
    risks.length ||
    unknowns.length ||
    safetyChecks.length ||
    questions.length;
  if (!hasAny) return null;
  return {
    assumptions: assumptions.length ? assumptions : undefined,
    risks: risks.length ? risks : undefined,
    unknowns: unknowns.length ? unknowns : undefined,
    safetyChecks: safetyChecks.length ? safetyChecks : undefined,
    questions: questions.length ? questions : undefined,
  } satisfies PlannerCritique;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAlternatives(value: unknown) {
  if (!Array.isArray(value)) return null;
  const alternatives = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const typed = entry as PlannerAlternative;
      const title = typeof typed.title === "string" ? typed.title.trim() : "";
      const steps = Array.isArray(typed.steps) ? typed.steps : [];
      if (!title || steps.length === 0) return null;
      return {
        title,
        rationale:
          typeof typed.rationale === "string" ? typed.rationale.trim() : null,
        steps,
      } satisfies PlannerAlternative;
    })
    .filter(Boolean) as PlannerAlternative[];
  return alternatives.length ? alternatives : null;
}

function normalizeTaskType(value: unknown) {
  if (value === "web_task" || value === "extract_info") return value;
  return undefined;
}

function buildSafetyCheckSteps(
  meta?: PlannerMeta,
  maxStepAttempts = MAX_STEP_ATTEMPTS
) {
  const checks = [
    ...(meta?.safetyChecks ?? []),
    ...(meta?.critique?.safetyChecks ?? []),
  ]
    .map((check) => check.trim())
    .filter(Boolean);
  if (checks.length === 0) return [];
  const limited = checks.slice(0, 3);
  return limited.map((check) => ({
    id: randomUUID(),
    title: `Safety check: ${check}`,
    status: "pending" as const,
    tool: "none" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "observe" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

function buildVerificationSteps(
  meta?: PlannerMeta,
  maxStepAttempts = MAX_STEP_ATTEMPTS
) {
  const signals = meta?.successSignals ?? [];
  if (signals.length === 0) return [];
  const limited = signals.slice(0, 3);
  return limited.map((signal) => ({
    id: randomUUID(),
    title: `Verify: ${signal}`,
    status: "pending" as const,
    tool: "none" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "verify" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

function buildPlanStepsFromSpecs(
  stepSpecs: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
    goalId?: string | null;
    subgoalId?: string | null;
  }>,
  meta?: PlannerMeta | null,
  includeSafety = false,
  maxStepAttempts = MAX_STEP_ATTEMPTS
) {
  const preflightSteps = includeSafety
    ? buildSafetyCheckSteps(meta ?? undefined, maxStepAttempts)
    : [];
  const plannedSteps = stepSpecs.map((step, index) => ({
    id: randomUUID(),
    title: step.title?.trim() || "Review the page state.",
    status: "pending" as const,
    tool: step.tool === "none" ? "none" : "playwright",
    expectedObservation: step.expectedObservation?.trim() || null,
    successCriteria: step.successCriteria?.trim() || null,
    goalId: step.goalId ?? null,
    subgoalId: step.subgoalId ?? null,
    phase: normalizePhase(step.phase),
    priority: typeof step.priority === "number" ? step.priority : null,
    dependsOn: normalizeDependencies(step.dependsOn, stepSpecs),
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
  const verificationSteps = includeSafety
    ? buildVerificationSteps(meta ?? undefined, maxStepAttempts)
    : [];
  return [...preflightSteps, ...plannedSteps, ...verificationSteps];
}

function buildBranchStepsFromAlternatives(
  alternatives: PlannerAlternative[] | undefined,
  maxStepAttempts: number,
  maxSteps: number
) {
  if (!alternatives?.length) return [];
  const specs = alternatives.flatMap((alt) => {
    if (alt.steps?.length) {
      return alt.steps.map((step) => ({
        ...step,
        phase: step.phase ?? "recover",
      }));
    }
    if (alt.title?.trim()) {
      return [
        {
          title: alt.title.trim(),
          tool: "playwright",
          phase: "recover",
        },
      ];
    }
    return [];
  });
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(specs, null, true, maxStepAttempts).slice(
    0,
    maxSteps
  );
}

function normalizePhase(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "observe") return "observe";
  if (normalized === "act") return "act";
  if (normalized === "verify") return "verify";
  if (normalized === "recover") return "recover";
  return null;
}

function normalizeDependencies(
  value: number[] | string[] | undefined,
  stepSpecs: Array<{ title?: string }>
) {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (typeof value[0] === "number") {
    return (value as number[])
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < stepSpecs.length)
      .map((idx) => `step-${idx}`);
  }
  if (typeof value[0] === "string") {
    const names = value as string[];
    return names
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const found = stepSpecs.findIndex(
          (spec) => spec.title?.trim().toLowerCase() === name.toLowerCase()
        );
        return found >= 0 ? `step-${found}` : null;
      })
      .filter(Boolean) as string[];
  }
  return null;
}

function normalizePlanHierarchy(parsed: {
  goals?: Array<{
    title?: string;
    successCriteria?: string;
    priority?: number;
    dependsOn?: number[] | string[];
    subgoals?: Array<{
      title?: string;
      successCriteria?: string;
      priority?: number;
      dependsOn?: number[] | string[];
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
    }>;
  }>;
}) {
  if (!Array.isArray(parsed.goals) || parsed.goals.length === 0) {
    return null;
  }
  const goals = parsed.goals.map((goal) => {
    const goalId = randomUUID();
    const subgoals = Array.isArray(goal.subgoals) ? goal.subgoals : [];
    return {
      id: goalId,
      title: goal.title?.trim() || "Primary objective",
      successCriteria: goal.successCriteria?.trim() || null,
      priority: typeof goal.priority === "number" ? goal.priority : null,
      dependsOn: Array.isArray(goal.dependsOn) ? goal.dependsOn : null,
      subgoals: subgoals.map((subgoal) => {
        const subgoalId = randomUUID();
        const steps = Array.isArray(subgoal.steps) ? subgoal.steps : [];
        return {
          id: subgoalId,
          title: subgoal.title?.trim() || "Supporting task",
          successCriteria: subgoal.successCriteria?.trim() || null,
          priority: typeof subgoal.priority === "number" ? subgoal.priority : null,
          dependsOn: Array.isArray(subgoal.dependsOn) ? subgoal.dependsOn : null,
          steps: steps.map((step) => ({
            title: step.title?.trim() || "Review the page state.",
            tool: step.tool === "none" ? "none" : "playwright",
            expectedObservation: step.expectedObservation?.trim() || null,
            successCriteria: step.successCriteria?.trim() || null,
            phase: step.phase ?? null,
            priority: step.priority ?? null,
            dependsOn: step.dependsOn ?? null,
          })),
        };
      }),
    };
  });
  return { goals };
}

function flattenPlanHierarchy(hierarchy: {
  goals: Array<{
    id: string;
    title: string;
    successCriteria?: string | null;
    priority?: number | null;
    dependsOn?: number[] | string[] | null;
    subgoals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
      priority?: number | null;
      dependsOn?: number[] | string[] | null;
      steps: Array<{
        title: string;
        tool?: "playwright" | "none";
        expectedObservation?: string | null;
        successCriteria?: string | null;
        phase?: string | null;
        priority?: number | null;
        dependsOn?: number[] | string[] | null;
      }>;
    }>;
  }>;
}) {
  const steps: Array<{
    title: string;
    tool?: "playwright" | "none";
    expectedObservation?: string | null;
    successCriteria?: string | null;
    phase?: string | null;
    priority?: number | null;
    dependsOn?: number[] | string[] | null;
    goalId?: string | null;
    subgoalId?: string | null;
  }> = [];
  for (const goal of hierarchy.goals) {
    for (const subgoal of goal.subgoals) {
      for (const step of subgoal.steps) {
        const priority =
          typeof step.priority === "number"
            ? step.priority
            : typeof subgoal.priority === "number"
              ? subgoal.priority
              : typeof goal.priority === "number"
                ? goal.priority
                : null;
        steps.push({
          ...step,
          priority,
          goalId: goal.id,
          subgoalId: subgoal.id,
        });
      }
    }
  }
  return steps;
}

function normalizeDecision(
  decision: Partial<AgentDecision> | undefined,
  steps: PlanStep[],
  prompt: string,
  memory: string[]
): AgentDecision {
  if (decision?.action === "tool") {
    return {
      action: "tool",
      reason: decision.reason ?? "LLM planner selected tool execution.",
      toolName: decision.toolName ?? "playwright",
    };
  }
  if (decision?.action === "respond") {
    return {
      action: "respond",
      reason: decision.reason ?? "LLM planner selected response.",
    };
  }
  if (decision?.action === "wait_human") {
    return {
      action: "wait_human",
      reason: decision.reason ?? "LLM planner requires human input.",
    };
  }
  if (steps.length > 0) {
    return {
      action: "tool",
      reason: "Plan generated; execute tool steps.",
      toolName: "playwright",
    };
  }
  return decideNextAction(prompt, memory);
}

function isExtractionStep(
  step: PlanStep,
  prompt: string,
  taskType: PlannerMeta["taskType"] | null
) {
  if (taskType === "extract_info") return true;
  const combined = `${step.title} ${step.expectedObservation ?? ""} ${prompt}`.toLowerCase();
  const mentionsExtract = /(extract|collect|find|list|get)\b/.test(combined);
  const mentionsTarget = /(product|email)/.test(combined);
  return mentionsExtract && mentionsTarget;
}

function reminderList(label: string, items: string[]) {
  if (!items.length) return null;
  return `${label}: ${items.join(" | ")}`;
}

function buildSelfImprovementPlaybook(
  items: Array<{
    summary?: string | null;
    content?: string;
    metadata?: Record<string, unknown> | null;
  }>
) {
  if (!items.length) return null;
  const collect = (values: unknown) =>
    Array.isArray(values)
      ? values
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const mistakes = new Set<string>();
  const improvements = new Set<string>();
  const guardrails = new Set<string>();
  const toolAdjustments = new Set<string>();
  const summaries: string[] = [];
  for (const item of items) {
    if (item.summary) summaries.push(item.summary.trim());
    const meta = item.metadata ?? {};
    collect((meta as { mistakes?: unknown }).mistakes).forEach((entry) =>
      mistakes.add(entry)
    );
    collect((meta as { improvements?: unknown }).improvements).forEach((entry) =>
      improvements.add(entry)
    );
    collect((meta as { guardrails?: unknown }).guardrails).forEach((entry) =>
      guardrails.add(entry)
    );
    collect((meta as { toolAdjustments?: unknown }).toolAdjustments).forEach(
      (entry) => toolAdjustments.add(entry)
    );
  }
  const lines = [
    summaries.length
      ? `Recent learning: ${summaries.slice(0, 2).join(" | ")}`
      : null,
    mistakes.size
      ? `Avoid: ${Array.from(mistakes).slice(0, 4).join(" | ")}`
      : null,
    improvements.size
      ? `Improve: ${Array.from(improvements).slice(0, 4).join(" | ")}`
      : null,
    guardrails.size
      ? `Guardrails: ${Array.from(guardrails).slice(0, 4).join(" | ")}`
      : null,
    toolAdjustments.size
      ? `Tool tweaks: ${Array.from(toolAdjustments).slice(0, 3).join(" | ")}`
      : null,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return `Self-improvement playbook:\n${lines.join("\n")}`;
}

function requiresHumanApproval(step: PlanStep, prompt: string) {
  if (step.tool === "none") return false;
  const text = `${step.title} ${prompt}`.toLowerCase();
  return /login|log in|sign in|signup|register|checkout|purchase|pay|payment|card|delete|remove|cancel|unsubscribe|transfer|withdraw|submit order|place order|invoice|billing|confirm|approve|admin/i.test(
    text
  );
}

async function addProblemSolutionMemory({
  memoryKey,
  runId,
  problem,
  countermeasure,
  context,
  tags = [],
}: {
  memoryKey: string;
  runId: string;
  problem: string;
  countermeasure: string;
  context?: Record<string, unknown>;
  tags?: string[];
}) {
  if (!memoryKey || !problem || !countermeasure) return;
  const summary = `Problem: ${problem} · Countermeasure: ${countermeasure}`;
  await addAgentLongTermMemory({
    memoryKey,
    runId,
    content: summary,
    summary,
    tags: ["problem-solution", ...tags],
    metadata: {
      problem,
      countermeasure,
      ...context,
    },
    importance: 4,
  });
}

async function evaluatePlanWithLLM({
  prompt,
  model,
  memory,
  steps,
  hierarchy,
  meta,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy> | null;
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You evaluate plans. Return only JSON with keys: score (0-100), issues[], revisedGoals, revisedSteps. revisedGoals uses planner schema with goal/subgoal priority and dependsOn; revisedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
                priority: step.priority,
                dependsOn: step.dependsOn,
              })),
              hierarchy,
              meta,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner evaluation failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          score?: number;
          issues?: string[];
          revisedGoals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          revisedSteps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }
      | null;
    if (!parsed) return null;
    const score = typeof parsed.score === "number" ? parsed.score : 100;
    const revisedHierarchy = parsed.revisedGoals
      ? normalizePlanHierarchy({ goals: parsed.revisedGoals })
      : null;
    const revisedSpecs =
      revisedHierarchy && revisedHierarchy.goals.length
        ? flattenPlanHierarchy(revisedHierarchy)
        : parsed.revisedSteps ?? [];
    const revisedSteps = revisedSpecs.length
      ? buildPlanStepsFromSpecs(
          revisedSpecs,
          meta,
          true,
          maxStepAttempts
        ).slice(0, maxSteps)
      : [];
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan evaluated.",
          metadata: {
            score,
            issues: parsed.issues ?? [],
            revisedSteps: revisedSteps.map((step) => ({
              title: step.title,
              tool: step.tool,
              phase: step.phase,
            })),
          },
        },
      });
    }
    return { score, revisedSteps };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan evaluation failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function verifyPlanWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}) {
  if (steps.length === 0) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You verify task completion. Return only JSON with keys: verdict ('pass'|'partial'|'fail'), evidence[], missing[], followUp. Evidence must reference observable facts from the context.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                status: step.status,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
              })),
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan verification failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          verdict?: "pass" | "partial" | "fail";
          evidence?: string[];
          missing?: string[];
          followUp?: string;
        }
      | null;
    if (!parsed) return null;
    const verdict =
      parsed.verdict === "pass" || parsed.verdict === "partial"
        ? parsed.verdict
        : "fail";
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: verdict === "pass" ? "info" : "warning",
          message: "Plan verification completed.",
          metadata: {
            verdict,
            evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
            missing: Array.isArray(parsed.missing) ? parsed.missing : [],
            followUp: parsed.followUp ?? null,
          },
        },
      });
    }
    return parsed;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan verification failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function buildSelfImprovementReviewWithLLM({
  prompt,
  model,
  memory,
  steps,
  verification,
  taskType,
  lastError,
  browserContext,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  verification?: { verdict?: string; evidence?: string[]; missing?: string[] } | null;
  taskType?: string | null;
  lastError?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are an agent self-improvement reviewer. Return only JSON with keys: summary, mistakes, improvements, guardrails, toolAdjustments, confidence. summary is a 1-2 sentence learning summary. mistakes, improvements, guardrails, toolAdjustments are short bullet strings. confidence is 0-100.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                status: step.status,
                phase: step.phase,
                successCriteria: step.successCriteria,
              })),
              taskType,
              lastError,
              verification,
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Self-improvement review failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          summary?: string;
          mistakes?: string[];
          improvements?: string[];
          guardrails?: string[];
          toolAdjustments?: string[];
          confidence?: number;
        }
      | null;
    if (!parsed?.summary) return null;
    return {
      summary: parsed.summary.trim(),
      mistakes: normalizeStringList(parsed.mistakes),
      improvements: normalizeStringList(parsed.improvements),
      guardrails: normalizeStringList(parsed.guardrails),
      toolAdjustments: normalizeStringList(parsed.toolAdjustments),
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Self-improvement review failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function summarizePlannerMemoryWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You summarize progress for long-running plans. Return only JSON with keys: summary, keyDecisions[], risks[]. Keep summary under 80 words.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                status: step.status,
                phase: step.phase,
              })),
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner summary failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | { summary?: string; keyDecisions?: string[]; risks?: string[] }
      | null;
    if (!parsed?.summary) return null;
    const summary = parsed.summary.trim();
    const decisions = Array.isArray(parsed.keyDecisions)
      ? parsed.keyDecisions.filter((item) => typeof item === "string")
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item) => typeof item === "string")
      : [];
    const packed = [
      summary,
      decisions.length ? `Decisions: ${decisions.join(" | ")}` : null,
      risks.length ? `Risks: ${risks.join(" | ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Planner memory summary created.",
          metadata: {
            summary,
            keyDecisions: decisions,
            risks,
          },
        },
      });
    }
    return packed;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner summary failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function buildMidRunAdaptationWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You adapt plans mid-run. Return only JSON with keys: shouldReplan, reason, goals, taskType. goals uses planner schema with goal/subgoal priority and dependsOn; if shouldReplan is true, adjust steps to fit current context.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                status: step.status,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
              })),
              browserContext,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Mid-run adaptation failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          shouldReplan?: boolean;
          reason?: string;
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          taskType?: string;
        }
      | null;
    if (!parsed) return { shouldReplan: false, steps: [] };
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : [];
    const stepsResult = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
      : [];
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Mid-run adaptation evaluated.",
          metadata: {
            shouldReplan,
            reason: parsed.reason ?? null,
          },
        },
      });
    }
    return {
      shouldReplan,
      reason: parsed.reason,
      steps: stepsResult,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Mid-run adaptation failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldReplan: false, steps: [] };
  }
}

async function dedupePlanStepsWithLLM({
  prompt,
  model,
  memory,
  steps,
  meta,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}) {
  if (steps.length < 3) return steps;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You remove duplicate or redundant plan steps. Return only JSON with keys: steps. steps is an array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Keep order logical and avoid removing unique actions.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
                priority: step.priority,
                dependsOn: step.dependsOn,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan dedupe failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }
      | null;
    if (!parsed?.steps?.length) return steps;
    const dedupedSteps = buildPlanStepsFromSpecs(
      parsed.steps,
      meta,
      true,
      maxStepAttempts
    ).slice(0, maxSteps);
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan dedupe completed.",
          metadata: {
            beforeCount: steps.length,
            afterCount: dedupedSteps.length,
          },
        },
      });
    }
    return dedupedSteps;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan dedupe failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return steps;
  }
}

async function guardRepetitionWithLLM({
  prompt,
  model,
  memory,
  currentPlan,
  candidateSteps,
  runId,
  maxSteps,
}: {
  prompt: string;
  model: string;
  memory: string[];
  currentPlan: PlanStep[];
  candidateSteps: PlanStep[];
  runId?: string;
  maxSteps: number;
}) {
  if (candidateSteps.length < 2) return candidateSteps;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You remove unnecessary repetition from plan steps. Return only JSON with keys: steps. steps is an array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Remove duplicates or redundant steps already covered.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              recentSteps: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                phase: step.phase,
              })),
              candidateSteps: candidateSteps.map((step) => ({
                title: step.title,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
                priority: step.priority,
                dependsOn: step.dependsOn,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Repetition guard failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }
      | null;
    if (!parsed?.steps?.length) return candidateSteps;
    const guarded = buildPlanStepsFromSpecs(parsed.steps, null, true).slice(
      0,
      maxSteps
    );
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Repetition guard applied.",
          metadata: {
            beforeCount: candidateSteps.length,
            afterCount: guarded.length,
          },
        },
      });
    }
    return guarded;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Repetition guard failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return candidateSteps;
  }
}

async function buildCheckpointBriefWithLLM({
  prompt,
  model,
  memory,
  steps,
  activeStepId,
  lastError,
  browserContext,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You generate checkpoint briefs. Return only JSON with keys: summary, nextActions[], risks[]. summary should be 1-2 sentences. nextActions are concrete next steps.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              activeStepId,
              lastError,
              steps: steps.map((step) => ({
                id: step.id,
                title: step.title,
                status: step.status,
                phase: step.phase,
              })),
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Checkpoint brief failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | { summary?: string; nextActions?: string[]; risks?: string[] }
      | null;
    if (!parsed?.summary) return null;
    const summary = parsed.summary.trim();
    const nextActions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions.filter((item) => typeof item === "string")
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item) => typeof item === "string")
      : [];
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Checkpoint brief created.",
          metadata: {
            summary,
            nextActions,
            risks,
          },
        },
      });
    }
    return { summary, nextActions, risks };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Checkpoint brief failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function optimizePlanWithLLM({
  prompt,
  model,
  memory,
  steps,
  hierarchy,
  meta,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy> | null;
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}) {
  if (steps.length < 2) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You optimize action plans. Return only JSON with keys: reason, optimizedGoals, optimizedSteps. optimizedGoals uses planner schema with goal/subgoal priority and dependsOn; optimizedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Keep steps concise, remove redundancy, and preserve constraints.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
                title: step.title,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
                priority: step.priority,
                dependsOn: step.dependsOn,
              })),
              hierarchy,
              meta,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan optimization failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          reason?: string;
          optimizedGoals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
          optimizedSteps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }
      | null;
    if (!parsed) return null;
    const optimizedHierarchy = parsed.optimizedGoals
      ? normalizePlanHierarchy({ goals: parsed.optimizedGoals })
      : null;
    const optimizedSpecs =
      optimizedHierarchy && optimizedHierarchy.goals.length
        ? flattenPlanHierarchy(optimizedHierarchy)
        : parsed.optimizedSteps ?? [];
    const optimizedSteps = optimizedSpecs.length
      ? buildPlanStepsFromSpecs(
          optimizedSpecs,
          meta,
          true,
          maxStepAttempts
        ).slice(0, maxSteps)
      : [];
    if (optimizedSteps.length === 0) return null;
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan optimized.",
          metadata: {
            reason: parsed.reason ?? null,
            beforeCount: steps.length,
            afterCount: optimizedSteps.length,
            optimizedSteps: optimizedSteps.map((step) => ({
              title: step.title,
              tool: step.tool,
              phase: step.phase,
            })),
          },
        },
      });
    }
    return { optimizedSteps };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan optimization failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function enrichPlanHierarchyWithLLM({
  prompt,
  model,
  memory,
  hierarchy,
  meta,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy>;
  meta: PlannerMeta | null;
  runId?: string;
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You refine multi-goal plans. Return only JSON with key: goals. Each goal has title, successCriteria, priority, dependsOn, subgoals[{title, successCriteria, priority, dependsOn, steps[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]. Add dependencies where helpful, ensure each goal has 1-3 subgoals, and each subgoal has 1-4 steps. Make step order explicit.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              goals: hierarchy.goals,
              meta,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan hierarchy refinement failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
        }
      | null;
    if (!parsed?.goals?.length) return null;
    const enriched = normalizePlanHierarchy({ goals: parsed.goals });
    if (!enriched) return null;
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan hierarchy enriched.",
          metadata: {
            beforeGoals: hierarchy.goals.length,
            afterGoals: enriched.goals.length,
          },
        },
      });
    }
    return enriched;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan hierarchy refinement failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function expandHierarchyFromStepsWithLLM({
  prompt,
  model,
  memory,
  steps,
  meta,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
  meta: PlannerMeta | null;
  runId?: string;
}) {
  if (steps.length === 0) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You build a hierarchical plan from flat steps. Return only JSON with key: goals. Each goal has title, successCriteria, priority, dependsOn, subgoals[{title, successCriteria, priority, dependsOn, steps[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]. Use 2-4 goals and 1-3 subgoals each. Ensure every input step is represented.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps,
              meta,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan hierarchy expansion failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = payload?.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as
      | {
          goals?: Array<{
            title?: string;
            successCriteria?: string;
            priority?: number;
            dependsOn?: number[] | string[];
            subgoals?: Array<{
              title?: string;
              successCriteria?: string;
              priority?: number;
              dependsOn?: number[] | string[];
              steps?: Array<{
                title?: string;
                tool?: string;
                expectedObservation?: string;
                successCriteria?: string;
                phase?: string;
                priority?: number;
                dependsOn?: number[] | string[];
              }>;
            }>;
          }>;
        }
      | null;
    if (!parsed?.goals?.length) return null;
    const expanded = normalizePlanHierarchy({ goals: parsed.goals });
    if (!expanded) return null;
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan hierarchy expanded.",
          metadata: {
            stepCount: steps.length,
            goalCount: expanded.goals.length,
          },
        },
      });
    }
    return expanded;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan hierarchy expansion failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

async function getBrowserContextSummary(runId: string) {
  if (!("agentBrowserSnapshot" in prisma) || !("agentBrowserLog" in prisma)) {
    return null;
  }
  try {
    const snapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
      select: { url: true, title: true, domText: true },
    });
    if (!snapshot) return null;
    const logs = await prisma.agentBrowserLog.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { level: true, message: true },
    });
    const domTextSample = snapshot.domText?.slice(0, 4000) ?? "";
    let uiInventory: unknown = undefined;
    if ("agentAuditLog" in prisma) {
      const latestInventory = await prisma.agentAuditLog.findFirst({
        where: { runId, message: "Captured UI inventory." },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      });
      uiInventory = latestInventory?.metadata ?? undefined;
    }
    return {
      url: snapshot.url,
      title: snapshot.title,
      domTextSample,
      logs: logs.reverse(),
      uiInventory,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Failed to load browser context", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
