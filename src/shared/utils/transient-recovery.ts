// Local implementations to avoid importing from features layer

export type TransientRecoveryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
};

export type TransientRecoverySettings = {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
};

export const withTransientRecovery = async <T>(
  operation: () => Promise<T>,
  options?: TransientRecoveryOptions
): Promise<T> => {
  // Stub implementation
  return operation();
};

export const isTransientError = (error: unknown): boolean => {
  // Stub implementation
  return false;
};

export const getTransientRecoverySettings = (): TransientRecoverySettings => {
  return {
    enabled: false,
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };
};