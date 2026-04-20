import 'server-only';

import {
  processAgentRun,
  processNextQueuedAgentRun,
  recoverStuckRuns,
} from '@/features/ai/agent-runtime/workers/agent-processor';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { createManagedQueue } from '@/shared/lib/queue';
import type { RepeatableJobEntry } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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
  onFailed: async (_jobId, err, data) => {
    const { ErrorSystem: LoggerSystem } = await import('@/shared/lib/observability/system-logger');
    await LoggerSystem.captureException(err, {
      service: 'agent-queue',
      runId: data.runId,
    });
  },
});

const AGENT_RECOVERY_REPEAT_EVERY_MS = 120_000;
let workerStarted = false;
let recoveryJobRegistered = false;
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
  recoveryJobRegistered = false;
  if (!workerStarted) return;
  await queue.stopWorker();
  workerStarted = false;
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

      if (!workerStarted) {
        queue.startWorker();
        workerStarted = true;
      }

      if (recoveryJobRegistered) return;
      recoveryJobRegistered = true;
      await queue.enqueue(
        { runId: '__recovery__', type: 'recovery' },
        { repeat: { every: AGENT_RECOVERY_REPEAT_EVERY_MS }, jobId: 'agent-recovery' }
      );
    } catch (err) {
      recoveryJobRegistered = false;
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
