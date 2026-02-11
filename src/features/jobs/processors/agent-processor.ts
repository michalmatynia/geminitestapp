import 'server-only';

import { randomUUID } from 'crypto';

import { logAgentAudit, runAgentControlLoop } from '@/features/ai/agent-runtime/server';
import { ErrorSystem } from '@/features/observability/services/error-system';
import prisma from '@/shared/lib/db/prisma';

const STUCK_RUN_THRESHOLD_MS = 10 * 60 * 1000;

export async function processAgentRun(runId: string): Promise<void> {
  const debugEnabled = process.env['DEBUG_CHATBOT'] === 'true';

  if (!('chatbotAgentRun' in prisma)) {
    if (debugEnabled) {
      void ErrorSystem.logWarning('Agent tables not initialized.', { service: 'agent-processor' });
    }
    return;
  }

  const nextRun = await prisma.chatbotAgentRun.findFirst({
    where: { id: runId, status: { in: ['queued', 'running'] } },
  });

  if (!nextRun) return;

  if (nextRun.status === 'queued') {
    await prisma.chatbotAgentRun.update({
      where: { id: nextRun.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Started agent run.`,
        },
      },
    });
  }

  try {
    await runAgentControlLoop(nextRun.id);
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: 'agent-queue',
      runId: nextRun.id
    });
    await logAgentFailure(nextRun.id, error);
  }
}

export async function processNextQueuedAgentRun(): Promise<void> {
  if (!('chatbotAgentRun' in prisma)) return;

  await recoverStuckRuns();

  const nextRun = await prisma.chatbotAgentRun.findFirst({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
  });

  if (!nextRun) return;

  await processAgentRun(nextRun.id);
}

export async function recoverStuckRuns(): Promise<void> {
  if (!('chatbotAgentRun' in prisma)) return;
  const cutoff = new Date(Date.now() - STUCK_RUN_THRESHOLD_MS);
  const stuckRuns = await prisma.chatbotAgentRun.findMany({
    where: {
      status: 'running',
      updatedAt: { lt: cutoff },
    },
    select: { id: true, planState: true },
  });
  if (stuckRuns.length === 0) return;
  for (const run of stuckRuns) {
    const resumePlanState =
      run.planState && typeof run.planState === 'object'
        ? {
          ...(run.planState as Record<string, unknown>),
          resumeRequestedAt: new Date().toISOString(),
        }
        : { resumeRequestedAt: new Date().toISOString() };
    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status: 'queued',
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
    await logAgentAudit(run.id, 'warning', 'Auto-resume queued for stuck run.', {
      reason: 'stale-running',
      thresholdMs: STUCK_RUN_THRESHOLD_MS,
    });
  }
}

async function logAgentFailure(runId: string, error: unknown): Promise<void> {
  const errorId = randomUUID();
  await logAgentAudit(
    runId,
    'error',
    'Agent run failed while processing queue.',
    {
      errorId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  );
  await prisma.chatbotAgentRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      finishedAt: new Date(),
      logLines: {
        push: `[${new Date().toISOString()}] Agent failed (${errorId}).`,
      },
    },
  });
}
