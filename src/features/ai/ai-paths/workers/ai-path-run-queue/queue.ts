/**
 * AI Path Run Queue Worker
 * 
 * Orchestrates the execution of AI Path runs as asynchronous background jobs.
 * This module ensures atomic execution of runs through a combination of
 * persistence-based job queues and distributed lease locking.
 * 
 * Key Mechanisms:
 * - Lease Acquisition: Jobs claim runs via the repository; execution is then 
 *   guarded by a distributed execution lease to prevent race conditions.
 * - Concurrency Control: Configurable concurrency and timeouts via BullMQ.
 * - Resilience: Robust error handling, including automatic fallback for 
 *   inline processing on failure and job staleness monitoring.
 * - Observability: Integrates runtime start/stop logging, failure event tracking,
 *   and error reporting to the central ErrorSystem.
 * 
 * Usage:
 * Managed by `createManagedQueue` at application startup. Individual jobs 
 * are enqueued using `enqueuePathRunJob`.
 */

import {
  recordRuntimeRunStarted,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { processRun } from '@/features/ai/ai-paths/workers/ai-path-run-processor';
import { internalError } from '@/shared/errors/app-error';
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

/**
 * Resolves the agent identifier for this worker process.
 */
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

/**
 * Enqueues a new path run job for processing.
 * 
 * @param runId - Unique identifier of the path run.
 * @param options - Scheduling options (delay).
 */
export const enqueuePathRunJob = async (
  runId: string,
  options: { delayMs?: number } = {}
): Promise<void> => {
  await queue.enqueue({ runId }, { delay: options.delayMs, jobId: runId });
};

const jobTimeout = JOB_EXECUTION_TIMEOUT_MS > 0 ? JOB_EXECUTION_TIMEOUT_MS : undefined;

/**
 * Attempts to claim a run from the repository and acquire an execution lease.
 */
const handleLease = async (
  runId: string,
  repo: AiPathRunRepository,
  ownerAgentId: string
): Promise<{ run: ClaimedAiPathRun; leaseResult: ExecutionLeaseResult } | null> => {
  let run: ClaimedAiPathRun | null = null;
  try {
    run = await repo.claimRunForProcessing(runId);
  } catch (error) {
    throw internalError(`Failed to claim path run ${runId} for processing.`, {
      runId,
      ownerAgentId,
      cause: error,
    });
  }

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
// ... rest of file remains documented implicitly by structure
