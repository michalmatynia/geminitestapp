import {
  isRetryableError,
  getRetryDelay,
  externalServiceError,
  timeoutError,
  wrapError,
} from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';

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

import { delay } from './time-utils';

/**
 * Executes an async operation with automatic retries on failure.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Optional timeout per attempt
 * - Logging of retry attempts
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetchExternalApi(),
 *   {
 *     maxAttempts: 3,
 *     source: "external-api",
 *     timeoutMs: 5000,
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxAttempts, timeoutMs, isRetryable, onRetry, source, logRetries } = {
    ...opts,
    timeoutMs: options?.timeoutMs,
    isRetryable: options?.isRetryable,
    onRetry: options?.onRetry,
    source: options?.source,
    logRetries: opts.logRetries,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Execute with optional timeout
      const result = timeoutMs
        ? await withTimeout(operation(), timeoutMs, source ?? 'operation')
        : await operation();

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < maxAttempts && (isRetryable?.(error) ?? isRetryableError(error) ?? true);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay
      const errorDelay = getRetryDelay(error);
      const nextDelay = errorDelay ?? calculateDelay(attempt, opts);

      // Log retry attempt
      if (logRetries) {
        void logSystemEvent({
          level: 'warn',
          message: `Retry attempt ${attempt}/${maxAttempts} after ${nextDelay}ms`,
          source: source ?? 'retry',
          error,
          context: {
            attempt,
            maxAttempts,
            delayMs: nextDelay,
          },
        });
      }

      // Call retry callback
      onRetry?.(attempt, error, nextDelay);

      // Wait before next attempt
      await delay(nextDelay);
    }
  }

  // All attempts failed
  throw lastError;
}

/**
 * Executes multiple operations in parallel with retry support.
 * Returns results for successful operations and errors for failed ones.
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  options?: RetryOptions
): Promise<Array<{ success: true; result: T } | { success: false; error: unknown }>> {
  return Promise.all(
    operations.map(async (op: () => Promise<T>) => {
      try {
        const result = await withRetry(op, options);
        return { success: true as const, result };
      } catch (error) {
        return { success: false as const, error };
      }
    })
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
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting to close circuit (default: 60000) */
  resetTimeoutMs?: number;
  /** Identifier for this circuit */
  circuitId: string;
};

const DEFAULT_CIRCUIT_OPTIONS = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
};

/**
 * Executes an operation with circuit breaker pattern.
 * Prevents cascade failures by temporarily blocking calls to failing services.
 *
 * @example
 * ```ts
 * const result = await withCircuitBreaker(
 *   () => callExternalService(),
 *   { circuitId: "external-service" }
 * );
 * ```
 */
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  options: CircuitBreakerOptions
): Promise<T> {
  const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
  const { circuitId, failureThreshold, resetTimeoutMs } = opts;

  // Get or initialize circuit state
  let state = circuitStates.get(circuitId);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitStates.set(circuitId, state);
  }

  // Check if circuit is open
  if (state.isOpen) {
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure < resetTimeoutMs) {
      throw externalServiceError(
        `Circuit breaker open for ${circuitId}`,
        { circuitId, resetInMs: resetTimeoutMs - timeSinceLastFailure },
        { retryable: true, retryAfterMs: resetTimeoutMs - timeSinceLastFailure }
      );
    }
    // Attempt to close circuit (half-open state)
    state.isOpen = false;
  }

  try {
    const result = await operation();

    // Success - reset failures
    state.failures = 0;
    return result;
  } catch (error) {
    // Record failure
    state.failures++;
    state.lastFailure = Date.now();

    // Check if threshold reached
    if (state.failures >= failureThreshold) {
      state.isOpen = true;
      void logSystemEvent({
        level: 'error',
        message: `Circuit breaker opened for ${circuitId} after ${state.failures} failures`,
        source: 'circuit-breaker',
        context: {
          circuitId,
          failures: state.failures,
          resetTimeoutMs,
        },
      });
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
