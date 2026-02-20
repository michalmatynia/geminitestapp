import 'server-only';

import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { recoverStaleRunningRuns } from '@/features/ai/ai-paths/services/path-run-recovery-service';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { logSystemEvent } from '@/features/observability/server';
import { ErrorSystem } from '@/features/observability/services/error-system';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const DEFAULT_MAX_ATTEMPTS = Number(process.env['AI_PATHS_RUN_MAX_ATTEMPTS'] ?? '3');
const DEFAULT_BACKOFF_MS = Number(process.env['AI_PATHS_RUN_BACKOFF_MS'] ?? '5000');
const DEFAULT_BACKOFF_MAX_MS = Number(process.env['AI_PATHS_RUN_BACKOFF_MAX_MS'] ?? '60000');
const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);
const DEBUG_AI_PATH_QUEUE = process.env['AI_PATHS_QUEUE_DEBUG'] === 'true';
const LOG_SOURCE = 'ai-path-run-processor';

const debugQueueLog = (message: string, context?: Record<string, unknown>): void => {
  if (!DEBUG_AI_PATH_QUEUE) return;
  void logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message,
    context: context ?? null
  });
};

const normalizeNumber = (value: number, fallback: number, min: number = 0): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
};

const NON_RETRYABLE_PATTERNS = [
  // Ollama connectivity (existing)
  'could not connect to ollama server',
  // Validation / schema errors — will never succeed on retry
  'validation failed',
  'validation error',
  'invalid input',
  'invalid configuration',
  'schema validation',
  'missing required',
  // Auth / permissions — retrying won't fix auth state
  'unauthorized',
  'forbidden',
  'useauth must be used within',
  'must be used within',
  // Configuration errors
  'configuration error',
  'invalid state',
  // Bad request payloads
  'referenced record not found',
  'record not found',
] as const;

