import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";
import { addAgentMemory, listAgentMemory } from "@/lib/agent/memory";
import { runAgentTool } from "@/lib/agent/tools";

type AgentDecision = {
  action: "respond" | "tool" | "wait_human";
  reason: string;
  toolName?: string;
};

export async function runAgentControlLoop(runId: string) {
  const run = await prisma.chatbotAgentRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
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
  const decision = decideNextAction(run.prompt, memory.map((item) => item.content));

  await logAgentAudit(run.id, "info", "Decision made.", decision);

  if (decision.action === "tool") {
    await logAgentAudit(run.id, "warning", "Tool execution queued.", {
      toolName: decision.toolName,
      reason: decision.reason,
    });
    await runAgentTool({
      name: "playwright",
      input: { prompt: run.prompt, browser: run.agentBrowser || "chromium" },
    });
    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status: "waiting_human",
        requiresHumanIntervention: true,
        finishedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Awaiting tool approval (${decision.toolName}).`,
        },
      },
    });
    return;
  }

  if (decision.action === "respond") {
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
