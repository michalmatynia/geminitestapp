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
  attempts?: number;
  maxAttempts?: number;
  snapshotId?: string | null;
  logCount?: number | null;
};

type AgentCheckpoint = {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  updatedAt: string;
};

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const MAX_PLAN_STEPS = 6;
const MAX_STEP_ATTEMPTS = 2;
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
      if (checkpoint.activeStepId) {
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
      if (planSteps.length > 0) {
        await logAgentAudit(run.id, "info", "Plan created.", {
          type: "plan",
          steps: planSteps,
          source: planResult.source,
          hierarchy: planHierarchy,
        });
      }
      decision = planResult.decision;
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[0]?.id ?? null,
        lastError: null,
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

        const toolResult =
          stepIndex === 0
            ? await runAgentTool({
                name: "playwright",
                input: {
                  prompt: run.prompt,
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
              await logAgentAudit(run.id, "warning", "Plan created.", {
                type: "plan",
                steps: planSteps,
                source: replanResult.source,
                reason: "replan-after-failure",
                hierarchy: replanResult.hierarchy ?? null,
              });
              decision = replanResult.decision;
              await persistCheckpoint({
                runId: run.id,
                steps: planSteps,
                activeStepId: planSteps[0]?.id ?? null,
                lastError,
              });
              stepIndex = 0;
              overallOk = true;
              lastError = null;
              continue;
            }
          }
          break;
        }
        stepIndex += 1;
      }

      if (planSteps.length === 0) {
        const toolResult = await runAgentTool({
          name: "playwright",
          input: {
            prompt: run.prompt,
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
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function buildCheckpointState(payload: {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
}) {
  return {
    steps: payload.steps,
    activeStepId: payload.activeStepId,
    lastError: payload.lastError ?? null,
    updatedAt: new Date().toISOString(),
  };
}

async function persistCheckpoint(payload: {
  runId: string;
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
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
    attempts: 0,
    maxAttempts: MAX_STEP_ATTEMPTS,
  }));

  try {
    const systemPrompt =
      mode === "branch"
        ? "You are an agent planner. Output only JSON with keys: decision, branchSteps. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria}. Provide 1-4 alternate steps to recover from the failed step. tool is 'playwright' or 'none'."
        : "You are an agent planner. Output only JSON with keys: decision and goals. decision: {action, reason, toolName}. goals: array of {title, successCriteria, subgoals:[{title, successCriteria, steps:[{title, tool, expectedObservation, successCriteria}]}]}. Use max 6 total steps. tool is 'playwright' or 'none'. If you cannot provide goals, you may include steps: array of {title, tool, expectedObservation, successCriteria}.";

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
    const hierarchy = mode === "plan" ? normalizePlanHierarchy(parsed) : null;
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const steps = stepSpecs
      .slice(0, MAX_PLAN_STEPS)
      .map(
        (step: {
          title?: string;
          tool?: string;
          expectedObservation?: string;
          successCriteria?: string;
          goalId?: string | null;
          subgoalId?: string | null;
        }) => ({
          id: randomUUID(),
          title: step.title?.trim() || "Review the page state.",
          status: "pending" as const,
          tool: step.tool === "none" ? "none" : "playwright",
          expectedObservation: step.expectedObservation?.trim() || null,
          successCriteria: step.successCriteria?.trim() || null,
          goalId: step.goalId ?? null,
          subgoalId: step.subgoalId ?? null,
          attempts: 0,
          maxAttempts: MAX_STEP_ATTEMPTS,
        })
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
    };
  }
}

function parsePlanJson(content: string) {
  if (!content) return null;
  const match = content.match(/\{[\s\S]*\}$/);
  const jsonText = match ? match[0] : content;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
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
      }>;
    }>;
  }>;
}) {
  const steps: Array<{
    title: string;
    tool?: "playwright" | "none";
    expectedObservation?: string | null;
    successCriteria?: string | null;
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
