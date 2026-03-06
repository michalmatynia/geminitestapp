import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';

import { truncateString } from './log-redaction';
import { isTransientError, withTransientRecovery } from './transient-recovery/with-recovery';

export type CentralLogPayload = {
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
    const mod =
      (await import('@/shared/lib/observability/central-log-dead-letter-store')) as DeadLetterStoreModule | null;
    return mod;
  } catch (error) {
    console.error('[system-logger] Failed to load dead-letter persistence module', error);
    return null;
  }
};

const isCentralLogDeadLetterEntry = (value: unknown): value is CentralLogDeadLetterEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    !record['payload'] ||
    typeof record['payload'] !== 'object' ||
    Array.isArray(record['payload'])
  ) {
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
        centralLogDeadLetterQueue.splice(0, centralLogDeadLetterQueue.length, ...normalized);
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
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
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

export const forwardToCentralizedLogging = async (
  payload: CentralLogPayload
): Promise<CentralLogForwardResult> => {
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
