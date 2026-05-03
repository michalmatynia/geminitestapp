import { beforeEach, describe, expect, it, vi } from 'vitest';

const transientRecoveryMocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  logClientCatch: vi.fn(),
  logSystemEvent: vi.fn(),
  reportObservabilityInternalError: vi.fn(),
}));

vi.mock('./settings', () => ({
  getTransientRecoverySettings: transientRecoveryMocks.getSettings,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: transientRecoveryMocks.logSystemEvent,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: transientRecoveryMocks.logClientCatch,
  logClientError: vi.fn(),
}));

vi.mock('@/shared/utils/observability/internal-observability-fallback', () => ({
  reportObservabilityInternalError: transientRecoveryMocks.reportObservabilityInternalError,
}));

import { externalServiceError } from '@/shared/errors/app-error';
import { resetCircuitBreaker } from '@/shared/utils/retry';

import { withTransientRecovery } from './with-recovery';

describe('withTransientRecovery', () => {
  beforeEach(() => {
    resetCircuitBreaker('base-api');
    vi.clearAllMocks();
    transientRecoveryMocks.getSettings.mockResolvedValue({
      enabled: true,
      retry: {
        enabled: true,
        maxAttempts: 1,
        initialDelayMs: 1,
        maxDelayMs: 1,
        timeoutMs: null,
      },
      circuit: {
        enabled: true,
        failureThreshold: 1,
        resetTimeoutMs: 60_000,
      },
    });
  });

  it('does not report an exhausted transient operation failure as an internal observability failure', async () => {
    const baseApiError = externalServiceError(
      'Base API request failed (502).',
      { method: 'getInventoryProductsList', status: 502 },
      { retryable: true }
    );

    await expect(
      withTransientRecovery(
        async () => {
          throw baseApiError;
        },
        {
          source: 'base-api',
          circuitId: 'base-api',
          retry: { maxAttempts: 1, logRetries: false },
        }
      )
    ).rejects.toBe(baseApiError);

    expect(transientRecoveryMocks.reportObservabilityInternalError).not.toHaveBeenCalled();
  });

  it('does not report an open circuit as an internal observability failure', async () => {
    await expect(
      withTransientRecovery(
        async () => {
          throw externalServiceError(
            'Base API request failed (502).',
            { method: 'getInventoryProductsList', status: 502 },
            { retryable: true }
          );
        },
        {
          source: 'base-api',
          circuitId: 'base-api',
          retry: { maxAttempts: 1, logRetries: false },
        }
      )
    ).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_ERROR',
      retryable: true,
    });

    const blockedOperation = vi.fn(async () => 'ok');
    await expect(
      withTransientRecovery(blockedOperation, {
        source: 'base-api',
        circuitId: 'base-api',
        retry: { maxAttempts: 1, logRetries: false },
      })
    ).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_ERROR',
      meta: { circuitId: 'base-api' },
      retryable: true,
    });

    expect(blockedOperation).not.toHaveBeenCalled();
    expect(transientRecoveryMocks.reportObservabilityInternalError).not.toHaveBeenCalled();
  });

  it('reports fallback failures because those are recovery failures', async () => {
    const fallbackError = new Error('fallback failed');

    await expect(
      withTransientRecovery(
        async () => {
          throw externalServiceError(
            'Base API request failed (502).',
            { method: 'getInventoryProductsList', status: 502 },
            { retryable: true }
          );
        },
        {
          source: 'base-api',
          retry: { maxAttempts: 1, logRetries: false },
          fallback: async () => {
            throw fallbackError;
          },
        }
      )
    ).rejects.toBe(fallbackError);

    expect(transientRecoveryMocks.reportObservabilityInternalError).toHaveBeenCalledWith(
      fallbackError,
      expect.objectContaining({
        source: 'observability.transient-recovery',
        action: 'fallback',
        recoverySource: 'base-api',
      })
    );
  });
});
