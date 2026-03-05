import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';

import {
  isSensitiveKey,
  REDACTED_VALUE,
  redactSensitiveText,
  truncateString,
} from './log-redaction';
import { emitOtelLogRecord } from './otel-log-bridge';
import { getActiveOtelContextAttributes } from './otel-context';
import { isTransientError, withTransientRecovery } from './transient-recovery/with-recovery';

const MAX_CONTEXT_SIZE = 12000;
const MAX_VALUE_LENGTH = 4000;
const MAX_STACK_LENGTH = 20000;
const MAX_CAUSE_DEPTH = 5;

type CentralLogPayload = {
  level: SystemLogLevel;
  message: string;
  source?: string | null;
  service?: string | null;
  category?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
  fingerprint?: string | null;
  createdAt: string;
};

const getCentralLogWebhookUrl = (): string | null => process.env['CENTRAL_LOG_WEBHOOK_URL'] ?? null;

type CentralLogForwardResult = 'skipped' | 'delivered' | 'failed';

type CentralLoggingRuntimeState = {
  attempts: number;
  delivered: number;
  failed: number;
  skipped: number;
  replayAttempts: number;
  replayDelivered: number;
  replayFailed: number;
  deadLetterQueued: number;
  deadLetterDropped: number;
  deadLetterReplayed: number;
  deadLetterHydrated: number;
  deadLetterPersisted: number;
  deadLetterPersistFailed: number;
  lastAttemptAt: string | null;
  lastDeliveredAt: string | null;
  lastFailedAt: string | null;
  lastReplayAt: string | null;
  lastDeadLetterQueuedAt: string | null;
  lastDeadLetterDroppedAt: string | null;
  lastDeadLetterHydratedAt: string | null;
  lastDeadLetterPersistedAt: string | null;
  lastDeadLetterPersistFailedAt: string | null;
};

const centralLoggingRuntimeState: CentralLoggingRuntimeState = {
  attempts: 0,
  delivered: 0,
  failed: 0,
  skipped: 0,
  replayAttempts: 0,
  replayDelivered: 0,
  replayFailed: 0,
  deadLetterQueued: 0,
  deadLetterDropped: 0,
  deadLetterReplayed: 0,
  deadLetterHydrated: 0,
  deadLetterPersisted: 0,
  deadLetterPersistFailed: 0,
  lastAttemptAt: null,
  lastDeliveredAt: null,
  lastFailedAt: null,
  lastReplayAt: null,
  lastDeadLetterQueuedAt: null,
  lastDeadLetterDroppedAt: null,
  lastDeadLetterHydratedAt: null,
  lastDeadLetterPersistedAt: null,
  lastDeadLetterPersistFailedAt: null,
};

const CENTRAL_LOG_DEAD_LETTER_MAX = 200;
const CENTRAL_LOG_FORWARD_SOURCE = 'system-log-central-forwarder';
const CENTRAL_LOG_FORWARD_CIRCUIT_ID = 'central-log-webhook-forward';
const CENTRAL_LOG_FORWARD_MAX_ATTEMPTS = 3;
const CENTRAL_LOG_FORWARD_INITIAL_DELAY_MS = 150;
const CENTRAL_LOG_FORWARD_MAX_DELAY_MS = 1500;
const CENTRAL_LOG_FORWARD_TIMEOUT_MS = 5000;
const CENTRAL_LOG_FORWARD_CIRCUIT_FAILURE_THRESHOLD = 5;
const CENTRAL_LOG_FORWARD_CIRCUIT_RESET_TIMEOUT_MS = 60000;

type CentralLogDeadLetterEntry = {
  payload: CentralLogPayload;
  queuedAt: string;
  lastError: string;
  retryCount: number;
};

const centralLogDeadLetterQueue: CentralLogDeadLetterEntry[] = [];
let deadLetterReplayInProgress = false;
let deadLetterStoreHydrated = false;
let deadLetterStoreHydrationPromise: Promise<void> | null = null;
let deadLetterPersistInProgress = false;
let deadLetterPersistRequested = false;

class CentralSinkHttpError extends Error {
  readonly status: number;

  constructor(status: number, statusText?: string) {
    super(
      `Central sink responded with status ${status}${statusText ? ` ${statusText}` : ''}`.trim()
    );
    this.name = 'CentralSinkHttpError';
    this.status = status;
  }
}

