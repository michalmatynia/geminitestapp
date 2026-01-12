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
  snapshotId?: string | null;
  logCount?: number | null;
};

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const MAX_PLAN_STEPS = 6;

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
    const planTitles = buildPlan(run.prompt);
    let planSteps: PlanStep[] = planTitles.map((title) => ({
      id: randomUUID(),
      title,
      status: "pending",
    }));
    if (planSteps.length > 0) {
      await logAgentAudit(run.id, "info", "Plan created.", {
        type: "plan",
        steps: planSteps,
      });
    }
    const decision = decideNextAction(
      run.prompt,
      memory.map((item) => item.content)
    );

    await logAgentAudit(run.id, "info", "Decision made.", decision);

    if (decision.action === "tool") {
      await logAgentAudit(run.id, "warning", "Tool execution queued.", {
        toolName: decision.toolName,
        reason: decision.reason,
      });

      let overallOk = true;
      let lastError: string | null = null;
      const stepsToRun = planSteps.length > 0 ? planSteps : [];

      for (const [index, step] of stepsToRun.entries()) {
        planSteps = planSteps.map((item) =>
          item.id === step.id ? { ...item, status: "running" } : item
        );
        await logAgentAudit(run.id, "info", "Plan updated.", {
          type: "plan-update",
          steps: planSteps,
          activeStepId: step.id,
        });

        const toolResult =
          index === 0
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
          break;
        }
      }

      if (stepsToRun.length === 0) {
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
          status: overallOk ? "completed" : "failed",
          requiresHumanIntervention: false,
          finishedAt: new Date(),
          errorMessage: overallOk ? null : lastError,
          logLines: {
            push: `[${new Date().toISOString()}] Playwright tool ${overallOk ? "completed" : "failed"}.`,
          },
        },
      });
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

  if (lower.includes("login") || lower.includes("sign in")) {
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
