import {
  isRetryableError,
  getRetryDelay,
  externalServiceError,
  timeoutError,
  wrapError,
} from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';
import { delay } from './time-utils';

// Local type definition to avoid importing from features layer
type SystemLogLevel = 'info' | 'warn' | 'error';

type LogSystemEventParams = {
  level: SystemLogLevel;
  message: string;
  source: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

// Real implementation from features layer via dynamic import to avoid circular dependencies
const logSystemEvent = async (params: LogSystemEventParams): Promise<void> => {
  try {
    const mod = await import('@/shared/lib/observability/system-logger');
    await mod.logSystemEvent(params);
  } catch (error) {
    reportObservabilityInternalError(error, {
      source: 'shared.retry',
      action: 'logSystemEventFallback',
      level: params.level,
      eventSource: params.source,
    });
    logger.error('Failed to log system event via observability feature', error, {
      service: 'shared.retry',
    });
    logger.info('System event (fallback)', {
      service: 'shared.retry',
      level: params.level,
      message: params.message,
      source: params.source,
      ...(params.error !== undefined ? { error: params.error } : {}),
      ...(params.context ? { context: params.context } : {}),
    });
  }
};

/**
 * Configuration for retry behavior.
 */
export type RetryOptions = {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to delay (default: true) */
  jitter?: boolean;
  /** Timeout for each attempt in milliseconds (optional) */
  timeoutMs?: number;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
  /** Source identifier for logging */
  source?: string;
  /** Whether to log retry attempts */
  logRetries?: boolean;
};

const DEFAULT_OPTIONS: Required<
  Omit<RetryOptions, 'timeoutMs' | 'onRetry' | 'isRetryable' | 'source'>
> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  logRetries: true,
};

/**
 * Calculates delay for next retry with exponential backoff and optional jitter.
 */
function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'timeoutMs' | 'onRetry' | 'isRetryable' | 'source'>>
): number {
  const exponentialDelay =
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  if (options.jitter) {
    // Add random jitter of ±25%
    const jitterFactor = 0.75 + Math.random() * 0.5;
    return Math.round(cappedDelay * jitterFactor);
  }

  return cappedDelay;
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise<T>(
    (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => {
      const timer = setTimeout(() => {
        reject(timeoutError(`Operation timed out after ${timeoutMs}ms`, { operation }));
      }, timeoutMs);

      promise
        .then((result: T) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(wrapError(error));
        });
    }
  );
}

const performRetryAttempt = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  source: string
): Promise<T> => {
  if (timeoutMs !== 0) {
    return withTimeout(operation(), timeoutMs, source);
  }
  return operation();
};

type LogRetryAttemptParams = {
  error: unknown;
  attempt: number;
  maxAttempts: number;
  nextDelay: number;
  source: string;
};

const logRetryEvent = (params: LogRetryAttemptParams): void => {
  const { error, attempt, maxAttempts, nextDelay, source } = params;
  logSystemEvent({
    level: 'warn',
    message: `Retry attempt ${attempt}/${maxAttempts} after ${nextDelay}ms`,
    source,
    error,
    context: {
      attempt,
      maxAttempts,
      delayMs: nextDelay,
    },
  }).catch((logError) => logger.error('Failed to log retry event', logError));
};

const resolveRetryDecision = (
  error: unknown,
  attempt: number,
  maxAttempts: number,
  options: Required<RetryOptions & { source: string }>
): { shouldRetry: boolean; nextDelay: number } => {
  const { isRetryable, source } = options;

  const shouldRetry = attempt < maxAttempts && (isRetryable(error) || isRetryableError(error));

  logClientCatch(error, {
    source,
    action: 'withRetryAttempt',
    attempt,
    maxAttempts,
    willRetry: shouldRetry,
  });

  if (!shouldRetry) {
    return { shouldRetry: false, nextDelay: 0 };
  }

  const errorDelay = getRetryDelay(error);
  const nextDelay = errorDelay ?? calculateDelay(attempt, options);

  return { shouldRetry: true, nextDelay };
};