const getCentralLogWebhookHost = (): string | null => {
  const webhookUrl = getCentralLogWebhookUrl();
  if (!webhookUrl) return null;
  try {
    const parsed = new URL(webhookUrl);
    return parsed.host || null;
  } catch {
    return null;
  }
};

export type CentralLoggingRuntimeStats = CentralLoggingRuntimeState & {
  configured: boolean;
  webhookHost: string | null;
  deadLetterBacklog: number;
  deadLetterMax: number;
  deadLetterReplayInProgress: boolean;
  deadLetterStoreHydrated: boolean;
  deadLetterStoreHydrationInProgress: boolean;
  deadLetterPersistInProgress: boolean;
};

export const getCentralLoggingRuntimeStats = (): CentralLoggingRuntimeStats => {
  const webhookUrl = getCentralLogWebhookUrl();
  return {
    configured: typeof webhookUrl === 'string' && webhookUrl.trim().length > 0,
    webhookHost: getCentralLogWebhookHost(),
    attempts: centralLoggingRuntimeState.attempts,
    delivered: centralLoggingRuntimeState.delivered,
    failed: centralLoggingRuntimeState.failed,
    skipped: centralLoggingRuntimeState.skipped,
    replayAttempts: centralLoggingRuntimeState.replayAttempts,
    replayDelivered: centralLoggingRuntimeState.replayDelivered,
    replayFailed: centralLoggingRuntimeState.replayFailed,
    deadLetterQueued: centralLoggingRuntimeState.deadLetterQueued,
    deadLetterDropped: centralLoggingRuntimeState.deadLetterDropped,
    deadLetterReplayed: centralLoggingRuntimeState.deadLetterReplayed,
    deadLetterHydrated: centralLoggingRuntimeState.deadLetterHydrated,
    deadLetterPersisted: centralLoggingRuntimeState.deadLetterPersisted,
    deadLetterPersistFailed: centralLoggingRuntimeState.deadLetterPersistFailed,
    lastAttemptAt: centralLoggingRuntimeState.lastAttemptAt,
    lastDeliveredAt: centralLoggingRuntimeState.lastDeliveredAt,
    lastFailedAt: centralLoggingRuntimeState.lastFailedAt,
    lastReplayAt: centralLoggingRuntimeState.lastReplayAt,
    lastDeadLetterQueuedAt: centralLoggingRuntimeState.lastDeadLetterQueuedAt,
    lastDeadLetterDroppedAt: centralLoggingRuntimeState.lastDeadLetterDroppedAt,
    lastDeadLetterHydratedAt: centralLoggingRuntimeState.lastDeadLetterHydratedAt,
    lastDeadLetterPersistedAt: centralLoggingRuntimeState.lastDeadLetterPersistedAt,
    lastDeadLetterPersistFailedAt: centralLoggingRuntimeState.lastDeadLetterPersistFailedAt,
    deadLetterBacklog: centralLogDeadLetterQueue.length,
    deadLetterMax: CENTRAL_LOG_DEAD_LETTER_MAX,
    deadLetterReplayInProgress: deadLetterReplayInProgress,
    deadLetterStoreHydrated,
    deadLetterStoreHydrationInProgress: deadLetterStoreHydrationPromise !== null,
    deadLetterPersistInProgress,
  };
};

const markCentralLogSkipped = (): CentralLogForwardResult => {
  centralLoggingRuntimeState.skipped += 1;
  return 'skipped';
};

const toForwardErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return truncateString(error.message.trim(), 500);
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return truncateString(error.trim(), 500);
  }
  try {
    return truncateString(JSON.stringify(error), 500);
  } catch {
    return 'unknown_forward_error';
  }
};

type DeadLetterStoreModule = {
  loadCentralLogDeadLetters: (options?: { maxEntries?: number }) => Promise<
    Array<{
      payload: Record<string, unknown>;
      queuedAt: string;
      lastError: string;
      retryCount: number;
    }>
  >;
  saveCentralLogDeadLetters: (
    entries: Array<{
      payload: Record<string, unknown>;
      queuedAt: string;
      lastError: string;
      retryCount: number;
    }>,
    options?: { maxEntries?: number }
  ) => Promise<boolean>;
};

