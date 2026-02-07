import 'server-only';

import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/features/observability/services/error-system';
import type { AiPathRunRecord } from '@/shared/types/ai-paths';

const DEFAULT_MAX_ATTEMPTS = Number(process.env.AI_PATHS_RUN_MAX_ATTEMPTS ?? '3');
const DEFAULT_BACKOFF_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MS ?? '5000');
const DEFAULT_BACKOFF_MAX_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MAX_MS ?? '60000');

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

export const computeBackoffMs = (retryCount: number, meta?: Record<string, unknown>): number => {
  const base =
    typeof meta?.backoffMs === 'number' ? meta.backoffMs : DEFAULT_BACKOFF_MS;
  const max =
    typeof meta?.backoffMaxMs === 'number'
      ? meta.backoffMaxMs
      : DEFAULT_BACKOFF_MAX_MS;
  const exponent = Math.max(0, retryCount);
  const raw = normalizeNumber(base * Math.pow(2, exponent), DEFAULT_BACKOFF_MS, 0);
  const capped = Math.min(raw, normalizeNumber(max, DEFAULT_BACKOFF_MAX_MS, 0));
  const jitter = Math.min(1000, Math.round(capped * 0.1));
  const withJitter = capped + (jitter > 0 ? Math.floor(Math.random() * jitter) : 0);
  return Math.max(0, withJitter);
};

export const processRun = async (run: AiPathRunRecord): Promise<void> => {
  console.log(`[aiPathRunQueue] Processing run ${run.id}`);
  try {
    await executePathRun(run);
    console.log(`[aiPathRunQueue] Run ${run.id} completed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Run failed.';
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-queue',
      pathRunId: run.id,
      pathId: run.pathId,
    });
    if (isNonRetryableRunError(error)) {
      await (getPathRunRepository()).updateRun(run.id, {
        status: 'failed',
        retryCount: run.retryCount ?? 0,
        finishedAt: new Date(),
        errorMessage: message,
      });
      await (getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: 'error',
        message: `Run stopped: non-retryable error — ${message}`,
        metadata: { nonRetryable: true, reason: 'non_retryable_error' },
      });
      return;
    }
    const maxAttempts =
      typeof run.maxAttempts === 'number' && run.maxAttempts > 0
        ? run.maxAttempts
        : DEFAULT_MAX_ATTEMPTS;
    const retryCount = (run.retryCount ?? 0) + 1;
    if (retryCount < maxAttempts) {
      const delayMs = computeBackoffMs(retryCount - 1, run.meta ?? undefined);
      const nextRetryAt = new Date(Date.now() + delayMs);
      await (getPathRunRepository()).updateRun(run.id, {
        status: 'queued',
        retryCount,
        nextRetryAt,
        errorMessage: message,
        startedAt: null,
        finishedAt: null,
      });
      await (getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: 'warning',
        message: `Run failed. Retrying in ${Math.round(delayMs / 1000)}s.`,
        metadata: { retryCount, nextRetryAt },
      });
    } else {
      await (getPathRunRepository()).updateRun(run.id, {
        status: 'dead_lettered',
        retryCount,
        finishedAt: new Date(),
        deadLetteredAt: new Date(),
        errorMessage: message,
      });
      await (getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: 'error',
        message: 'Run moved to dead-letter after max retries.',
        metadata: { retryCount, maxAttempts },
      });
    }
  }
};