const executeRetryLoop = async <T>(
  operation: () => Promise<T>,
  fullOpts: Required<RetryOptions & { source: string }>
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= fullOpts.maxAttempts; attempt++) {
    try {
       
      return await performRetryAttempt(operation, fullOpts.timeoutMs, fullOpts.source);
    } catch (error) {
      lastError = error;
      const { shouldRetry, nextDelay } = resolveRetryDecision(
        error,
        attempt,
        fullOpts.maxAttempts,
        fullOpts
      );

      if (!shouldRetry) {
        throw error;
      }

      if (fullOpts.logRetries) {
        logRetryEvent({ error, attempt, maxAttempts: fullOpts.maxAttempts, nextDelay, source: fullOpts.source });
      }

      fullOpts.onRetry(attempt, error, nextDelay);
       
      await delay(nextDelay);
    }
  }

  throw lastError;
};

const resolveFullOptions = (options?: RetryOptions): Required<RetryOptions & { source: string }> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const source = options?.source ?? 'operation';
  return {
    ...opts,
    timeoutMs: options?.timeoutMs ?? 0,
    isRetryable: options?.isRetryable ?? ((err): boolean => isRetryableError(err)),
    onRetry: options?.onRetry ?? ((): void => {}),
    source,
  };
};

/**
 * Executes an async operation with automatic retries on failure.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return executeRetryLoop(operation, resolveFullOptions(options));
}

const handleRetryAllFailure = (error: unknown, index: number, options?: RetryOptions): { success: false; error: unknown } => {
  logClientCatch(error, {
    source: options?.source ?? 'shared.retry',
    action: 'withRetryAllOperation',
    operationIndex: index,
  });
  return { success: false as const, error };
};

const retryAllOperation = async <T>(
  op: () => Promise<T>,
  index: number,
  options?: RetryOptions
): Promise<{ success: true; result: T } | { success: false; error: unknown }> => {
  try {
    const result = await withRetry(op, options);
    return { success: true as const, result };
  } catch (error) {
    return handleRetryAllFailure(error, index, options);
  }
};

/**
 * Executes multiple operations in parallel with retry support.
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  options?: RetryOptions
): Promise<Array<{ success: true; result: T } | { success: false; error: unknown }>> {
  return Promise.all(
    operations.map((op, index) => retryAllOperation(op, index, options))
  );
}

/**
 * Circuit breaker state for a service.
 */
type CircuitState = {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
};

const circuitStates = new Map<string, CircuitState>();

/**
 * Configuration for circuit breaker.
 */
export type CircuitBreakerOptions = {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  circuitId: string;
};

const DEFAULT_CIRCUIT_OPTIONS = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
};

/**
 * Executes an operation with circuit breaker pattern.
 */
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  options: CircuitBreakerOptions
): Promise<T> {
  const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
  const { circuitId, failureThreshold, resetTimeoutMs } = opts;

  let state = circuitStates.get(circuitId);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitStates.set(circuitId, state);
  }

  if (state.isOpen) {
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure < resetTimeoutMs) {
      throw externalServiceError(
        `Circuit breaker open for ${circuitId}`,
        { circuitId, resetInMs: resetTimeoutMs - timeSinceLastFailure },
        { retryable: true, retryAfterMs: resetTimeoutMs - timeSinceLastFailure }
      );
    }
    state.isOpen = false;
  }

  try {
    return await operation();
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();
    logClientCatch(error, {
      source: 'circuit-breaker',
      action: 'operationFailure',
      circuitId,
      failures: state.failures,
      failureThreshold,
    });

    if (state.failures >= failureThreshold) {
      state.isOpen = true;
      logSystemEvent({
        level: 'error',
        message: `Circuit breaker opened for ${circuitId} after ${state.failures} failures`,
        source: 'circuit-breaker',
        context: {
          circuitId,
          failures: state.failures,
          resetTimeoutMs,
        },
      }).catch((logError) => logger.error('Failed to log circuit breaker event', logError));
    }

    throw error;
  }
}

/**
 * Resets a circuit breaker to closed state.
 */
export function resetCircuitBreaker(circuitId: string): void {
  circuitStates.delete(circuitId);
}

/**
 * Gets the current state of a circuit breaker.
 */
export function getCircuitBreakerState(circuitId: string): CircuitState | undefined {
  return circuitStates.get(circuitId);
}
