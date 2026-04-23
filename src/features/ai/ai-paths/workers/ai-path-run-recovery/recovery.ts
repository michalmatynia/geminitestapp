import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  recoverStaleRunningRuns,
  recoverBlockedLeaseRuns,
} from '@/features/ai/ai-paths/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import {
  ORPHAN_QUEUED_RECOVERY_ENABLED,
  ORPHAN_QUEUED_RECOVERY_BATCH_SIZE,
  ORPHAN_QUEUED_RECOVERY_MIN_AGE_MS,
  LOG_SOURCE,
} from './config';
import { enqueuePathRunJob } from '@/features/ai/ai-paths/workers/ai-path-run-queue/queue';

const debugQueueLog = (message: string, context?: Record<string, unknown>) => {
    if (process.env['AI_PATHS_QUEUE_DEBUG'] === 'true') {
        // eslint-disable-next-line no-console
        console.log(`[aiPathRunQueue] ${message}`, context);
    }
};

export const runOrphanQueuedRecovery = async (): Promise<void> => {
  const repo = await getPathRunRepository();
  const queued = await repo.listRuns({
    statuses: ['queued'],
    limit: ORPHAN_QUEUED_RECOVERY_BATCH_SIZE,
    offset: 0,
    includeTotal: false,
  });
  const now = Date.now();
  let revivedCount = 0;

  for (const run of queued.runs) {
    const timestamp = run.updatedAt ?? run.createdAt ?? null;
    if (timestamp === null) continue;
    const updatedAtMs = Date.parse(timestamp);
    if (!Number.isFinite(updatedAtMs)) continue;
    if (now - updatedAtMs < ORPHAN_QUEUED_RECOVERY_MIN_AGE_MS) continue;
    try {
      await enqueuePathRunJob(run.id);
      revivedCount += 1;
    } catch (error: unknown) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const duplicateJob =
        message.includes('already exists') ||
        message.includes('jobid') ||
        message.includes('job id');
      if (duplicateJob) {
        continue;
      }
      void ErrorSystem.logWarning('Orphan queued run recovery enqueue failed', {
        service: 'ai-paths-queue',
        action: 'orphanQueuedRecovery',
        runId: run.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (revivedCount > 0) {
    debugQueueLog(`Recovery: revived ${revivedCount} orphan queued run(s)`, {
      revivedCount,
    });
    void ErrorSystem.logWarning(`Orphan queued recovery: revived ${revivedCount} run(s)`, {
      service: 'ai-paths-queue',
      action: 'orphanQueuedRecovery',
      revivedCount,
      minAgeMs: ORPHAN_QUEUED_RECOVERY_MIN_AGE_MS,
      batchSize: ORPHAN_QUEUED_RECOVERY_BATCH_SIZE,
    });
  }
};

export const runStaleRunRecovery = async (): Promise<void> => {
  const count = await recoverStaleRunningRuns({
    source: 'ai-paths-queue.stale-recovery',
  });
  if (count > 0) {
    debugQueueLog(`Recovery: marked ${count} stale running run(s) as failed`, { count });
    void ErrorSystem.logWarning(`Stale run recovery: marked ${count} run(s) as failed`, {
      service: 'ai-paths-queue',
      action: 'staleRunRecovery',
      count,
    });
  }

  const blockedLeaseRecoveryCount = await recoverBlockedLeaseRuns({
    source: 'ai-paths-queue.lease-recovery',
  });
  if (blockedLeaseRecoveryCount > 0) {
    debugQueueLog(`Recovery: moved ${blockedLeaseRecoveryCount} blocked lease run(s) to handoff`, {
      blockedLeaseRecoveryCount,
    });
    void ErrorSystem.logWarning(
      `Lease recovery: moved ${blockedLeaseRecoveryCount} blocked run(s) to handoff-ready`,
      {
        service: 'ai-paths-queue',
        action: 'blockedLeaseRecovery',
        blockedLeaseRecoveryCount,
      }
    );
  }
};

export const processStaleRunRecovery = async (): Promise<void> => {
  try {
    await runStaleRunRecovery();
    if (ORPHAN_QUEUED_RECOVERY_ENABLED) {
      await runOrphanQueuedRecovery();
    }
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Stale run recovery failed', {
      service: 'ai-paths-queue',
      action: 'staleRunRecovery',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
