import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const DEFAULT_RUN_RETRY_BACKOFF_MS = 1_000;
const DEFAULT_RUN_RETRY_BACKOFF_MAX_MS = 30_000;
const QUEUE_TRANSPORT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
]);
const QUEUE_TRANSPORT_ERROR_MESSAGE_PARTS = [
  'econnrefused',
  'econnreset',
  'timeout',
  'socket',
  'connection is closed',
  'read only',
  'not connected',
] as const;

const readQueueTransportErrorCode = (error: Error): string | null => {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' ? code.toUpperCase() : null;
};

export const isQueueTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const code = readQueueTransportErrorCode(error);
  if (code && QUEUE_TRANSPORT_ERROR_CODES.has(code)) return true;

  const message = error.message.toLowerCase();
  return QUEUE_TRANSPORT_ERROR_MESSAGE_PARTS.some((part) => message.includes(part));
};

export const createDebugQueueLogger = (logSource: string, enabled: boolean) => {
  const log = (message: string, context?: Record<string, unknown>): void => {
    if (!enabled) return;
    void logSystemEvent({
      level: 'info',
      source: logSource,
      message,
      context: context ?? null,
    });
  };

  const warn = (message: string, context?: Record<string, unknown>): void => {
    if (!enabled) return;
    void logSystemEvent({
      level: 'warn',
      source: logSource,
      message,
      context: context ?? null,
    });
  };

  return { log, warn };
};

export const parseEnvNumber = (name: string, fallback: number, min: number = 0): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const readRetryMetaNumber = (
  meta: Record<string, unknown> | null | undefined,
  key: 'backoffMs' | 'backoffMaxMs'
): number | null => {
  const value = meta?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
};

export const computeBackoffMs = (
  attemptIndex: number,
  meta?: Record<string, unknown> | null
): number => {
  const baseDelayMs = readRetryMetaNumber(meta, 'backoffMs') ?? DEFAULT_RUN_RETRY_BACKOFF_MS;
  if (baseDelayMs <= 0) return 0;

  const maxDelayMs =
    readRetryMetaNumber(meta, 'backoffMaxMs') ??
    Math.max(baseDelayMs, DEFAULT_RUN_RETRY_BACKOFF_MAX_MS);
  const exponent = Math.max(0, Math.trunc(attemptIndex));
  const delayMs = baseDelayMs * Math.pow(2, exponent);

  return Math.min(maxDelayMs, Math.max(0, Math.trunc(delayMs)));
};

export const resolveDurationMs = (
  startedAt: string | null | undefined,
  finishedAt: Date | string | null | undefined
): number | null => {
  if (!startedAt || !finishedAt) return null;
  const startedAtMs = Date.parse(startedAt);
  const finishedAtValue = finishedAt instanceof Date ? finishedAt.toISOString() : finishedAt;
  const finishedAtMs = Date.parse(finishedAtValue);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return null;
  return Math.max(0, finishedAtMs - startedAtMs);
};

const readErrorStatusCode = (error: Error): number | null => {
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number' && Number.isFinite(status)) return status;

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === 'number' && Number.isFinite(statusCode)) return statusCode;

  return null;
};

const readErrorCode = (error: Error): string | null => {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.trim().length > 0 ? code.trim().toUpperCase() : null;
};

export const isNonRetryableRunError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if ((error as { retryable?: boolean }).retryable === false) return true;

  const code = readErrorCode(error);
  if (code && ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'].includes(code)) {
    return true;
  }

  const statusCode = readErrorStatusCode(error);
  if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
    return statusCode !== 408 && statusCode !== 409 && statusCode !== 429;
  }

  return error.name === 'AbortError' || error.name === 'GraphExecutionCancelled';
};
