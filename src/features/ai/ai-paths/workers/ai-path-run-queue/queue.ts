import {
  recordRuntimeRunFinished,
  recordRuntimeRunStarted,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { processRun } from '@/features/ai/ai-paths/workers/ai-path-run-processor';
import { mutateAgentLease } from '@/shared/lib/agent-lease-service';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue } from '@/shared/lib/queue';

import {
  AI_PATH_RUN_QUEUE_NAME,
  DEFAULT_CONCURRENCY,
  JOB_EXECUTION_TIMEOUT_MS,
  LOG_SOURCE,
} from './config';
import { type AiPathRunJobData } from './types';
import { createDebugQueueLogger } from '../ai-path-run-queue-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';



const { log: debugQueueLog, warn: debugQueueWarn } = createDebugQueueLogger(
  LOG_SOURCE,
  process.env['AI_PATHS_QUEUE_DEBUG'] === 'true'
);

const AI_PATH_EXECUTION_LEASE_RESOURCE_ID = 'ai-paths.run.execution';
const AI_PATH_EXECUTION_LEASE_MS = Math.max(60_000, JOB_EXECUTION_TIMEOUT_MS || 0, 5 * 60 * 1000);

const resolveQueueWorkerAgentId = (): string => {
  const agentId = process.env['AI_AGENT_ID']?.trim() ??
                  process.env['CODEX_AGENT_ID']?.trim() ??
                  process.env['AGENT_ID']?.trim();
  return agentId !== null && agentId !== undefined && agentId !== '' ? agentId : `ai-path-run-queue-${process.pid}`;
};

export const enqueuePathRunJob = async (
  runId: string,
  options: { delayMs?: number } = {}
): Promise<void> => {
  await queue.enqueue({ runId }, { delay: options.delayMs, jobId: runId });
};

const jobTimeout = (typeof JOB_EXECUTION_TIMEOUT_MS === 'number' && JOB_EXECUTION_TIMEOUT_MS > 0) ? JOB_EXECUTION_TIMEOUT_MS : undefined;

const handleLease = async (
  runId: string,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>,
  ownerAgentId: string
): Promise<{ run: Awaited<ReturnType<typeof repo.claimRunForProcessing>>; leaseResult: ReturnType<typeof mutateAgentLease> } | null> => {
  const run = await repo.claimRunForProcessing(runId);
  if (run === null) {
    const latest = await repo.findRunById(runId);
    if (latest === null) {
      debugQueueWarn(`[aiPathRunQueue] Run ${runId} not found, skipping`);
      return null;
    }
    if (latest.status === 'running') {
      debugQueueLog(`[aiPathRunQueue] Run ${runId} is already running, skipping duplicate job`);
      return null;
    }
    debugQueueLog(`[aiPathRunQueue] Run ${runId} has status "${latest.status}", skipping`);
    return null;
  }
  
  const leaseResult = mutateAgentLease({
    action: 'claim',
    resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
    scopeId: run.id,
    ownerAgentId,
    ownerRunId: run.id,
    leaseMs: AI_PATH_EXECUTION_LEASE_MS,
  });

  return { run, leaseResult };
};

const handleBlockedLease = async (
  run: Awaited<ReturnType<typeof getPathRunRepository>> extends infer R ? R extends { claimRunForProcessing: (...args: any[]) => Promise<infer U> } ? U : never : never,
  leaseResult: ReturnType<typeof mutateAgentLease>,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>,
  ownerAgentId: string
): Promise<void> => {
      const failedAt = new Date();
      const failedAtIso = failedAt.toISOString();
      const conflictingLease = leaseResult.conflictingLease ?? null;
      const blockingOwnerAgentId = conflictingLease?.ownerAgentId ?? null;
      const failed = await repo.updateRunIfStatus(run.id, ['running'], {
        status: 'failed',
        finishedAt: failedAtIso,
        errorMessage: 'Run failed: execution lease is already owned by another worker.',
        meta: {
          ...(run.meta ?? {}),
          executionLeaseFailure: {
            resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
            scopeId: run.id,
            requestedBy: ownerAgentId,
            failedAt: failedAtIso,
            blockingOwnerAgentId,
            ownerAgentId: blockingOwnerAgentId,
            ownerRunId: conflictingLease?.ownerRunId ?? null,
            leaseId: conflictingLease?.leaseId ?? null,
            leaseMs: conflictingLease?.leaseMs ?? AI_PATH_EXECUTION_LEASE_MS,
            expiresAt: conflictingLease?.expiresAt ?? null,
            resultCode: leaseResult.code,
          },
        },
      });

      if (failed) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: 'Run failed because execution ownership could not be claimed.',
          metadata: {
            leaseResourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
            leaseScopeId: run.id,
            requestedBy: ownerAgentId,
            blockingOwnerAgentId,
            ownerRunId: conflictingLease?.ownerRunId ?? null,
            leaseExpiresAt: conflictingLease?.expiresAt ?? null,
            failedAt: failedAtIso,
          },
        });
        await recordRuntimeRunFinished({
          runId: run.id,
          status: 'failed',
          timestamp: failedAt,
          durationMs:
            typeof run.startedAt === 'string' && Number.isFinite(Date.parse(run.startedAt))
              ? Math.max(0, failedAt.getTime() - Date.parse(run.startedAt))
              : undefined,
        });
        void logSystemEvent({
          level: 'error',
          source: LOG_SOURCE,
          message: `AI-Paths run failed due to lease contention: ${run.pathName ?? run.pathId}`,
          context: {
            event: 'run.failed',
            runId: run.id,
            pathId: run.pathId,
            pathName: run.pathName,
            entityId: run.entityId,
            blockingOwnerAgentId,
          },
        });
      }
};

const runQueueJob = async (data: AiPathRunJobData, signal: AbortSignal): Promise<void> => {
    const repo = await getPathRunRepository();
    const ownerAgentId = resolveQueueWorkerAgentId();
    const result = await handleLease(data.runId, repo, ownerAgentId);
    if (result === null) return;
    
    const { run, leaseResult } = result;

    if (leaseResult.ok === false) {
      if (run !== null) {
        await handleBlockedLease(run, leaseResult, repo, ownerAgentId);
        debugQueueLog(
            `[aiPathRunQueue] Run ${data.runId} blocked on execution lease owned by ${leaseResult.conflictingLease?.ownerAgentId ?? 'unknown-owner'}`
        );
      }
      return;
    }

    try {
      if (run === null) throw new Error('Run is null');
      await recordRuntimeRunStarted({ runId: run.id });
      await processRun(run, signal);
    } finally {
      if (run !== null) {
        mutateAgentLease({
          action: 'release',
          resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
          scopeId: run.id,
          ownerAgentId,
          ownerRunId: run.id,
          leaseId: leaseResult.lease?.leaseId ?? undefined,
          reason: 'ai-path queue worker finished processing',
        });
      }
    }
};

export const queue = createManagedQueue<AiPathRunJobData>({
  name: AI_PATH_RUN_QUEUE_NAME,
  concurrency: Math.max(1, DEFAULT_CONCURRENCY),
  jobTimeoutMs: jobTimeout,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    stalledInterval: 30_000,
    maxStalledCount: 2,
  },
  processor: runQueueJob,
  onFailed: async (_jobId, err, data) => {
    try {
      const { ErrorSystem: LoggerSystem } = await import('@/shared/lib/observability/system-logger');
      void LoggerSystem.captureException(err, {
        service: LOG_SOURCE,
        runId: data.runId,
      });
    } catch (importError) {
      void ErrorSystem.captureException(importError);
      void logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: 'Fatal queue error',
        error: importError,
      });
    }
  },
});