const loadDeadLetterStore = async (): Promise<DeadLetterStoreModule | null> => {
  if (typeof window !== 'undefined') return null;
  try {
    const mod = (await import('@/shared/lib/observability/central-log-dead-letter-store')) as
      | DeadLetterStoreModule
      | null;
    return mod;
  } catch (error) {
    console.error('[system-logger] Failed to load dead-letter persistence module', error);
    return null;
  }
};

const isCentralLogDeadLetterEntry = (value: unknown): value is CentralLogDeadLetterEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (!record['payload'] || typeof record['payload'] !== 'object' || Array.isArray(record['payload'])) {
    return false;
  }
  if (typeof record['queuedAt'] !== 'string' || record['queuedAt'].trim().length === 0) {
    return false;
  }
  if (typeof record['lastError'] !== 'string' || record['lastError'].trim().length === 0) {
    return false;
  }
  const retryCount = record['retryCount'];
  return typeof retryCount === 'number' && Number.isFinite(retryCount) && retryCount >= 1;
};

const queueDeadLetterPersistence = (): void => {
  if (typeof window !== 'undefined') return;
  deadLetterPersistRequested = true;
  if (deadLetterPersistInProgress) return;

  deadLetterPersistInProgress = true;
  void (async () => {
    while (deadLetterPersistRequested) {
      deadLetterPersistRequested = false;
      const deadLetterStore = await loadDeadLetterStore();
      if (!deadLetterStore) {
        centralLoggingRuntimeState.deadLetterPersistFailed += 1;
        centralLoggingRuntimeState.lastDeadLetterPersistFailedAt = new Date().toISOString();
        continue;
      }
      try {
        const persisted = await deadLetterStore.saveCentralLogDeadLetters(
          centralLogDeadLetterQueue,
          { maxEntries: CENTRAL_LOG_DEAD_LETTER_MAX }
        );
        if (persisted) {
          centralLoggingRuntimeState.deadLetterPersisted += 1;
          centralLoggingRuntimeState.lastDeadLetterPersistedAt = new Date().toISOString();
        } else {
          centralLoggingRuntimeState.deadLetterPersistFailed += 1;
          centralLoggingRuntimeState.lastDeadLetterPersistFailedAt = new Date().toISOString();
        }
      } catch (error) {
        centralLoggingRuntimeState.deadLetterPersistFailed += 1;
        centralLoggingRuntimeState.lastDeadLetterPersistFailedAt = new Date().toISOString();
        console.error('[system-logger] Failed to persist dead-letter queue', error);
      }
    }
  })().finally(() => {
    deadLetterPersistInProgress = false;
  });
};

const ensureDeadLetterStoreHydrated = async (): Promise<void> => {
  if (deadLetterStoreHydrated || typeof window !== 'undefined') return;
  if (deadLetterStoreHydrationPromise) {
    await deadLetterStoreHydrationPromise;
    return;
  }

  deadLetterStoreHydrationPromise = (async () => {
    try {
      const deadLetterStore = await loadDeadLetterStore();
      if (!deadLetterStore) return;
      const storedEntries = await deadLetterStore.loadCentralLogDeadLetters({
        maxEntries: CENTRAL_LOG_DEAD_LETTER_MAX,
      });
      const normalized = storedEntries
        .filter((entry) => isCentralLogDeadLetterEntry(entry))
        .slice(-CENTRAL_LOG_DEAD_LETTER_MAX);
      if (normalized.length > 0) {
        centralLogDeadLetterQueue.splice(
          0,
          centralLogDeadLetterQueue.length,
          ...normalized
        );
        centralLoggingRuntimeState.deadLetterHydrated += normalized.length;
        centralLoggingRuntimeState.lastDeadLetterHydratedAt = new Date().toISOString();
      }
    } catch (error) {
      console.error('[system-logger] Failed to hydrate dead-letter queue', error);
    } finally {
      deadLetterStoreHydrated = true;
      deadLetterStoreHydrationPromise = null;
    }
  })();

  await deadLetterStoreHydrationPromise;
};

