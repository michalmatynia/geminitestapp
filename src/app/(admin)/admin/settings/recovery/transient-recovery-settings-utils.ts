import type { TransientRecoverySettings } from './transient-recovery-settings-form';
import {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  TRANSIENT_RECOVERY_KEYS,
} from '@/shared/lib/observability/transient-recovery/constants';

export type TransientRecoveryConstants = {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS: TransientRecoverySettings;
  TRANSIENT_RECOVERY_KEYS: { settings: string };
};

export const loadTransientRecoveryConstants = async (): Promise<TransientRecoveryConstants> => {
  return {
    DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
    TRANSIENT_RECOVERY_KEYS,
  };
};

export const buildInitialTransientRecoverySettings = ({
  stored,
  defaults,
}: {
  stored: TransientRecoverySettings | null;
  defaults: TransientRecoverySettings;
}): TransientRecoverySettings => {
  if (!stored) return defaults;

  return {
    enabled: stored.enabled ?? defaults.enabled,
    retry: {
      enabled: stored.retry?.enabled ?? defaults.retry.enabled,
      maxAttempts: stored.retry?.maxAttempts ?? defaults.retry.maxAttempts,
      initialDelayMs: stored.retry?.initialDelayMs ?? defaults.retry.initialDelayMs,
      maxDelayMs: stored.retry?.maxDelayMs ?? defaults.retry.maxDelayMs,
      timeoutMs:
        stored.retry?.timeoutMs === null
          ? 0
          : (stored.retry?.timeoutMs ?? defaults.retry.timeoutMs),
    },
    circuit: {
      enabled: stored.circuit?.enabled ?? defaults.circuit.enabled,
      failureThreshold: stored.circuit?.failureThreshold ?? defaults.circuit.failureThreshold,
      resetTimeoutMs: stored.circuit?.resetTimeoutMs ?? defaults.circuit.resetTimeoutMs,
    },
  };
};
