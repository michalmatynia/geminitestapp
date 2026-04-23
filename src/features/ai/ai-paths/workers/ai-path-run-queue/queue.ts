import {
  recordRuntimeRunBlockedOnLease,
  recordRuntimeRunStarted,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  processRun,
  processStaleRunRecovery,
} from '@/features/ai/ai-paths/workers/ai-path-run-processor';
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
      const blockedAt = new Date().toISOString();
      const conflictingLease = leaseResult.conflictingLease ?? null;
      const blockingOwnerAgentId = conflictingLease?.ownerAgentId ?? null;
      const blocked = await repo.updateRunIfStatus(run.id, ['running'], {
        status: 'blocked_on_lease',
        errorMessage: 'Run blocked on execution lease.',
        meta: {
          ...(run.meta ?? {}),
          executionLease: {
            resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
            scopeId: run.id,
            requestedBy: ownerAgentId,
            blockedAt,
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

      if (blocked) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'warn',
          message: 'Run blocked on execution lease.',
          metadata: {
            leaseResourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
            leaseScopeId: run.id,
            requestedBy: ownerAgentId,
            blockingOwnerAgentId,
            ownerRunId: conflictingLease?.ownerRunId ?? null,
            leaseExpiresAt: conflictingLease?.expiresAt ?? null,
            blockedAt,
          },
        });
        await recordRuntimeRunBlockedOnLease({
          runId: run.id,
          timestamp: blockedAt,
        });
      }
};

const runQueueJob = async (data: AiPathRunJobData, signal: AbortSignal): Promise<void> => {
    if (data.runId === '__recovery__' || data.type === 'recovery') {
      await processStaleRunRecovery();
      return;
    }

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
      const outcome = await processRun(run, signal);
      if (outcome?.requeueDelayMs !== undefined) {
        await enqueuePathRunJob(run.id, { delayMs: outcome.requeueDelayMs });
      }
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
