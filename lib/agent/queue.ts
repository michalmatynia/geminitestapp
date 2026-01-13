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

const STUCK_RUN_THRESHOLD_MS = 10 * 60 * 1000;

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
    await recoverStuckRuns();
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

async function recoverStuckRuns() {
  if (!("chatbotAgentRun" in prisma)) return;
  const cutoff = new Date(Date.now() - STUCK_RUN_THRESHOLD_MS);
  const stuckRuns = await prisma.chatbotAgentRun.findMany({
    where: {
      status: "running",
      updatedAt: { lt: cutoff },
    },
    select: { id: true, planState: true },
  });
  if (stuckRuns.length === 0) return;
  for (const run of stuckRuns) {
    const resumePlanState =
      run.planState && typeof run.planState === "object"
        ? {
            ...(run.planState as Record<string, unknown>),
            resumeRequestedAt: new Date().toISOString(),
          }
        : { resumeRequestedAt: new Date().toISOString() };
    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status: "queued",
        requiresHumanIntervention: false,
        errorMessage: null,
        finishedAt: null,
        checkpointedAt: new Date(),
        planState: resumePlanState,
        logLines: {
          push: `[${new Date().toISOString()}] Auto-resume queued for stuck run.`,
        },
      },
    });
    await logAgentAudit(run.id, "warning", "Auto-resume queued for stuck run.", {
      reason: "stale-running",
      thresholdMs: STUCK_RUN_THRESHOLD_MS,
    });
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
