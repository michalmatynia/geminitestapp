import { isRetryableError } from "@/lib/errors/app-error";
import { logSystemEvent } from "@/lib/services/system-logger";
import { withRetry, type RetryOptions, withCircuitBreaker, type CircuitBreakerOptions } from "@/lib/utils/retry";
import { getTransientRecoverySettings } from "@/lib/services/transient-recovery-settings";

export type TransientRecoveryOptions = {
  source?: string;
  circuitId?: string;
  fallback?: () => Promise<unknown> | unknown;
  retry?: RetryOptions;
  circuit?: Omit<CircuitBreakerOptions, "circuitId">;
};

export const isTransientError = (error: unknown): boolean => {
  if (isRetryableError(error)) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("ecconn") ||
    message.includes("econn") ||
    message.includes("network") ||
    message.includes("eai_again") ||
    message.includes("enotfound")
  );
};

export async function withTransientRecovery<T>(
  operation: () => Promise<T>,
  options?: TransientRecoveryOptions
): Promise<T> {
  const retryOptions = options?.retry;
  const circuitId = options?.circuitId;
  const settings = await getTransientRecoverySettings();
  if (!settings.enabled) {
    return operation();
  }

  const execute = async () => {
    if (!settings.retry.enabled) {
      return operation();
    }
    const retryConfig: RetryOptions = {
      maxAttempts: retryOptions?.maxAttempts ?? settings.retry.maxAttempts,
      initialDelayMs: retryOptions?.initialDelayMs ?? settings.retry.initialDelayMs,
      maxDelayMs: retryOptions?.maxDelayMs ?? settings.retry.maxDelayMs,
      source: retryOptions?.source ?? options?.source ?? "transient-recovery",
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
        failureThreshold:
          options?.circuit?.failureThreshold ?? settings.circuit.failureThreshold,
        resetTimeoutMs:
          options?.circuit?.resetTimeoutMs ?? settings.circuit.resetTimeoutMs,
      });
    }
    return await execute();
  } catch (error) {
    if (options?.fallback && isTransientError(error)) {
      void logSystemEvent({
        level: "warn",
        message: "Transient recovery fallback executed",
        source: options?.source ?? "transient-recovery",
        error,
      });
      return (await options.fallback()) as T;
    }
    throw error;
  }
}
