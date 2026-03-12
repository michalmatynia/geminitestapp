import 'server-only';

import { randomUUID } from 'crypto';

import {
  type AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { logAgentAudit, runAgentControlLoop } from '@/features/ai/agent-runtime/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const STUCK_RUN_THRESHOLD_MS = 10 * 60 * 1000;
let hasLoggedMissingAgentRunSchema = false;

type QueueRunRecord = Pick<AgentRuntimeRunRecord, 'id' | 'status'>;
type StuckRunRecord = Pick<AgentRuntimeRunRecord, 'id' | 'planState'>;
type AgentRunStoreError = {
  code?: string;
};

const isMissingAgentRunStoreError = (error: unknown): error is AgentRunStoreError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 'P2021' || code === 'P2022';
};

const logMissingAgentRunSchemaOnce = (error: AgentRunStoreError): void => {
  if (hasLoggedMissingAgentRunSchema) {
    return;
  }

  hasLoggedMissingAgentRunSchema = true;
  void ErrorSystem.logWarning('Agent run storage not available; queue worker disabled.', {
    service: 'agent-queue',
    errorCode: error.code ?? 'UNKNOWN',
  });
};

const withAgentRunSchemaGuard = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isMissingAgentRunStoreError(error)) {
      logMissingAgentRunSchemaOnce(error);
      return fallback;
    }

    throw error;
  }
};

export async function processAgentRun(runId: string): Promise<void> {
  const debugEnabled = process.env['DEBUG_CHATBOT'] === 'true';
  const chatbotAgentRun = getChatbotAgentRunDelegate();

  if (!chatbotAgentRun) {
    if (debugEnabled) {
      void ErrorSystem.logWarning('Agent tables not initialized.', { service: 'agent-processor' });
    }
    return;
  }

  const nextRun = await withAgentRunSchemaGuard(
    async () =>
      await chatbotAgentRun.findFirst<QueueRunRecord>({
        where: { id: runId, status: { in: ['queued', 'running'] } },
      }),
    null
  );

  if (!nextRun) return;

  if (nextRun.status === 'queued') {
    const updatedQueuedRun = await withAgentRunSchemaGuard(
      async () =>
        await chatbotAgentRun.update({
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
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) return;

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
      await chatbotAgentRun.findFirst<QueueRunRecord>({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      }),
    null
  );

  if (!nextRun) return;

  await processAgentRun(nextRun.id);
}

export async function recoverStuckRuns(): Promise<void> {
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) return;
  const cutoff = new Date(Date.now() - STUCK_RUN_THRESHOLD_MS);
  const stuckRuns = await withAgentRunSchemaGuard(
    async () =>
      await chatbotAgentRun.findMany<StuckRunRecord>({
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
        await chatbotAgentRun.update({
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
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  await logAgentAudit(runId, 'error', 'Agent run failed while processing queue.', {
    errorId,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
  if (!chatbotAgentRun) return;
  await withAgentRunSchemaGuard(
    async () =>
      await chatbotAgentRun.update({
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
