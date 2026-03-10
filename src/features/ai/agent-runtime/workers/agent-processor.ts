import 'server-only';

import { randomUUID } from 'crypto';

import { logAgentAudit, runAgentControlLoop } from '@/features/ai/agent-runtime/server';
import prisma from '@/shared/lib/db/prisma';
import { Prisma } from '@/shared/lib/db/prisma-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const STUCK_RUN_THRESHOLD_MS = 10 * 60 * 1000;
let hasLoggedMissingAgentRunSchema = false;

const isPrismaMissingAgentRunSchemaError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const logMissingAgentRunSchemaOnce = (error: Prisma.PrismaClientKnownRequestError): void => {
  if (hasLoggedMissingAgentRunSchema) {
    return;
  }

  hasLoggedMissingAgentRunSchema = true;
  void ErrorSystem.logWarning('Agent run schema not available; queue worker disabled.', {
    service: 'agent-queue',
    errorCode: error.code,
  });
};

const withAgentRunSchemaGuard = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isPrismaMissingAgentRunSchemaError(error)) {
      logMissingAgentRunSchemaOnce(error);
      return fallback;
    }

    throw error;
  }
};

export async function processAgentRun(runId: string): Promise<void> {
  const debugEnabled = process.env['DEBUG_CHATBOT'] === 'true';

  if (!('chatbotAgentRun' in prisma)) {
    if (debugEnabled) {
      void ErrorSystem.logWarning('Agent tables not initialized.', { service: 'agent-processor' });
    }
    return;
  }

  const nextRun = await withAgentRunSchemaGuard(
    async () =>
      await prisma.chatbotAgentRun.findFirst({
        where: { id: runId, status: { in: ['queued', 'running'] } },
      }),
    null
  );

  if (!nextRun) return;

  if (nextRun.status === 'queued') {
    const updatedQueuedRun = await withAgentRunSchemaGuard(
      async () =>
        await prisma.chatbotAgentRun.update({
          where: { id: nextRun.id },
          data: {
            status: 'running',
            startedAt: new Date(),
            logLines: {
              push: `[${new Date().toISOString()}] Started agent run.`,
            },
          },
        }),
      null
    );
    if (!updatedQueuedRun) return;
  }

  try {
    await runAgentControlLoop(nextRun.id);
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: 'agent-queue',
      runId: nextRun.id,
    });
    await logAgentFailure(nextRun.id, error);
  }
}

export async function processNextQueuedAgentRun(): Promise<void> {
  if (!('chatbotAgentRun' in prisma)) return;

  const recovered = await withAgentRunSchemaGuard(
    async () => {
      await recoverStuckRuns();
      return true;
    },
    false
  );
  if (!recovered) return;

  const nextRun = await withAgentRunSchemaGuard(
    async () =>
      await prisma.chatbotAgentRun.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      }),
    null
  );

  if (!nextRun) return;

  await processAgentRun(nextRun.id);
}

export async function recoverStuckRuns(): Promise<void> {
  if (!('chatbotAgentRun' in prisma)) return;
  const cutoff = new Date(Date.now() - STUCK_RUN_THRESHOLD_MS);
  const stuckRuns = await withAgentRunSchemaGuard(
    async () =>
      await prisma.chatbotAgentRun.findMany({
        where: {
          status: 'running',
          updatedAt: { lt: cutoff },
        },
        select: { id: true, planState: true },
      }),
    []
  );
  if (stuckRuns.length === 0) return;
  for (const run of stuckRuns) {
    const resumePlanState =
      run.planState && typeof run.planState === 'object'
        ? {
          ...(run.planState as Record<string, unknown>),
          resumeRequestedAt: new Date().toISOString(),
        }
        : { resumeRequestedAt: new Date().toISOString() };
    const updatedRun = await withAgentRunSchemaGuard(
      async () =>
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
        }),
      null
    );
    if (!updatedRun) return;
    await logAgentAudit(run.id, 'warning', 'Auto-resume queued for stuck run.', {
      reason: 'stale-running',
      thresholdMs: STUCK_RUN_THRESHOLD_MS,
    });
  }
}

async function logAgentFailure(runId: string, error: unknown): Promise<void> {
  const errorId = randomUUID();
  await logAgentAudit(runId, 'error', 'Agent run failed while processing queue.', {
    errorId,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
  await withAgentRunSchemaGuard(
    async () =>
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
      }),
    null
  );
}
