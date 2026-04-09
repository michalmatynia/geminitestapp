import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPathRunRepositoryMock,
  removePathRunQueueEntriesMock,
  recordRuntimeRunFinishedMock,
  recordRuntimeRunQueuedMock,
  publishRunUpdateMock,
  dispatchRunMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  removePathRunQueueEntriesMock: vi.fn(),
  recordRuntimeRunFinishedMock: vi.fn(),
  recordRuntimeRunQueuedMock: vi.fn(),
  publishRunUpdateMock: vi.fn(),
  dispatchRunMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
  recordRuntimeRunQueued: recordRuntimeRunQueuedMock,
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: publishRunUpdateMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-fingerprint', () => ({
  getAiPathsRuntimeFingerprint: () => 'runtime-fingerprint-test',
  withRuntimeFingerprintMeta: (meta: Record<string, unknown>) => meta,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-enqueue-service', () => ({
  ACTIVE_RUN_STATUSES: new Set(['queued', 'running']),
  dispatchRun: dispatchRunMock,
  resolveDispatchErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
  resolveRunStartedAt: (run: { startedAt?: string | null }) => run.startedAt ?? null,
}));

vi.mock('@/shared/lib/ai-paths/error-reporting', () => ({
  buildAiPathErrorReport: ({ code, category, scope, retryable }: Record<string, unknown>) => ({
    code,
    category,
    scope,
    retryable,
  }),
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
    recordRuntimeRunQueuedMock.mockResolvedValue(undefined);
    publishRunUpdateMock.mockReset();
    dispatchRunMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels in-flight runs, records analytics, and schedules queue cleanup', async () => {
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
      ['queued', 'running', 'blocked_on_lease', 'handoff_ready', 'paused'],
      expect.objectContaining({
        status: 'canceled',
        finishedAt: '2026-04-09T12:00:00.000Z',
        meta: expect.objectContaining({
          cancellation: expect.objectContaining({
            requestedAt: '2026-04-09T12:00:00.000Z',
            previousStatus: 'running',
            phase: 'requested',
          }),
        }),
      })
    );
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        level: 'warn',
        message: 'Cancellation requested. Run marked canceled while in-flight work stops.',
        metadata: expect.objectContaining({
          cancellationRequestedAt: '2026-04-09T12:00:00.000Z',
          cancellationPhase: 'requested',
          runtimeFingerprint: 'runtime-fingerprint-test',
          traceId: 'run-1',
        }),
      })
    );
    expect(recordRuntimeRunFinishedMock).toHaveBeenCalledWith({
      runId: 'run-1',
      status: 'canceled',
      durationMs: 60_000,
      timestamp: new Date('2026-04-09T12:00:00.000Z'),
    });
    expect(publishRunUpdateMock).toHaveBeenCalledWith('run-1', 'done', {
      status: 'canceled',
      traceId: 'run-1',
    });
    expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith(['run-1']);
  });

  it('reverts resumed runs when dispatch fails and emits a failure event', async () => {
    const run = {
      id: 'run-2',
      status: 'failed',
      errorMessage: 'previous failure',
      retryCount: 2,
      nextRetryAt: '2026-04-09T12:30:00.000Z',
      deadLetteredAt: null,
      meta: { runOrigin: 'test' },
    };
    const queuedRun = {
      ...run,
      status: 'queued',
      startedAt: '2026-04-09T12:00:00.000Z',
      meta: {
        runOrigin: 'test',
        resumeMode: 'replay',
        retryNodeIds: [],
      },
    };
    const revertedRun = {
      ...queuedRun,
      status: 'failed',
      meta: {
        ...queuedRun.meta,
        resumeDispatchFailure: {
          failedAt: '2026-04-09T12:00:00.000Z',
          reason: 'queue offline',
          revertedToStatus: 'failed',
          mode: 'replay',
        },
      },
    };
    const repo = {
      findRunById: vi.fn().mockResolvedValue(run),
      updateRunIfStatus: vi
        .fn()
        .mockResolvedValueOnce(queuedRun)
        .mockResolvedValueOnce(revertedRun),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    };
    getPathRunRepositoryMock.mockResolvedValue(repo);
    dispatchRunMock.mockRejectedValue(new Error('queue offline'));

    const { resumePathRun } = await loadModule();

    await expect(resumePathRun('run-2', 'replay')).rejects.toThrow(
      'Run dispatch failed: queue offline'
    );

    expect(repo.updateRunIfStatus).toHaveBeenNthCalledWith(
      1,
      'run-2',
      ['failed'],
      expect.objectContaining({
        status: 'queued',
        errorMessage: null,
        retryCount: 0,
        nextRetryAt: null,
        deadLetteredAt: null,
        meta: expect.objectContaining({
          resumeMode: 'replay',
          retryNodeIds: [],
        }),
      })
    );
    expect(repo.updateRunIfStatus).toHaveBeenNthCalledWith(
      2,
      'run-2',
      ['queued'],
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'previous failure',
        retryCount: 2,
        nextRetryAt: '2026-04-09T12:30:00.000Z',
        deadLetteredAt: null,
        meta: expect.objectContaining({
          resumeDispatchFailure: expect.objectContaining({
            failedAt: '2026-04-09T12:00:00.000Z',
            reason: 'queue offline',
            revertedToStatus: 'failed',
            mode: 'replay',
          }),
        }),
      })
    );
    expect(repo.createRunEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        runId: 'run-2',
        level: 'info',
        message: 'Run resumed (replay).',
      })
    );
    expect(repo.createRunEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        runId: 'run-2',
        level: 'error',
        message: 'Run dispatch failed during resume: queue offline',
        metadata: expect.objectContaining({
          traceId: 'run-2',
          errorCode: 'AI_PATHS_RESUME_DISPATCH_FAILED',
          errorCategory: 'runtime',
          errorScope: 'enqueue',
          retryable: true,
          errorReport: expect.objectContaining({
            code: 'AI_PATHS_RESUME_DISPATCH_FAILED',
          }),
        }),
      })
    );
    expect(recordRuntimeRunQueuedMock).toHaveBeenCalledWith({ runId: 'run-2' });
    expect(publishRunUpdateMock).not.toHaveBeenCalled();
  });

  it('queues targeted node retries and resets node state before dispatch', async () => {
    const run = {
      id: 'run-3',
      status: 'failed',
      meta: { runOrigin: 'test' },
      graph: {
        nodes: [
          {
            id: 'node-target',
            type: 'database',
            title: 'Target Node',
          },
        ],
      },
    };
    const queuedRun = {
      ...run,
      status: 'queued',
      startedAt: '2026-04-09T12:00:00.000Z',
      meta: {
        runOrigin: 'test',
        resumeMode: 'retry',
        retryNodeIds: ['node-target'],
      },
    };
    const repo = {
      findRunById: vi.fn().mockResolvedValue(run),
      updateRunIfStatus: vi.fn().mockResolvedValue(queuedRun),
      upsertRunNode: vi.fn().mockResolvedValue(undefined),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    };
    getPathRunRepositoryMock.mockResolvedValue(repo);
    dispatchRunMock.mockResolvedValue(undefined);

    const { retryPathRunNode } = await loadModule();
    const result = await retryPathRunNode('run-3', 'node-target');

    expect(result).toEqual(queuedRun);
    expect(repo.upsertRunNode).toHaveBeenCalledWith('run-3', 'node-target', {
      nodeType: 'database',
      nodeTitle: 'Target Node',
      status: 'pending',
      attempt: 0,
      inputs: undefined,
      outputs: undefined,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    });
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-3',
        level: 'info',
        message: 'Retry node node-target.',
      })
    );
    expect(recordRuntimeRunQueuedMock).toHaveBeenCalledWith({ runId: 'run-3' });
    expect(dispatchRunMock).toHaveBeenCalledWith('run-3');
    expect(publishRunUpdateMock).toHaveBeenCalledWith('run-3', 'run', {
      status: 'queued',
      retryNodeId: 'node-target',
      traceId: 'run-3',
    });
  });
});
