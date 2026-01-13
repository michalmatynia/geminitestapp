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
  attempts?: number;
  maxAttempts?: number;
  snapshotId?: string | null;
  logCount?: number | null;
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
    const planResult = await buildPlanWithLLM({
      prompt: run.prompt,
      memory: memoryContext,
      model: resolvedModel,
      browserContext,
    });

    let planSteps: PlanStep[] = planResult.steps;
    if (planSteps.length > 0) {
      await logAgentAudit(run.id, "info", "Plan created.", {
        type: "plan",
        steps: planSteps,
        source: planResult.source,
      });
    }
    let decision = planResult.decision;

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
      let stepIndex = 0;
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

        if (!toolResult.ok) {
          if (attempts < (step.maxAttempts ?? MAX_STEP_ATTEMPTS)) {
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
              });
              decision = replanResult.decision;
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
}): Promise<{
  steps: PlanStep[];
  decision: AgentDecision;
  source: "llm" | "heuristic";
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
              "You are an agent planner. Output only JSON with keys: decision, steps. decision: {action, reason, toolName}. steps: array of {title, tool, expectedObservation}. Use max 6 steps. tool is 'playwright' or 'none'.",
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
    const steps = (parsed.steps ?? [])
      .slice(0, MAX_PLAN_STEPS)
      .map((step: { title?: string; tool?: string; expectedObservation?: string }) => ({
        id: randomUUID(),
        title: step.title?.trim() || "Review the page state.",
        status: "pending" as const,
        tool: step.tool === "none" ? "none" : "playwright",
        expectedObservation: step.expectedObservation?.trim() || null,
        attempts: 0,
        maxAttempts: MAX_STEP_ATTEMPTS,
      }));
    const decision = normalizeDecision(parsed.decision, steps, prompt, memory);
    return { steps: steps.length ? steps : fallbackSteps, decision, source: "llm" };
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
