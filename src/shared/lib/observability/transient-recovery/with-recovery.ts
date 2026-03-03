import { isRetryableError } from '@/shared/errors/app-error';
import {
  withRetry,
  type RetryOptions,
  withCircuitBreaker,
  type CircuitBreakerOptions,
} from '@/shared/utils/retry';

import { getTransientRecoverySettings } from './settings';

import type { TransientRecoverySettings } from './constants';

export type TransientRecoveryOptions = {
  source?: string;
  circuitId?: string;
  fallback?: () => unknown;
  retry?: RetryOptions;
  circuit?: Omit<CircuitBreakerOptions, 'circuitId'>;
};

const logRecoveryFallbackExecuted = async (
  source: string | undefined,
  error: unknown
): Promise<void> => {
  if (typeof window !== 'undefined') return;
  try {
    const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
    await logSystemEvent({
      level: 'warn',
      message: '[transient-recovery] fallback executed',
      source: source ?? 'transient-recovery',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
  } catch {
    // logging must never interrupt recovery fallback
  }
};

export const isTransientError = (error: unknown): boolean => {
  if (isRetryableError(error)) return true;
  if (!(error instanceof Error)) return false;
  const message: string = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('ecconn') ||
    message.includes('econn') ||
    message.includes('network') ||
    message.includes('eai_again') ||
    message.includes('enotfound')
  );
};

export async function withTransientRecovery<T>(
  operation: () => Promise<T>,
  options?: TransientRecoveryOptions
): Promise<T> {
  const retryOptions: RetryOptions | undefined = options?.retry;
  const circuitId: string | undefined = options?.circuitId;
  const settings: TransientRecoverySettings = await getTransientRecoverySettings();
  if (!settings.enabled) {
    return operation();
  }

  const execute = async (): Promise<T> => {
    if (!settings.retry.enabled) {
      return operation();
    }
    const retryConfig: RetryOptions = {
      maxAttempts: retryOptions?.maxAttempts ?? settings.retry.maxAttempts,
      initialDelayMs: retryOptions?.initialDelayMs ?? settings.retry.initialDelayMs,
      maxDelayMs: retryOptions?.maxDelayMs ?? settings.retry.maxDelayMs,
      source: retryOptions?.source ?? options?.source ?? 'transient-recovery',
      isRetryable: retryOptions?.isRetryable ?? isTransientError,
    };
    if (retryOptions?.timeoutMs !== undefined) {
      retryConfig.timeoutMs = retryOptions.timeoutMs;
    } else if (settings.retry.timeoutMs !== null) {
      retryConfig.timeoutMs = settings.retry.timeoutMs;
    }
    if (retryOptions?.backoffMultiplier !== undefined) {
      retryConfig.backoffMultiplier = retryOptions.backoffMultiplier;
    }
    if (retryOptions?.jitter !== undefined) {
      retryConfig.jitter = retryOptions.jitter;
    }
    if (retryOptions?.onRetry) {
      retryConfig.onRetry = retryOptions.onRetry;
    }
    if (retryOptions?.logRetries !== undefined) {
      retryConfig.logRetries = retryOptions.logRetries;
    }
    return withRetry(operation, retryConfig);
  };

  try {
    if (circuitId && settings.circuit.enabled) {
      return await withCircuitBreaker(execute, {
        circuitId,
        failureThreshold: options?.circuit?.failureThreshold ?? settings.circuit.failureThreshold,
        resetTimeoutMs: options?.circuit?.resetTimeoutMs ?? settings.circuit.resetTimeoutMs,
      });
    }
    return await execute();
  } catch (error) {
    if (options?.fallback && isTransientError(error)) {
      void logRecoveryFallbackExecuted(options?.source, error);
      return (await options.fallback()) as T;
    }
    throw error;
  }
}
