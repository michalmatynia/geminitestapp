import {
  recordRuntimeRunFinished,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { type mutateAgentLease } from '@/shared/lib/agent-lease-service';
import { type getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

import { JOB_EXECUTION_TIMEOUT_MS, LOG_SOURCE } from './config';

export const AI_PATH_EXECUTION_LEASE_RESOURCE_ID = 'ai-paths.run.execution';
export const AI_PATH_EXECUTION_LEASE_MS = Math.max(
  60_000,
  JOB_EXECUTION_TIMEOUT_MS,
  5 * 60 * 1000
);

export type AiPathRunRepository = Awaited<ReturnType<typeof getPathRunRepository>>;
export type ClaimedAiPathRun = NonNullable<
  Awaited<ReturnType<AiPathRunRepository['claimRunForProcessing']>>
>;
export type ExecutionLeaseResult = ReturnType<typeof mutateAgentLease>;

type ConflictingExecutionLease = NonNullable<ExecutionLeaseResult['conflictingLease']>;
type LeaseFailureFields = {
  blockingOwnerAgentId: string | null;
  ownerRunId: string | null;
  leaseId: string | null;
  leaseMs: number;
  expiresAt: string | null;
};

export type LeaseFailureDetails = {
  blockingOwnerAgentId: string | null;
  meta: Record<string, unknown>;
};

const resolveDurationMs = (startedAt: unknown, finishedAt: Date): number | undefined => {
  if (typeof startedAt !== 'string') return undefined;
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return undefined;
  return Math.max(0, finishedAt.getTime() - startMs);
};

const resolveLeaseFailureFields = (
  conflictingLease: ConflictingExecutionLease | null
): LeaseFailureFields => {
  if (conflictingLease === null) {
    return {
      blockingOwnerAgentId: null,
      ownerRunId: null,
      leaseId: null,
      leaseMs: AI_PATH_EXECUTION_LEASE_MS,
      expiresAt: null,
    };
  }

  return {
    blockingOwnerAgentId: conflictingLease.ownerAgentId,
    ownerRunId: conflictingLease.ownerRunId,
    leaseId: conflictingLease.leaseId,
    leaseMs: conflictingLease.leaseMs,
    expiresAt: conflictingLease.expiresAt ?? null,
  };
};

export const resolveLeaseFailureDetails = (
  run: ClaimedAiPathRun,
  leaseResult: ExecutionLeaseResult,
  ownerAgentId: string,
  failedAtIso: string
): LeaseFailureDetails => {
  const fields = resolveLeaseFailureFields(leaseResult.conflictingLease ?? null);
  return {
    blockingOwnerAgentId: fields.blockingOwnerAgentId,
    meta: {
      resourceId: AI_PATH_EXECUTION_LEASE_RESOURCE_ID,
      scopeId: run.id,
      requestedBy: ownerAgentId,
      failedAt: failedAtIso,
      blockingOwnerAgentId: fields.blockingOwnerAgentId,
      ownerAgentId: fields.blockingOwnerAgentId,
      ownerRunId: fields.ownerRunId,
      leaseId: fields.leaseId,
      leaseMs: fields.leaseMs,
      expiresAt: fields.expiresAt,
      resultCode: leaseResult.code,
    },
  };
};

type RecordBlockedLeaseFailureInput = {
  run: ClaimedAiPathRun;
  repo: AiPathRunRepository;
  failedAt: Date;
  failedAtIso: string;
  blockingOwnerAgentId: string | null;
  conflictingLease: ExecutionLeaseResult['conflictingLease'];
  ownerAgentId: string;
};

export const recordBlockedLeaseFailure = async ({
  run,
  repo,
  failedAt,
  failedAtIso,
  blockingOwnerAgentId,
  conflictingLease,
  ownerAgentId,
}: RecordBlockedLeaseFailureInput): Promise<void> => {
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
    durationMs: resolveDurationMs(run.startedAt, failedAt),
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
};
