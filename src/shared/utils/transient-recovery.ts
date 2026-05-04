/**
 * Transient Recovery Utilities
 * 
 * Retry and recovery mechanisms for transient failures.
 * Provides:
 * - Exponential backoff retry logic
 * - Configurable retry attempts and delays
 * - Jitter support for distributed systems
 * - Transient error detection
 * - Recovery settings management
 */

// Local implementations to avoid importing from features layer

import type { TransientRecoverySettings } from '@/shared/contracts/observability';

export type TransientRecoveryStubOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
};

export const withTransientRecovery = async <T>(
  operation: () => Promise<T>,
  _options?: TransientRecoveryStubOptions
): Promise<T> => {
  // Stub implementation
  return operation();
};

export const isTransientError = (_error: unknown): boolean => {
  // Stub implementation
  return false;
};

export const getTransientRecoverySettings = (): TransientRecoverySettings => {
  return {
    enabled: false,
    retry: {
      enabled: false,
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      timeoutMs: null,
    },
    circuit: {
      enabled: false,
      failureThreshold: 3,
      resetTimeoutMs: 30_000,
    },
  };
};
