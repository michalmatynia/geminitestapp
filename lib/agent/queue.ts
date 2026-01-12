import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { runAgentControlLoop } from "@/lib/agent/engine";
import { logAgentAudit } from "@/lib/agent/audit";

type AgentQueueState = {
  running: boolean;
  timer: NodeJS.Timeout | null;
};

const globalState = globalThis as typeof globalThis & {
  __agentQueueState?: AgentQueueState;
};

const getState = (): AgentQueueState => {
  if (!globalState.__agentQueueState) {
    globalState.__agentQueueState = { running: false, timer: null };
  }
  return globalState.__agentQueueState;
};

export function startAgentQueue() {
  const state = getState();
  if (state.timer) return;
  state.timer = setInterval(() => {
    void processAgentQueue();
  }, 2000);
}

async function processAgentQueue() {
  const state = getState();
  if (state.running) return;
  state.running = true;
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  try {
    if (!("chatbotAgentRun" in prisma)) {
      if (debugEnabled) {
        console.warn("[chatbot][agent][queue] Agent tables not initialized.");
      }
      return;
    }
    const nextRun = await prisma.chatbotAgentRun.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });

    if (!nextRun) {
      return;
    }

    await prisma.chatbotAgentRun.update({
      where: { id: nextRun.id },
      data: {
        status: "running",
        startedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Started agent run.`,
        },
      },
    });

    try {
      await runAgentControlLoop(nextRun.id);
    } catch (error) {
      await logAgentFailure(nextRun.id, error);
    }
  } catch (error) {
    const errorId = randomUUID();
    if (debugEnabled) {
      console.error("[chatbot][agent][queue] Failed to process queue", {
        errorId,
        error,
      });
    }
  } finally {
    state.running = false;
  }
}

async function logAgentFailure(runId: string, error: unknown) {
  const errorId = randomUUID();
  await logAgentAudit(
    runId,
    "error",
    "Agent run failed while processing queue.",
    {
      errorId,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  );
  await prisma.chatbotAgentRun.update({
    where: { id: runId },
    data: {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      finishedAt: new Date(),
      logLines: {
        push: `[${new Date().toISOString()}] Agent failed (${errorId}).`,
      },
    },
  });
}
