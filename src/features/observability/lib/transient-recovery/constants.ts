import type { TransientRecoverySettingsDto } from '@/shared/contracts/observability';
import { TRANSIENT_RECOVERY_KEYS as KEYS } from '@/shared/contracts/observability';

export const TRANSIENT_RECOVERY_KEYS = KEYS;

export type TransientRecoverySettings = TransientRecoverySettingsDto;

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
