import 'server-only';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEFAULT_STALE_RUNNING_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_STALE_RUNNING_CLEANUP_INTERVAL_MS = 120_000;
const DEFAULT_BLOCKED_LEASE_RECOVERY_GRACE_MS = 60_000;
const DEFAULT_BLOCKED_LEASE_RECOVERY_BATCH_SIZE = 25;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resolveAiPathsStaleRunningMaxAgeMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'],
    DEFAULT_STALE_RUNNING_MAX_AGE_MS
  );

export const resolveAiPathsStaleRunningCleanupIntervalMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'],
    DEFAULT_STALE_RUNNING_CLEANUP_INTERVAL_MS
  );

export const resolveAiPathsBlockedLeaseRecoveryGraceMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'],
    DEFAULT_BLOCKED_LEASE_RECOVERY_GRACE_MS
  );

export const resolveAiPathsBlockedLeaseRecoveryBatchSize = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'],
    DEFAULT_BLOCKED_LEASE_RECOVERY_BATCH_SIZE
  );

const readTimestampMs = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readPositiveNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
};

const resolveBlockedLeaseRecoveryReadyAtMs = (
  run: { meta?: Record<string, unknown> | null },
  graceMs: number
): number | null => {
  const executionLease =
    run.meta && typeof run.meta === 'object' && typeof run.meta['executionLease'] === 'object'
      ? (run.meta['executionLease'] as Record<string, unknown>)
      : null;
  if (!executionLease) return null;

  const expiresAtMs = readTimestampMs(executionLease['expiresAt']);
  if (expiresAtMs !== null) {
    return expiresAtMs + graceMs;
  }

  const blockedAtMs = readTimestampMs(executionLease['blockedAt']);
  const leaseMs = readPositiveNumber(executionLease['leaseMs']);
  if (blockedAtMs !== null && leaseMs !== null) {
    return blockedAtMs + leaseMs + graceMs;
  }

  return null;
};

const resolveBlockedLeaseRecoveryReason = (run: { meta?: Record<string, unknown> | null }): string => {
  const executionLease =
    run.meta && typeof run.meta === 'object' && typeof run.meta['executionLease'] === 'object'
      ? (run.meta['executionLease'] as Record<string, unknown>)
      : null;
  const ownerAgentId =
    executionLease && typeof executionLease['ownerAgentId'] === 'string'
      ? executionLease['ownerAgentId'].trim()
      : '';
  return ownerAgentId.length > 0
    ? `Execution lease held by ${ownerAgentId} remained blocked past expiry.`
    : 'Execution lease remained blocked past expiry.';
};

export const recoverStaleRunningRuns = async (input?: {
  repo?: AiPathRunRepository;
  source?: string;
  maxAgeMs?: number;
}): Promise<number> => {
  const repo = input?.repo ?? (await getPathRunRepository());
  const maxAgeMs = input?.maxAgeMs ?? resolveAiPathsStaleRunningMaxAgeMs();
  const source = input?.source ?? 'ai-paths.recovery';

  try {
    const result = await repo.markStaleRunningRuns(maxAgeMs);
    return result.count;
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(`[${source}] Failed to cleanup stale running runs.`, {
      service: 'ai-paths',
      source,
      error,
      maxAgeMs,
    });
    return 0;
  }
};

export const recoverBlockedLeaseRuns = async (input?: {
  repo?: AiPathRunRepository;
  source?: string;
  nowMs?: number;
  graceMs?: number;
  limit?: number;
}): Promise<number> => {
  const repo = input?.repo ?? (await getPathRunRepository());
  const graceMs = input?.graceMs ?? resolveAiPathsBlockedLeaseRecoveryGraceMs();
  const limit = input?.limit ?? resolveAiPathsBlockedLeaseRecoveryBatchSize();
  const nowMs = input?.nowMs ?? Date.now();
  const source = input?.source ?? 'ai-paths.lease-recovery';

  try {
    const blockedRuns = await repo.listRuns({
      statuses: ['blocked_on_lease'],
      limit,
      offset: 0,
      includeTotal: false,
    });
    if (blockedRuns.runs.length === 0) return 0;

    const { markPathRunHandoffReady } = await import(
      '@/features/ai/ai-paths/services/path-run-management-service'
    );

    const recoveryPromises = blockedRuns.runs.map(async (run) => {
      const readyAtMs = resolveBlockedLeaseRecoveryReadyAtMs(run, graceMs);
      if (readyAtMs === null || nowMs < readyAtMs) return false;

      const recovered = await markPathRunHandoffReady({
        runId: run.id,
        reason: resolveBlockedLeaseRecoveryReason(run),
        requestedBy: 'ai-paths-recovery',
        checkpointLineageId: `${run.id}:lease-recovery:${nowMs}`,
      });

      return recovered?.status === 'handoff_ready';
    });

    const results = await Promise.all(recoveryPromises);
    return results.filter(Boolean).length;
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(`[${source}] Failed to recover blocked lease runs.`, {
      service: 'ai-paths',
      source,
      error,
      graceMs,
      limit,
    });
    return 0;
  }
};