const isRetryableCentralForwardError = (error: unknown): boolean => {
  if (error instanceof CentralSinkHttpError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return isTransientError(error);
};

const enqueueCentralLogDeadLetter = (
  payload: CentralLogPayload,
  error: unknown,
  retryCount: number
): void => {
  if (centralLogDeadLetterQueue.length >= CENTRAL_LOG_DEAD_LETTER_MAX) {
    centralLogDeadLetterQueue.shift();
    centralLoggingRuntimeState.deadLetterDropped += 1;
    centralLoggingRuntimeState.lastDeadLetterDroppedAt = new Date().toISOString();
  }

  centralLogDeadLetterQueue.push({
    payload,
    queuedAt: new Date().toISOString(),
    lastError: toForwardErrorMessage(error),
    retryCount,
  });
  centralLoggingRuntimeState.deadLetterQueued += 1;
  centralLoggingRuntimeState.lastDeadLetterQueuedAt = new Date().toISOString();
  queueDeadLetterPersistence();
};

const sendToCentralLogSink = async (
  payload: CentralLogPayload,
  mode: 'live' | 'replay'
): Promise<void> => {
  const webhookUrl = getCentralLogWebhookUrl();
  if (!webhookUrl || webhookUrl.trim().length === 0) {
    throw new Error('Central log webhook is not configured');
  }

  await withTransientRecovery(
    async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new CentralSinkHttpError(response.status, response.statusText);
      }
    },
    {
      source: `${CENTRAL_LOG_FORWARD_SOURCE}.${mode}`,
      circuitId: CENTRAL_LOG_FORWARD_CIRCUIT_ID,
      retry: {
        maxAttempts: CENTRAL_LOG_FORWARD_MAX_ATTEMPTS,
        initialDelayMs: CENTRAL_LOG_FORWARD_INITIAL_DELAY_MS,
        maxDelayMs: CENTRAL_LOG_FORWARD_MAX_DELAY_MS,
        timeoutMs: CENTRAL_LOG_FORWARD_TIMEOUT_MS,
        jitter: false,
        isRetryable: isRetryableCentralForwardError,
        logRetries: false,
      },
      circuit: {
        failureThreshold: CENTRAL_LOG_FORWARD_CIRCUIT_FAILURE_THRESHOLD,
        resetTimeoutMs: CENTRAL_LOG_FORWARD_CIRCUIT_RESET_TIMEOUT_MS,
      },
    }
  );
};

const replayCentralLogDeadLetters = async (): Promise<void> => {
  if (deadLetterReplayInProgress) return;
  if (centralLogDeadLetterQueue.length === 0) return;
  if (typeof window !== 'undefined') return;
  const webhookUrl = getCentralLogWebhookUrl();
  if (!webhookUrl || webhookUrl.trim().length === 0) return;

  deadLetterReplayInProgress = true;
  try {
    while (centralLogDeadLetterQueue.length > 0) {
      const entry = centralLogDeadLetterQueue[0];
      if (!entry) break;

      centralLoggingRuntimeState.replayAttempts += 1;
      centralLoggingRuntimeState.lastReplayAt = new Date().toISOString();

      try {
        await sendToCentralLogSink(entry.payload, 'replay');
        centralLogDeadLetterQueue.shift();
        centralLoggingRuntimeState.replayDelivered += 1;
        centralLoggingRuntimeState.deadLetterReplayed += 1;
        centralLoggingRuntimeState.lastDeliveredAt = new Date().toISOString();
        queueDeadLetterPersistence();
      } catch (error) {
        centralLoggingRuntimeState.replayFailed += 1;
        centralLoggingRuntimeState.lastFailedAt = new Date().toISOString();
        entry.retryCount += 1;
        entry.lastError = toForwardErrorMessage(error);
        queueDeadLetterPersistence();
        break;
      }
    }
  } finally {
    deadLetterReplayInProgress = false;
  }
};

const forwardToCentralizedLogging = async (payload: CentralLogPayload): Promise<CentralLogForwardResult> => {
  if (typeof window !== 'undefined') return markCentralLogSkipped();
  const webhookUrl = getCentralLogWebhookUrl();
  if (!webhookUrl || webhookUrl.trim().length === 0) return markCentralLogSkipped();
  await ensureDeadLetterStoreHydrated();

  centralLoggingRuntimeState.attempts += 1;
  centralLoggingRuntimeState.lastAttemptAt = new Date().toISOString();

  try {
    await sendToCentralLogSink(payload, 'live');
    centralLoggingRuntimeState.delivered += 1;
    centralLoggingRuntimeState.lastDeliveredAt = new Date().toISOString();
    if (centralLogDeadLetterQueue.length > 0) {
      void replayCentralLogDeadLetters();
    }
    return 'delivered';
  } catch (error) {
    centralLoggingRuntimeState.failed += 1;
    centralLoggingRuntimeState.lastFailedAt = new Date().toISOString();
    enqueueCentralLogDeadLetter(payload, error, 1);
    console.error('[system-logger] Failed to forward log to centralized sink', error);
    return 'failed';
  }
};

