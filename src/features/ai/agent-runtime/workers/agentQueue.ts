import 'server-only';

/**
 * AI Agent Runtime Queue
 * 
 * Background job queue for processing AI agent execution workflows.
 * Manages:
 * - Sequential agent run processing with concurrency control
 * - Automatic recovery of stuck or failed runs
 * - Brain assignment and resource allocation
 * - Error handling and retry logic
 * - Queue monitoring and health checks
 * 
 * This queue ensures reliable execution of AI agent workflows
 * while managing system resources and handling failures gracefully.
 */

import {
  processAgentRun,
  processNextQueuedAgentRun,
  recoverStuckRuns,
} from '@/features/ai/agent-runtime/workers/agent-processor';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { createManagedQueue } from '@/shared/lib/queue';
import type { RepeatableJobEntry } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

// Job data structure for agent processing
type AgentJobData = {
  runId: string; // Unique identifier for the agent run
  type?: 'run' | 'recovery'; // Job type for different processing modes
};

// Create managed queue with single concurrency to prevent resource conflicts
const queue = createManagedQueue<AgentJobData>({
  name: 'agent',
  concurrency: 1, // Process one agent at a time to manage resources
  defaultJobOptions: {
    attempts: 1, // Single attempt per job (recovery handled separately)
    removeOnComplete: true, // Clean up completed jobs
  },
  processor: async (data) => {
    if (data.type === 'recovery' || data.runId === '__recovery__') {
      await recoverStuckRuns();
      await processNextQueuedAgentRun();
      return;
    }
    await processAgentRun(data.runId);
  },
  onFailed: async (_jobId, err, data) => {
    const { ErrorSystem: LoggerSystem } = await import('@/shared/lib/observability/system-logger');
    await LoggerSystem.captureException(err, {
      service: 'agent-queue',
      runId: data.runId,
    });
  },
});

const AGENT_RECOVERY_REPEAT_EVERY_MS = 120_000;
const queueState = {
  workerStarted: false,
  recoveryJobRegistered: false,
};
let reconcileInFlight: Promise<void> | null = null;

const hasRepeatableQueueApi = (
  value: unknown
): value is {
  getRepeatableJobs: () => Promise<RepeatableJobEntry[]>;
  removeRepeatableByKey: (key: string) => Promise<void>;
} =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { getRepeatableJobs?: unknown }).getRepeatableJobs === 'function' &&
  typeof (value as { removeRepeatableByKey?: unknown }).removeRepeatableByKey === 'function';

const removeRecoveryRepeatJobs = async (): Promise<void> => {
  const queueApi = queue.getQueue();
  if (!hasRepeatableQueueApi(queueApi)) return;
  const repeatableJobs = await queueApi.getRepeatableJobs();
  const targets = repeatableJobs.filter(
    (job) =>
      job.id === 'agent-recovery' ||
      (job.name === 'agent' && job.every === AGENT_RECOVERY_REPEAT_EVERY_MS)
  );
  await Promise.all(targets.map(async (job) => queueApi.removeRepeatableByKey(job.key)));
};

const isAgentRuntimeEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('agent_runtime');
  return brain.enabled;
};

const stopAgentQueueInternal = async (): Promise<void> => {
  try {
    await removeRecoveryRepeatJobs();
  } catch (err) {
    await ErrorSystem.captureException(err, {
      service: 'agent-queue',
      action: 'removeRecoverySchedule',
    });
  }
  queueState.recoveryJobRegistered = false;
  if (!queueState.workerStarted) return;
  queueState.workerStarted = false;
  await queue.stopWorker();
};

export function startAgentQueue(): void {
  if (reconcileInFlight) return;
  reconcileInFlight = (async (): Promise<void> => {
    try {
      const enabled = await isAgentRuntimeEnabled();
      if (!enabled) {
        await stopAgentQueueInternal();
        return;
      }

      if (!queueState.workerStarted) {
        queue.startWorker();
        queueState.workerStarted = true;
      }

      if (!queueState.recoveryJobRegistered) {
        queueState.recoveryJobRegistered = true;
        await queue.enqueue(
          { runId: '__recovery__', type: 'recovery' },
          { repeat: { every: AGENT_RECOVERY_REPEAT_EVERY_MS }, jobId: 'agent-recovery' }
        );
      }
    } catch (err) {
      await ErrorSystem.captureException(err, {
        service: 'agent-queue',
        action: 'reconcileQueue',
      });
    }
  })().finally(() => {
    reconcileInFlight = null;
  });
}

export async function stopAgentQueue(): Promise<void> {
  try {
    await stopAgentQueueInternal();
  } catch (err) {
    await ErrorSystem.captureException(err, {
      service: 'agent-queue',
      action: 'stopWorker',
    });
  }
}

export async function enqueueAgentRun(runId: string): Promise<void> {
  await queue.enqueue({ runId, type: 'run' });
}
