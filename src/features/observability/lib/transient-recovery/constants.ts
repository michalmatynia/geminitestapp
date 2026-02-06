export const TRANSIENT_RECOVERY_KEYS = {
  settings: 'transient_recovery_settings',
} as const;

export type TransientRecoverySettings = {
  enabled: boolean;
  retry: {
    enabled: boolean;
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number | null;
  };
  circuit: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
  };
};

export const DEFAULT_TRANSIENT_RECOVERY_SETTINGS: TransientRecoverySettings = {
  enabled: true,
  retry: {
    enabled: true,
    maxAttempts: 3,
    initialDelayMs: 800,
    maxDelayMs: 8000,
    timeoutMs: 12000,
  },
  circuit: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 60000,
  },
};
