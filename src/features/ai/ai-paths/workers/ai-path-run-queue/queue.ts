import {
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
import {
  AI_PATH_EXECUTION_LEASE_MS,
  AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
  type AiPathRunRepository,
  type ClaimedAiPathRun,
  type ExecutionLeaseResult,
  recordBlockedLeaseFailure,
  resolveLeaseFailureDetails,
} from './lease-failure';
import { type AiPathRunJobData } from './types';
import { createDebugQueueLogger } from '../ai-path-run-queue-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';



const { log: debugQueueLog, warn: debugQueueWarn } = createDebugQueueLogger(
  LOG_SOURCE,
  process.env['AI_PATHS_QUEUE_DEBUG'] === 'true'
);

const resolveQueueWorkerAgentId = (): string => {
  const agentId = [
    process.env['AI_AGENT_ID'],
    process.env['CODEX_AGENT_ID'],
    process.env['AGENT_ID'],
  ]
    .map((value) => value?.trim())
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  return agentId ?? `ai-path-run-queue-${process.pid}`;
};

export const enqueuePathRunJob = async (
  runId: string,
  options: { delayMs?: number } = {}
): Promise<void> => {
  await queue.enqueue({ runId }, { delay: options.delayMs, jobId: runId });
};

const jobTimeout = JOB_EXECUTION_TIMEOUT_MS > 0 ? JOB_EXECUTION_TIMEOUT_MS : undefined;

const handleLease = async (
  runId: string,
  repo: AiPathRunRepository,
  ownerAgentId: string
): Promise<{ run: ClaimedAiPathRun; leaseResult: ExecutionLeaseResult } | null> => {
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
  run: ClaimedAiPathRun,
  leaseResult: ExecutionLeaseResult,
  repo: AiPathRunRepository,
  ownerAgentId: string
): Promise<void> => {
  const failedAt = new Date();
  const failedAtIso = failedAt.toISOString();
  const { blockingOwnerAgentId, meta } = resolveLeaseFailureDetails(
    run,
    leaseResult,
    ownerAgentId,
    failedAtIso
  );
  const failed = await repo.updateRunIfStatus(run.id, ['running'], {
    status: 'failed',
    finishedAt: failedAtIso,
    errorMessage: 'Run failed: execution lease is already owned by another worker.',
    meta: {
      ...(run.meta ?? {}),
      executionLeaseFailure: meta,
    },
  });

  if (!failed) return;

  await recordBlockedLeaseFailure({
    run,
    repo,
    failedAt,
    failedAtIso,
    blockingOwnerAgentId,
    conflictingLease: leaseResult.conflictingLease ?? null,
    ownerAgentId,
  });
};

const releaseExecutionLease = (
  run: ClaimedAiPathRun,
  leaseResult: ExecutionLeaseResult,
  ownerAgentId: string
): void => {
  mutateAgentLease({
    action: 'release',
    resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
    scopeId: run.id,
    ownerAgentId,
    ownerRunId: run.id,
    leaseId: leaseResult.lease?.leaseId ?? undefined,
    reason: 'ai-path queue worker finished processing',
  });
};

const processClaimedRun = async (
  run: ClaimedAiPathRun,
  leaseResult: ExecutionLeaseResult,
  ownerAgentId: string,
  signal?: AbortSignal
): Promise<void> => {
  try {
    await recordRuntimeRunStarted({ runId: run.id });
    await processRun(run, signal);
  } finally {
    releaseExecutionLease(run, leaseResult, ownerAgentId);
  }
};

type QueueLeaseResultInput = {
  data: AiPathRunJobData;
  result: { run: ClaimedAiPathRun; leaseResult: ExecutionLeaseResult };
  repo: AiPathRunRepository;
  ownerAgentId: string;
  signal?: AbortSignal;
};

const handleQueueLeaseResult = async ({
  data,
  result,
  repo,
  ownerAgentId,
  signal,
}: QueueLeaseResultInput): Promise<void> => {
  const { run, leaseResult } = result;
  if (leaseResult.ok === false) {
    await handleBlockedLease(run, leaseResult, repo, ownerAgentId);
    debugQueueLog(
      `[aiPathRunQueue] Run ${data.runId} blocked on execution lease owned by ${leaseResult.conflictingLease?.ownerAgentId ?? 'unknown-owner'}`
    );
    return;
  }

  await processClaimedRun(run, leaseResult, ownerAgentId, signal);
};

const runQueueJob = async (
  data: AiPathRunJobData,
  _jobId: string,
  signal?: AbortSignal
): Promise<void> => {
  const repo = await getPathRunRepository();
  const ownerAgentId = resolveQueueWorkerAgentId();
  const result = await handleLease(data.runId, repo, ownerAgentId);
  if (result === null) return;
  await handleQueueLeaseResult({ data, result, repo, ownerAgentId, signal });
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