type CreateSystemLogFn = (input: {
  level: SystemLogLevel;
  message: string;
  category?: string | null;
  source?: string | null;
  service?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | undefined;
  method?: string | undefined;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
}) => Promise<SystemLogRecord>;

type NotifyCriticalErrorFn = (record: SystemLogRecord, shouldNotify: boolean) => Promise<unknown>;

const loadCreateSystemLog = async (): Promise<CreateSystemLogFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = (await import('./system-log-repository')) as { createSystemLog?: CreateSystemLogFn };
  return mod.createSystemLog ?? null;
};

const loadNotifyCriticalError = async (): Promise<NotifyCriticalErrorFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = (await import('./critical-error-notifier')) as {
    notifyCriticalError?: NotifyCriticalErrorFn;
  };
  return mod.notifyCriticalError ?? null;
};

const hash16 = (input: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (BigInt(h2 >>> 0) << 32n) | BigInt(h1 >>> 0);
  return combined.toString(16).padStart(16, '0').slice(0, 16);
};

const sanitizeValue = (value: unknown): Record<string, unknown> | null => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(
      value,
      (_key: string, val: unknown): unknown => {
        if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'bigint') return val.toString();
        if (typeof val === 'string') {
          return truncateString(redactSensitiveText(val), MAX_VALUE_LENGTH);
        }
        return val;
      },
      2
    );
    if (!json) return null;
    if (json.length > MAX_CONTEXT_SIZE) {
      return {
        truncated: true,
        preview: json.slice(0, MAX_CONTEXT_SIZE),
      };
    }
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { error: 'Failed to serialize context.' };
  }
};

type ErrorCauseEntry = {
  message: string;
  name?: string;
  code?: string;
  stack?: string | null;
  raw?: Record<string, unknown> | null;
};

type NormalizedErrorInfo = {
  message: string;
  stack?: string | undefined | null;
  name?: string;
  code?: string;
  httpStatus?: number;
  expected?: boolean;
  critical?: boolean;
  retryable?: boolean;
  retryAfterMs?: number;
  meta?: Record<string, unknown> | null;
  causeChain?: ErrorCauseEntry[];
  raw?: Record<string, unknown> | null;
};

const readString = (value: unknown, maxLength: number = MAX_VALUE_LENGTH): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return truncateString(trimmed, maxLength);
};

const readBoolean = (value: unknown): boolean | undefined => {
  return typeof value === 'boolean' ? value : undefined;
};

const readNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = (value as { code?: unknown }).code;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate);
  }
  return readString(candidate, 120);
};

const normalizeStack = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return truncateString(trimmed, MAX_STACK_LENGTH);
};

const readCause = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return undefined;
  return (value as { cause?: unknown }).cause;
};

const normalizeCauseEntry = (cause: unknown): ErrorCauseEntry => {
  if (cause instanceof Error) {
    const code = readCode(cause);
    const stack = normalizeStack(cause.stack);
    const normalizedName = readString(cause.name, 120);
    return {
      message: truncateString(cause.message || 'Unknown cause', MAX_VALUE_LENGTH),
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(code ? { code } : {}),
      ...(stack ? { stack } : {}),
    };
  }

  if (typeof cause === 'string') {
    return { message: truncateString(cause, MAX_VALUE_LENGTH) };
  }

  const message =
    (cause && typeof cause === 'object'
      ? readString((cause as Record<string, unknown>)['message'])
      : undefined) ?? 'Unknown cause';
  const name =
    cause && typeof cause === 'object'
      ? readString((cause as Record<string, unknown>)['name'], 120)
      : undefined;
  const code = readCode(cause);
  const stack =
    cause && typeof cause === 'object'
      ? normalizeStack((cause as Record<string, unknown>)['stack'])
      : undefined;
  const raw = sanitizeValue(cause);

  return {
    message,
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(stack ? { stack } : {}),
    ...(raw ? { raw } : {}),
  };
};

