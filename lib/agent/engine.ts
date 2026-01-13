import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { logAgentAudit } from "@/lib/agent/audit";
import { addAgentMemory, listAgentMemory } from "@/lib/agent/memory";
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

type AgentCheckpoint = {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
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
    await addAgentMemory({
      runId: run.id,
      scope: "session",
      content: run.prompt,
      metadata: { source: "user" },
    });

    const memory = await listAgentMemory({ runId: run.id, scope: "session" });
    const memoryContext = memory.map((item) => item.content).slice(-8);
    const resolvedModel = run.model || DEFAULT_OLLAMA_MODEL;
    const browserContext = await getBrowserContextSummary(run.id);
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
    if (checkpoint?.steps?.length) {
      planSteps = checkpoint.steps;
      taskType = checkpoint.taskType ?? null;
      let resumedWithNewPlan = false;
      if (checkpoint.resumeRequestedAt &&
        checkpoint.resumeRequestedAt !== checkpoint.resumeProcessedAt) {
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
      }
      decision = planResult.decision;
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[0]?.id ?? null,
        lastError: null,
        taskType,
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
      while (stepIndex < planSteps.length) {
        const step = planSteps[stepIndex];
        if (step.status === "completed") {
          stepIndex += 1;
          continue;
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
          continue;
        }

        const toolPrompt = appendTaskTypeToPrompt(run.prompt, taskType);
        const shouldInitializeBrowser =
          !hasBrowserContext || stepIndex === 0;
        const toolResult = shouldInitializeBrowser
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
        });

        if (!toolResult.ok) {
          if (attempts < (step.maxAttempts ?? MAX_STEP_ATTEMPTS)) {
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
              decision = replanResult.decision;
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[0]?.id ?? null,
                lastError,
                taskType,
              });
              stepIndex = 0;
              overallOk = true;
              lastError = null;
              continue;
            }
          }
          break;
        }
        if (selfCheckCount < MAX_SELF_CHECKS) {
          const selfCheckContext = await getBrowserContextSummary(run.id);
          const selfCheck = await buildSelfCheckReview({
            prompt: run.prompt,
            memory: memoryContext,
            model: resolvedModel,
            browserContext: selfCheckContext,
            step,
            stepIndex,
            runId: run.id,
          });
          selfCheckCount += 1;
          await logAgentAudit(run.id, "info", "Self-check completed.", {
            type: "self-check",
            stepId: step.id,
            stepTitle: step.title,
            action: selfCheck.action,
            reason: selfCheck.reason,
            notes: selfCheck.notes,
          });
          if (selfCheck.action === "wait_human") {
            requiresHuman = true;
            lastError = selfCheck.reason ?? "Self-check requested human input.";
            break;
          }
          if (selfCheck.action === "replan" && selfCheck.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, MAX_PLAN_STEPS - nextIndex);
            const nextSteps = selfCheck.steps.slice(0, remainingSlots);
            planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
            taskType = selfCheck.meta?.taskType ?? taskType;
            await logAgentAudit(run.id, "warning", "Plan replaced by self-check.", {
              type: "self-check-replan",
              steps: planSteps,
              reason: selfCheck.reason,
              plannerMeta: selfCheck.meta ?? null,
              hierarchy: selfCheck.hierarchy ?? null,
            });
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
            });
          }
        }
        if (
          shouldEvaluateReplan(stepIndex, planSteps) &&
          replanCount < MAX_REPLAN_CALLS
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
          });
          if (reviewResult.shouldReplan && reviewResult.steps.length > 0) {
            const nextIndex = stepIndex + 1;
            const remainingSlots = Math.max(1, MAX_PLAN_STEPS - nextIndex);
            const nextSteps = reviewResult.steps.slice(0, remainingSlots);
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
            await persistCheckpoint({
              runId: run.id,
              steps: planSteps,
              activeStepId: planSteps[nextIndex]?.id ?? null,
              lastError,
              taskType,
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
          }),
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Playwright tool ${overallOk ? "completed" : "failed"}.`,
          },
        },
      });
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
}) {
  return {
    steps: payload.steps,
    activeStepId: payload.activeStepId,
    lastError: payload.lastError ?? null,
    taskType: payload.taskType ?? null,
    resumeRequestedAt: payload.resumeRequestedAt ?? null,
    resumeProcessedAt: payload.resumeProcessedAt ?? null,
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

function buildPlan(prompt: string): string[] {
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
      if (steps.length >= MAX_PLAN_STEPS) break;
    }
  }

  return steps.slice(0, MAX_PLAN_STEPS);
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
  const fallbackPlanTitles = buildPlan(prompt);
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
    maxAttempts: MAX_STEP_ATTEMPTS,
  }));

  try {
    const systemPrompt =
      mode === "branch"
        ? "You are an agent planner. Output only JSON with keys: decision, branchSteps, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Provide 1-4 alternate steps to recover from the failed step. tool is 'playwright' or 'none'."
        : `You are an agent planner. Output only JSON with keys: decision, goals, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. goals: array of {title, successCriteria, subgoals:[{title, successCriteria, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Use max ${MAX_PLAN_STEPS} total steps. tool is 'playwright' or 'none'. If you cannot provide goals, you may include steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.`;

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
              maxSteps: MAX_PLAN_STEPS,
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
    const hierarchy = mode === "plan" ? normalizePlanHierarchy(parsed) : null;
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const steps = buildPlanStepsFromSpecs(stepSpecs, meta, mode === "plan").slice(
      0,
      MAX_PLAN_STEPS
    );
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
        maxAttempts: MAX_STEP_ATTEMPTS,
      })
    );
    const decision = normalizeDecision(parsed.decision, steps, prompt, memory);
    return {
      steps: steps.length ? steps : fallbackSteps,
      decision,
      source: "llm",
      meta,
      hierarchy,
      branchSteps: branchSteps.length ? branchSteps : undefined,
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

function shouldEvaluateReplan(stepIndex: number, steps: PlanStep[]) {
  if (steps.length < 3) return false;
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) return false;
  return (nextIndex % REPLAN_EVERY_STEPS) === 0;
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
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent replanner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays.";
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
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps: MAX_PLAN_STEPS,
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
    const steps = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true).slice(0, MAX_PLAN_STEPS)
      : [];
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
  runId,
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
  runId?: string;
}): Promise<{
  action: "continue" | "replan" | "wait_human";
  reason?: string;
  notes?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent self-checker. Output only JSON with keys: action, reason, notes, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is 'continue', 'replan', or 'wait_human'. If action is 'replan', include goals (planner schema) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. summary is a short plan summary. constraints and successSignals are arrays.";
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
              step: {
                id: step.id,
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              },
              stepIndex,
              maxSteps: MAX_PLAN_STEPS,
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
    const steps =
      action === "replan"
        ? buildPlanStepsFromSpecs(stepSpecs, meta, true).slice(0, MAX_PLAN_STEPS)
        : [];
    return {
      action,
      reason: parsed.reason,
      notes: parsed.notes,
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

async function buildResumePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  activeStepId,
  lastError,
  runId,
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
      "You are an agent resume planner. Output only JSON with keys: shouldReplan, reason, summary, goals, critique, alternatives, taskType, constraints, successSignals. shouldReplan is boolean. summary is a short resume briefing. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. constraints and successSignals are arrays.";
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
              maxSteps: MAX_PLAN_STEPS,
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
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true).slice(0, MAX_PLAN_STEPS)
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

function buildSafetyCheckSteps(meta?: PlannerMeta) {
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
    maxAttempts: MAX_STEP_ATTEMPTS,
  }));
}

function buildVerificationSteps(meta?: PlannerMeta) {
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
    maxAttempts: MAX_STEP_ATTEMPTS,
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
  includeSafety = false
) {
  const preflightSteps = includeSafety ? buildSafetyCheckSteps(meta ?? undefined) : [];
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
    maxAttempts: MAX_STEP_ATTEMPTS,
  }));
  const verificationSteps = includeSafety
    ? buildVerificationSteps(meta ?? undefined)
    : [];
  return [...preflightSteps, ...plannedSteps, ...verificationSteps];
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
      subgoals: subgoals.map((subgoal) => {
        const subgoalId = randomUUID();
        const steps = Array.isArray(subgoal.steps) ? subgoal.steps : [];
        return {
          id: subgoalId,
          title: subgoal.title?.trim() || "Supporting task",
          successCriteria: subgoal.successCriteria?.trim() || null,
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
    subgoals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
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
        steps.push({
          ...step,
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
