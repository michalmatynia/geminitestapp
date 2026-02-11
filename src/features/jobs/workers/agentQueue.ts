import 'server-only';

import { processAgentRun, processNextQueuedAgentRun, recoverStuckRuns } from '@/features/jobs/processors/agent-processor';
import { createManagedQueue } from '@/shared/lib/queue';

type AgentJobData = {
  runId: string;
  type?: 'run' | 'recovery';
};

const queue = createManagedQueue<AgentJobData>({
  name: 'agent',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
  },
  processor: async (data) => {
    if (data.type === 'recovery' || data.runId === '__recovery__') {
      await recoverStuckRuns();
      await processNextQueuedAgentRun();
      return;
    }
    await processAgentRun(data.runId);
  },
  onFailed: async (_jobId, error, data) => {
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'agent-queue',
        runId: data.runId,
      });
    } catch {
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[chatbot][agent][queue] Fatal queue error', error, { runId: data.runId });
    }
  },
});

export function startAgentQueue(): void {
  queue.startWorker();
  // Schedule stuck-run recovery as a repeatable job every 2 minutes
  void queue.enqueue(
    { runId: '__recovery__', type: 'recovery' },
    { repeat: { every: 120_000 }, jobId: 'agent-recovery' },
  );
}

export function stopAgentQueue(): void {
  void queue.stopWorker();
}

export async function enqueueAgentRun(runId: string): Promise<void> {
  await queue.enqueue({ runId, type: 'run' });
}