const buildCauseChain = (error: unknown): ErrorCauseEntry[] | undefined => {
  const chain: ErrorCauseEntry[] = [];
  const seen = new WeakSet<object>();
  let currentCause = readCause(error);

  while (currentCause !== undefined && currentCause !== null && chain.length < MAX_CAUSE_DEPTH) {
    if (typeof currentCause === 'object' && currentCause !== null) {
      if (seen.has(currentCause)) {
        chain.push({ message: 'Circular cause reference' });
        break;
      }
      seen.add(currentCause);
    }
    chain.push(normalizeCauseEntry(currentCause));
    currentCause = readCause(currentCause);
  }

  return chain.length > 0 ? chain : undefined;
};

export const normalizeErrorInfo = (error: unknown): NormalizedErrorInfo => {
  if (error instanceof Error) {
    const code = readCode(error);
    const httpStatus =
      readNumber((error as { httpStatus?: unknown }).httpStatus) ??
      readNumber((error as { status?: unknown }).status);
    const expected = readBoolean((error as { expected?: unknown }).expected);
    const critical = readBoolean((error as { critical?: unknown }).critical);
    const retryable = readBoolean((error as { retryable?: unknown }).retryable);
    const retryAfterMs = readNumber((error as { retryAfterMs?: unknown }).retryAfterMs);
    const meta = sanitizeValue((error as { meta?: unknown }).meta);
    const causeChain = buildCauseChain(error);
    const stack = normalizeStack(error.stack);
    const normalizedName = readString(error.name, 120);

    return {
      message: truncateString(error.message || 'Unknown error', MAX_VALUE_LENGTH),
      ...(stack ? { stack } : {}),
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(code ? { code } : {}),
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      ...(expected !== undefined ? { expected } : {}),
      ...(critical !== undefined ? { critical } : {}),
      ...(retryable !== undefined ? { retryable } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      ...(meta ? { meta } : {}),
      ...(causeChain ? { causeChain } : {}),
    };
  }

  if (typeof error === 'string') {
    return { message: truncateString(error, MAX_VALUE_LENGTH) };
  }

  const message =
    error && typeof error === 'object'
      ? readString((error as Record<string, unknown>)['message'])
      : undefined;
  const name =
    error && typeof error === 'object'
      ? readString((error as Record<string, unknown>)['name'], 120)
      : undefined;
  const code = readCode(error);
  const stack =
    error && typeof error === 'object'
      ? normalizeStack((error as Record<string, unknown>)['stack'])
      : undefined;
  const raw = sanitizeValue(error);
  const causeChain = buildCauseChain(error);

  return {
    message: message ?? 'Unknown error',
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(stack ? { stack } : {}),
    ...(causeChain ? { causeChain } : {}),
    ...(raw ? { raw } : {}),
  };
};

const extractRequestInfo = (
  request?: Request
): {
  path?: string;
  method?: string;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
} => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    const headerRequestId = request.headers.get('x-request-id')?.trim() || null;
    const headerTraceId = request.headers.get('x-trace-id')?.trim() || null;
    const headerCorrelationId = request.headers.get('x-correlation-id')?.trim() || null;
    return {
      path: url.pathname,
      method: request.method,
      ...(headerRequestId ? { requestId: headerRequestId } : {}),
      ...(headerTraceId ? { traceId: headerTraceId } : {}),
      ...(headerCorrelationId ? { correlationId: headerCorrelationId } : {}),
    };
  } catch {
    return {};
  }
};

const resolveServiceFromSource = (source: string | undefined): string | null => {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;
  const segments = trimmed.split('.').filter(Boolean);
  const maybeMethod = segments[segments.length - 1];
  const isMethod =
    maybeMethod === 'GET' ||
    maybeMethod === 'POST' ||
    maybeMethod === 'PUT' ||
    maybeMethod === 'PATCH' ||
    maybeMethod === 'DELETE' ||
    maybeMethod === 'HEAD' ||
    maybeMethod === 'OPTIONS';
  const base = isMethod ? segments.slice(0, -1) : segments;
  if (base.length >= 2) return `${base[0]}.${base[1]}`;
  if (base.length === 1) return base[0] ?? null;
  return null;
};

