/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loggerErrorMock,
  reportObservabilityInternalErrorMock,
  loadCentralLogDeadLettersMock,
  saveCentralLogDeadLettersMock,
  withTransientRecoveryMock,
  isTransientErrorMock,
} = vi.hoisted(() => ({
  loggerErrorMock: vi.fn(),
  reportObservabilityInternalErrorMock: vi.fn(),
  loadCentralLogDeadLettersMock: vi.fn(),
  saveCentralLogDeadLettersMock: vi.fn(),
  withTransientRecoveryMock: vi.fn(async (callback: () => Promise<unknown>) => await callback()),
  isTransientErrorMock: vi.fn(() => true),
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

vi.mock('@/shared/utils/observability/internal-observability-fallback', () => ({
  reportObservabilityInternalError: reportObservabilityInternalErrorMock,
}));

vi.mock('@/shared/lib/observability/central-log-dead-letter-store', () => ({
  loadCentralLogDeadLetters: loadCentralLogDeadLettersMock,
  saveCentralLogDeadLetters: saveCentralLogDeadLettersMock,
}));

vi.mock('@/shared/lib/observability/transient-recovery/with-recovery', () => ({
  withTransientRecovery: withTransientRecoveryMock,
  isTransientError: isTransientErrorMock,
}));

const originalWebhookUrl = process.env['CENTRAL_LOG_WEBHOOK_URL'];

const createPayload = (message = 'forward me') => ({
  level: 'error' as const,
  message,
  source: 'unit-test',
  createdAt: '2026-03-27T00:00:00.000Z',
});

const loadModule = async () => {
  vi.resetModules();
  return await import('@/shared/lib/observability/system-logger-central-forwarding');
};

describe('system-logger-central-forwarding shared-lib coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env['CENTRAL_LOG_WEBHOOK_URL'];
    loadCentralLogDeadLettersMock.mockResolvedValue([]);
    saveCentralLogDeadLettersMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    if (originalWebhookUrl === undefined) {
      delete process.env['CENTRAL_LOG_WEBHOOK_URL'];
      return;
    }
    process.env['CENTRAL_LOG_WEBHOOK_URL'] = originalWebhookUrl;
  });

  it('skips forwarding in browser or when no webhook is configured', async () => {
    const mod = await loadModule();

    vi.stubGlobal('window', {} as Window & typeof globalThis);
    await expect(mod.forwardToCentralizedLogging(createPayload())).resolves.toBe('skipped');

    vi.unstubAllGlobals();
    await expect(mod.forwardToCentralizedLogging(createPayload())).resolves.toBe('skipped');

    const stats = mod.getCentralLoggingRuntimeStats();
    expect(stats.configured).toBe(false);
    expect(stats.skipped).toBe(2);
    expect(loadCentralLogDeadLettersMock).not.toHaveBeenCalled();
  });

  it('reports invalid webhook urls through runtime stats', async () => {
    process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'not a valid url';
    const mod = await loadModule();

    const stats = mod.getCentralLoggingRuntimeStats();

    expect(stats.configured).toBe(true);
    expect(stats.webhookHost).toBeNull();
    expect(reportObservabilityInternalErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'observability.system-log-central-forwarding',
        action: 'getCentralLogWebhookHost',
      })
    );
  });

  it('delivers logs successfully and exposes runtime counters', async () => {
    process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'https://logs.example.test/webhook';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    const mod = await loadModule();

    await expect(mod.forwardToCentralizedLogging(createPayload('delivered'))).resolves.toBe(
      'delivered'
    );

    expect(loadCentralLogDeadLettersMock).toHaveBeenCalledWith({ maxEntries: 200 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://logs.example.test/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createPayload('delivered')),
      })
    );
    const stats = mod.getCentralLoggingRuntimeStats();
    expect(stats.configured).toBe(true);
    expect(stats.webhookHost).toBe('logs.example.test');
    expect(stats.attempts).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('queues failed deliveries into the dead-letter backlog and persists them', async () => {
    process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'https://logs.example.test/webhook';
    const fetchMock = vi.fn().mockRejectedValue(new Error('network outage'));
    vi.stubGlobal('fetch', fetchMock);
    const mod = await loadModule();

    await expect(mod.forwardToCentralizedLogging(createPayload('failed'))).resolves.toBe('failed');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveCentralLogDeadLettersMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          payload: createPayload('failed'),
          lastError: 'network outage',
          retryCount: 1,
        }),
      ],
      { maxEntries: 200 }
    );
    const stats = mod.getCentralLoggingRuntimeStats();
    expect(stats.failed).toBe(1);
    expect(stats.deadLetterBacklog).toBe(1);
    expect(stats.deadLetterQueued).toBe(1);
    expect(stats.deadLetterPersisted).toBe(1);
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(reportObservabilityInternalErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'observability.system-log-central-forwarding',
        action: 'forwardToCentralizedLogging',
      })
    );
  });

  it('replays dead letters after a later successful delivery', async () => {
    process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'https://logs.example.test/webhook';
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    const mod = await loadModule();

    await mod.forwardToCentralizedLogging(createPayload('first'));
    await mod.forwardToCentralizedLogging(createPayload('second'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stats = mod.getCentralLoggingRuntimeStats();
    expect(stats.delivered).toBe(1);
    expect(stats.replayDelivered).toBe(1);
    expect(stats.deadLetterReplayed).toBe(1);
    expect(stats.deadLetterBacklog).toBe(0);
    expect(saveCentralLogDeadLettersMock).toHaveBeenCalledTimes(2);
  });
});
