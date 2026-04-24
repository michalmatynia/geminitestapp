import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  removePathRunQueueEntriesMock,
  recordRuntimeRunFinishedMock,
  publishRunUpdateMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  removePathRunQueueEntriesMock: vi.fn(),
  recordRuntimeRunFinishedMock: vi.fn(),
  publishRunUpdateMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: publishRunUpdateMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const loadModule = async () =>
  await import('@/features/ai/ai-paths/services/path-run-management-service');

describe('path-run-management lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T12:00:00.000Z'));
    removePathRunQueueEntriesMock.mockResolvedValue(undefined);
    recordRuntimeRunFinishedMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels queued or running runs without legacy recovery statuses', async () => {
    const run = {
      id: 'run-1',
      status: 'running',
      startedAt: '2026-04-09T11:59:00.000Z',
      meta: { runOrigin: 'test' },
    };
    const updatedRun = {
      ...run,
      status: 'canceled',
      finishedAt: '2026-04-09T12:00:00.000Z',
      meta: {
        runOrigin: 'test',
        cancellation: {
          requestedAt: '2026-04-09T12:00:00.000Z',
          previousStatus: 'running',
          phase: 'requested',
        },
      },
    };
    const repo = {
      findRunById: vi.fn().mockResolvedValue(run),
      updateRunIfStatus: vi.fn().mockResolvedValue(updatedRun),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    };

    const { cancelPathRunWithRepository } = await loadModule();
    const result = await cancelPathRunWithRepository(repo as never, 'run-1');

    expect(result).toEqual(updatedRun);
    expect(repo.updateRunIfStatus).toHaveBeenCalledWith(
      'run-1',
      ['queued', 'running'],
      expect.objectContaining({
        status: 'canceled',
        finishedAt: '2026-04-09T12:00:00.000Z',
      })
    );
    expect(recordRuntimeRunFinishedMock).toHaveBeenCalledWith({
      runId: 'run-1',
      status: 'canceled',
      durationMs: 60_000,
      timestamp: '2026-04-09T12:00:00.000Z',
    });
    expect(publishRunUpdateMock).toHaveBeenCalledWith('run-1', 'done', {
      status: 'canceled',
      traceId: 'run-1',
    });
    expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith(['run-1']);
  });
});