export const buildErrorFingerprint = (input: {
  message: string;
  source?: string | null;
  path?: string | null;
  statusCode?: number | null;
  errorInfo?: {
    message?: string;
    stack?: string | undefined | null;
    name?: string;
    code?: string;
  } | null;
}): string => {
  let raw = '';
  raw += input.message ?? '';
  raw += String(input.source ?? '');
  raw += String(input.path ?? '');
  raw += String(input.statusCode ?? '');
  if (input.errorInfo) {
    raw += String(input.errorInfo.name ?? '');
    raw += String(input.errorInfo.code ?? '');
    raw += String(input.errorInfo.message ?? '');
    const stack = input.errorInfo.stack ?? '';
    const normalizedStack = stack
      .split('\n')
      .slice(0, 6)
      .map((line: string) => line.replace(/\s+at\s+/g, ' at ').trim())
      .join('\n');
    raw += normalizedStack;
  }
  return hash16(raw);
};

export const getErrorFingerprint = (input: {
  message: string;
  source?: string | null;
  request?: Request;
  statusCode?: number | null;
  error?: unknown;
}): string => {
  const requestInfo = extractRequestInfo(input.request);
  const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
  return buildErrorFingerprint({
    message: input.message,
    source: input.source ?? null,
    path: requestInfo.path ?? null,
    statusCode: input.statusCode ?? null,
    errorInfo,
  });
};

export type SystemLogInput = {
  level?: SystemLogLevel;
  message: string;
  source?: string;
  service?: string;
  context?: Record<string, unknown> | null;
  error?: unknown;
  request?: Request;
  statusCode?: number | undefined;
  userId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  critical?: boolean;
};

