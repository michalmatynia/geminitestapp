import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  executePathRunMock,
  getPathRunRepositoryMock,
  publishRunUpdateMock,
  recordRuntimeRunFinishedMock,
  logSystemEventMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  executePathRunMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  publishRunUpdateMock: vi.fn(),
  recordRuntimeRunFinishedMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  executePathRun: executePathRunMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: publishRunUpdateMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  recoverStaleRunningRuns: vi.fn(),
  recoverBlockedLeaseRuns: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const loadModule = async () =>
  await import('@/features/ai/ai-paths/workers/ai-path-run-processor');

describe('ai-path-run processor dead-letter transitions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T10:00:00.000Z'));
    executePathRunMock.mockRejectedValue(new Error('retryable downstream failure'));
    recordRuntimeRunFinishedMock.mockResolvedValue(undefined);
  });

  it('publishes a structured dead-letter stream event when retries are exhausted', async () => {
    const finalizeRunMock = vi.fn().mockResolvedValue(undefined);
    const findRunByIdMock = vi.fn().mockResolvedValue({
      id: 'run-dead-1',
      status: 'running',
      startedAt: '2026-04-12T09:59:30.000Z',
      retryCount: 2,
      maxAttempts: 3,
    });
    getPathRunRepositoryMock.mockResolvedValue({
      findRunById: findRunByIdMock,
      finalizeRun: finalizeRunMock,
      updateRunIfStatus: vi.fn(),
      createRunEvent: vi.fn(),
      listRuns: vi.fn(),
    });

    const { processRun } = await loadModule();

    await processRun({
      id: 'run-dead-1',
      pathId: 'path-1',
      pathName: 'Normalize Product',
      entityId: 'product-9',
      entityType: 'product',
      triggerEvent: 'manual',
      retryCount: 2,
      maxAttempts: 3,
      startedAt: '2026-04-12T09:59:30.000Z',
      meta: null,
    } as never);

    expect(finalizeRunMock).toHaveBeenCalledWith(
      'run-dead-1',
      'dead_lettered',
      expect.objectContaining({
        errorMessage: 'retryable downstream failure',
        event: expect.objectContaining({
          level: 'error',
          message: 'Run moved to dead-letter after max retries.',
          metadata: {
            retryCount: 3,
            maxAttempts: 3,
          },
        }),
      })
    );
    expect(recordRuntimeRunFinishedMock).toHaveBeenCalledWith({
      runId: 'run-dead-1',
      status: 'dead_lettered',
      durationMs: 30_000,
      timestamp: new Date('2026-04-12T10:00:00.000Z'),
    });
    expect(publishRunUpdateMock).toHaveBeenNthCalledWith(1, 'run-dead-1', 'error', {
      error: 'Max retries exceeded',
      status: 'dead_lettered',
      retryCount: 3,
      maxAttempts: 3,
    });
    expect(publishRunUpdateMock).toHaveBeenNthCalledWith(2, 'run-dead-1', 'events', {
      event: 'run.dead_lettered',
      runId: 'run-dead-1',
      pathId: 'path-1',
      pathName: 'Normalize Product',
      entityId: 'product-9',
      retryCount: 3,
      maxAttempts: 3,
      error: 'retryable downstream failure',
      durationMs: 0,
    });
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        source: 'ai-path-run-processor',
        context: expect.objectContaining({
          event: 'run.dead_lettered',
          runId: 'run-dead-1',
          retryCount: 3,
          maxAttempts: 3,
          error: 'retryable downstream failure',
        }),
      })
    );
  });
});