const isNonRetryableRunError = (error: unknown): boolean => {
  // Check AppError.retryable property first (authoritative)
  if (
    error !== null &&
    typeof error === 'object' &&
    'retryable' in error &&
    (error as { retryable?: boolean }).retryable === false
  ) {
    return true;
  }

  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();

  // Ollama-specific compound check (existing logic)
  if (
    normalized.includes('ollama') &&
    (normalized.includes('econnrefused') ||
      normalized.includes('fetch failed') ||
      normalized.includes('failed to fetch'))
  ) {
    return true;
  }

  return NON_RETRYABLE_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const resolveDurationMs = (
  startedAt: Date | string | null | undefined,
  finishedAt: Date
): number | null => {
  if (!startedAt) return null;
  const startedAtMs =
    typeof startedAt === 'string'
      ? Date.parse(startedAt)
      : startedAt instanceof Date
        ? startedAt.getTime()
        : Number.NaN;
  if (!Number.isFinite(startedAtMs)) return null;
  return Math.max(0, finishedAt.getTime() - startedAtMs);
};

export const computeBackoffMs = (retryCount: number, meta?: Record<string, unknown>): number => {
  const base =
    typeof meta?.['backoffMs'] === 'number' ? meta['backoffMs'] : DEFAULT_BACKOFF_MS;
  const max =
    typeof meta?.['backoffMaxMs'] === 'number'
      ? meta['backoffMaxMs']
      : DEFAULT_BACKOFF_MAX_MS;
  const exponent = Math.max(0, retryCount);
  const raw = normalizeNumber(base * Math.pow(2, exponent), DEFAULT_BACKOFF_MS, 0);
  const capped = Math.min(raw, normalizeNumber(max, DEFAULT_BACKOFF_MAX_MS, 0));
  const jitter = Math.min(1000, Math.round(capped * 0.1));
  const withJitter = capped + (jitter > 0 ? Math.floor(Math.random() * jitter) : 0);
  return Math.max(0, withJitter);
};

export type ProcessRunResult =
  | {
      requeueDelayMs: number;
    }
  | undefined;

export const processRun = async (run: AiPathRunRecord): Promise<ProcessRunResult> => {
  const repo = await getPathRunRepository();
  debugQueueLog(`Processing run ${run.id}`, { runId: run.id });
  try {
    await executePathRun(run);
    const latest = await repo.findRunById(run.id);
    if (latest?.status === 'canceled') {
      debugQueueLog(`Run ${run.id} was canceled during execution`, { runId: run.id });
      return;
    }
    debugQueueLog(`Run ${run.id} completed`, { runId: run.id });
    return;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Run failed.';
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-queue',
      pathRunId: run.id,
      pathId: run.pathId,
    });
    const latest = await repo.findRunById(run.id);
    if (latest && TERMINAL_RUN_STATUSES.has(latest.status)) {
      // Another flow (e.g. cancel endpoint) already finalized the run.
      return;
    }
    if (latest && latest.status !== 'running' && latest.status !== 'queued') {
      return;
    }
    if (isNonRetryableRunError(error)) {
      const finishedAt = new Date();
      const failed = await repo.updateRunIfStatus(run.id, ['running', 'queued'], {
        status: 'failed',
        retryCount: latest?.retryCount ?? run.retryCount ?? 0,
        finishedAt: finishedAt.toISOString(),
        errorMessage: message,
      });
      if (failed) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: `Run stopped: non-retryable error — ${message}`,
          metadata: { nonRetryable: true, reason: 'non_retryable_error' },
        });
        await recordRuntimeRunFinished({
          runId: run.id,
          status: 'failed',
          durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
          timestamp: finishedAt,
        });
        publishRunUpdate(run.id, 'error', { error: message, nonRetryable: true });
      }
      return;
    }
    const retrySource = latest ?? run;
    const maxAttempts =
      typeof retrySource.maxAttempts === 'number' && retrySource.maxAttempts > 0
        ? retrySource.maxAttempts
        : DEFAULT_MAX_ATTEMPTS;
    const retryCount = (retrySource.retryCount ?? 0) + 1;
    if (retryCount < maxAttempts) {
      const delayMs = computeBackoffMs(retryCount - 1, retrySource.meta ?? undefined);
      const nextRetryAt = new Date(Date.now() + delayMs);
      const requeued = await repo.updateRunIfStatus(run.id, ['running', 'queued'], {
        status: 'queued',
        retryCount,
        nextRetryAt: nextRetryAt.toISOString(),
        errorMessage: message,
        startedAt: null,
        finishedAt: null,
      });
      if (!requeued) {
        return;
      }
      await repo.createRunEvent({
        runId: run.id,
        level: 'warn',
        message: `Run failed. Retrying in ${Math.round(delayMs / 1000)}s.`,
        metadata: { retryCount, nextRetryAt: nextRetryAt.toISOString() },
      });
      return { requeueDelayMs: delayMs };
    } else {
      const finishedAt = new Date();
      const deadLettered = await repo.updateRunIfStatus(run.id, ['running', 'queued'], {
        status: 'dead_lettered',
        retryCount,
        finishedAt: finishedAt.toISOString(),
        deadLetteredAt: finishedAt.toISOString(),
        errorMessage: message,
      });
      if (deadLettered) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: 'Run moved to dead-letter after max retries.',
          metadata: { retryCount, maxAttempts },
        });
        await recordRuntimeRunFinished({
          runId: run.id,
          status: 'dead_lettered',
          durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
          timestamp: finishedAt,
        });
        publishRunUpdate(run.id, 'error', {
          error: 'Max retries exceeded',
          status: 'dead_lettered',
          retryCount,
          maxAttempts,
        });
      }
      return;
    }
  }
};

/**
 * Periodic recovery job: marks runs stuck in 'running' state for >10 minutes
 * as 'failed'. This handles cases where the worker crashed mid-execution
 * without updating the run status.
 */
export const processStaleRunRecovery = async (): Promise<void> => {
  try {
    const count = await recoverStaleRunningRuns({
      source: 'ai-paths-queue.stale-recovery',
    });
    if (count > 0) {
      debugQueueLog(
        `Recovery: marked ${count} stale running run(s) as failed`,
        { count }
      );
      void ErrorSystem.logWarning(
        `Stale run recovery: marked ${count} run(s) as failed`,
        {
          service: 'ai-paths-queue',
          action: 'staleRunRecovery',
          count,
        }
      );
    }
  } catch (error) {
    void ErrorSystem.logWarning('Stale run recovery failed', {
      service: 'ai-paths-queue',
      action: 'staleRunRecovery',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