export async function logSystemEvent(input: SystemLogInput): Promise<void> {
  try {
    const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
    const requestInfo = extractRequestInfo(input.request);
    const activeOtelContext = getActiveOtelContextAttributes();

    // Auto-classify error if it exists and category is missing
    const explicitCategory =
      typeof input.context?.['category'] === 'string' ? input.context['category'] : undefined;
    let category = explicitCategory;
    if (!category && input.error) {
      try {
        const { classifyError } = await import('@/shared/errors/error-classifier');
        category = classifyError(input.error);
      } catch {
        // Fallback if import fails
      }
    }

    const errorCode =
      (typeof input.context?.['errorCode'] === 'string' ? input.context['errorCode'] : undefined) ??
      errorInfo?.code;
    const errorName =
      (typeof input.context?.['errorName'] === 'string' ? input.context['errorName'] : undefined) ??
      errorInfo?.name;
    const service =
      (typeof input.service === 'string' && input.service.trim().length > 0
        ? input.service.trim()
        : null) ??
      (typeof input.context?.['service'] === 'string' && input.context['service'].trim().length > 0
        ? input.context['service'].trim()
        : null) ??
      resolveServiceFromSource(input.source) ??
      undefined;
    const traceId =
      (typeof input.traceId === 'string' && input.traceId.trim().length > 0
        ? input.traceId.trim()
        : null) ??
      requestInfo.traceId ??
      (typeof input.context?.['traceId'] === 'string' && input.context['traceId'].trim().length > 0
        ? input.context['traceId'].trim()
        : null) ??
      null;
    const correlationId =
      (typeof input.correlationId === 'string' && input.correlationId.trim().length > 0
        ? input.correlationId.trim()
        : null) ??
      requestInfo.correlationId ??
      (typeof input.context?.['correlationId'] === 'string' &&
      input.context['correlationId'].trim().length > 0
        ? input.context['correlationId'].trim()
        : null) ??
      null;
    const spanId =
      (typeof input.spanId === 'string' && input.spanId.trim().length > 0
        ? input.spanId.trim()
        : null) ??
      (typeof input.context?.['spanId'] === 'string' && input.context['spanId'].trim().length > 0
        ? input.context['spanId'].trim()
        : null) ??
      null;
    const parentSpanId =
      (typeof input.parentSpanId === 'string' && input.parentSpanId.trim().length > 0
        ? input.parentSpanId.trim()
        : null) ??
      (typeof input.context?.['parentSpanId'] === 'string' &&
      input.context['parentSpanId'].trim().length > 0
        ? input.context['parentSpanId'].trim()
        : null) ??
      null;
    const otelTraceId =
      (typeof input.context?.['otelTraceId'] === 'string' &&
      input.context['otelTraceId'].trim().length > 0
        ? input.context['otelTraceId'].trim()
        : null) ??
      activeOtelContext.otelTraceId ??
      null;
    const otelSpanId =
      (typeof input.context?.['otelSpanId'] === 'string' &&
      input.context['otelSpanId'].trim().length > 0
        ? input.context['otelSpanId'].trim()
        : null) ??
      activeOtelContext.otelSpanId ??
      null;
    const otelTraceFlags =
      (typeof input.context?.['otelTraceFlags'] === 'string' &&
      input.context['otelTraceFlags'].trim().length > 0
        ? input.context['otelTraceFlags'].trim()
        : null) ??
      activeOtelContext.otelTraceFlags ??
      null;

    const fingerprint =
      input.level === 'error' || input.level === 'warn' || errorInfo
        ? buildErrorFingerprint({
          message: input.message,
          source: input.source ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          statusCode: input.statusCode ?? null,
          errorInfo,
        })
        : null;
    const context = {
      ...(input.context ?? {}),
      ...(category ? { category } : {}),
      ...(errorInfo ? { error: errorInfo } : {}),
      ...(errorCode ? { errorCode } : {}),
      ...(errorName ? { errorName } : {}),
      ...(service ? { service } : {}),
      ...(traceId ? { traceId } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(spanId ? { spanId } : {}),
      ...(parentSpanId ? { parentSpanId } : {}),
      ...(otelTraceId ? { otelTraceId } : {}),
      ...(otelSpanId ? { otelSpanId } : {}),
      ...(otelTraceFlags ? { otelTraceFlags } : {}),
      ...(fingerprint ? { fingerprint } : {}),
    };

    const critical =
      typeof input.critical === 'boolean'
        ? input.critical
        : typeof input.context?.['critical'] === 'boolean'
          ? Boolean(input.context?.['critical'])
          : false;

    // Emit to console for standard logging and capture tools
    const consoleMsg = `[${input.source || 'system'}] ${input.message}`;
    if (input.level === 'error' || critical) {
      console.error(consoleMsg, context);
    } else if (input.level === 'warn') {
      console.warn(consoleMsg, context);
    } else {
      console.log(consoleMsg, context);
    }

    if (typeof window !== 'undefined') {
      return;
    }

    // Fire-and-forget background task for server-side enrichment, forwarding, and DB persistence.
    // This keeps request handling latency low while using one canonical hydrated context.
    void (async () => {
      try {
        let hydratedContext = context;
        try {
          const { hydrateLogRuntimeContext } =
            await import('./runtime-context/hydrate-system-log-runtime-context');
          hydratedContext = (await hydrateLogRuntimeContext(context)) ?? context;
        } catch (enrichmentError) {
          console.error(
            '[system-logger] Failed to attach registry runtime context',
            enrichmentError
          );
        }

        emitOtelLogRecord({
          level: input.level ?? 'info',
          message: input.message,
          source: input.source ?? null,
          service: service ?? null,
          category: category ?? null,
          context: hydratedContext,
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          method: requestInfo.method ?? null,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
          userId: input.userId ?? null,
        });

        const forwardPromise = forwardToCentralizedLogging({
          level: input.level ?? 'info',
          message: input.message,
          source: input.source ?? null,
          service: service ?? null,
          category: category ?? null,
          context: hydratedContext,
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          method: requestInfo.method ?? null,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
          userId: input.userId ?? null,
          fingerprint: fingerprint ?? null,
          createdAt: new Date().toISOString(),
        });
        const createSystemLog = await loadCreateSystemLog();
        if (!createSystemLog) {
          await forwardPromise;
          return;
        }
        const created: SystemLogRecord = await createSystemLog({
          level: input.level ?? 'info',
          message: input.message,
          category: category ?? null,
          source: input.source ?? null,
          service: service ?? null,
          context: sanitizeValue(hydratedContext),
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? requestInfo.path : undefined,
          method: requestInfo.method,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
          userId: input.userId ?? null,
        });
        await forwardPromise;

        if (critical) {
          const notifyFn = await loadNotifyCriticalError();
          if (notifyFn) {
            await notifyFn(created, critical);
          }
        }
      } catch (err) {
        console.error('[system-logger] Failed to persist log asynchronously', err);
      }
    })();
  } catch (error) {
    console.error('[system-logger] Failed to process system log', error);
  }
}

export async function logSystemError(input: Omit<SystemLogInput, 'level'>): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}

export { ErrorSystem } from '../../utils/observability/error-system';
export { getSystemLogById, getSystemLogMetrics, listSystemLogs } from './system-log-repository';
