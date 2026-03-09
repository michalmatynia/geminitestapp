import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPathRunRepositoryMock,
  removePathRunQueueEntriesMock,
  recordRuntimeRunHandoffReadyMock,
  publishRunUpdateMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  removePathRunQueueEntriesMock: vi.fn(),
  recordRuntimeRunHandoffReadyMock: vi.fn(),
  publishRunUpdateMock: vi.fn(),
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
  recordRuntimeRunHandoffReady: recordRuntimeRunHandoffReadyMock,
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: publishRunUpdateMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-fingerprint', () => ({
  getAiPathsRuntimeFingerprint: () => 'runtime-fingerprint-test',
  withRuntimeFingerprintMeta: (meta: Record<string, unknown>) => meta,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
    logWarning: logWarningMock,
  },
}));

const loadModule = async () =>
  await import('@/features/ai/ai-paths/services/path-run-management-service');

describe('path-run-management handoff transition', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('marks blocked runs handoff-ready and emits runtime side effects', async () => {
    const createRunEventMock = vi.fn().mockResolvedValue(undefined);
    const updateRunIfStatusMock = vi.fn().mockResolvedValue({
      id: 'run-1',
      status: 'handoff_ready',
      meta: {
        handoff: {
          readyAt: '2026-03-09T12:00:00.000Z',
          reason: 'Execution lease is still owned by another worker.',
          previousStatus: 'blocked_on_lease',
          checkpointLineageId: 'run-1:checkpoint',
          requestedBy: 'user-1',
        },
      },
    });

    getPathRunRepositoryMock.mockResolvedValue({
      findRunById: vi.fn().mockResolvedValue({
        id: 'run-1',
        status: 'blocked_on_lease',
        meta: {
          executionLease: {
            resourceId: 'ai-paths.run.execution',
            scopeId: 'run-1',
          },
        },
      }),
      updateRunIfStatus: updateRunIfStatusMock,
      createRunEvent: createRunEventMock,
    });
    recordRuntimeRunHandoffReadyMock.mockResolvedValue(undefined);

    const { markPathRunHandoffReady } = await loadModule();
    const run = await markPathRunHandoffReady({
      runId: 'run-1',
      reason: 'Execution lease is still owned by another worker.',
      checkpointLineageId: 'run-1:checkpoint',
      requestedBy: 'user-1',
    });

    expect(run).toEqual(
      expect.objectContaining({
        id: 'run-1',
        status: 'handoff_ready',
      })
    );
    expect(updateRunIfStatusMock).toHaveBeenCalledWith(
      'run-1',
      ['blocked_on_lease'],
      expect.objectContaining({
        status: 'handoff_ready',
        meta: expect.objectContaining({
          executionLease: expect.objectContaining({
            resourceId: 'ai-paths.run.execution',
            scopeId: 'run-1',
          }),
          handoff: expect.objectContaining({
            reason: 'Execution lease is still owned by another worker.',
            previousStatus: 'blocked_on_lease',
            checkpointLineageId: 'run-1:checkpoint',
            requestedBy: 'user-1',
          }),
        }),
      })
    );
    expect(createRunEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        level: 'warn',
        message: 'Run marked handoff-ready for delegated continuation.',
        metadata: expect.objectContaining({
          reason: 'Execution lease is still owned by another worker.',
          previousStatus: 'blocked_on_lease',
          checkpointLineageId: 'run-1:checkpoint',
          requestedBy: 'user-1',
          runtimeFingerprint: 'runtime-fingerprint-test',
          traceId: 'run-1',
        }),
      })
    );
    expect(recordRuntimeRunHandoffReadyMock).toHaveBeenCalledWith({ runId: 'run-1' });
    expect(publishRunUpdateMock).toHaveBeenCalledWith(
      'run-1',
      'run',
      expect.objectContaining({
        status: 'handoff_ready',
        reason: 'Execution lease is still owned by another worker.',
        checkpointLineageId: 'run-1:checkpoint',
        traceId: 'run-1',
      })
    );
    expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith(['run-1']);
  });

  it('returns the current run unchanged when the status is not handoff-eligible', async () => {
    const currentRun = {
      id: 'run-2',
      status: 'running',
      meta: null,
    };
    const updateRunIfStatusMock = vi.fn();
    const createRunEventMock = vi.fn();

    getPathRunRepositoryMock.mockResolvedValue({
      findRunById: vi.fn().mockResolvedValue(currentRun),
      updateRunIfStatus: updateRunIfStatusMock,
      createRunEvent: createRunEventMock,
    });

    const { markPathRunHandoffReady } = await loadModule();
    const run = await markPathRunHandoffReady({
      runId: 'run-2',
      requestedBy: 'user-1',
    });

    expect(run).toBe(currentRun);
    expect(updateRunIfStatusMock).not.toHaveBeenCalled();
    expect(createRunEventMock).not.toHaveBeenCalled();
    expect(recordRuntimeRunHandoffReadyMock).not.toHaveBeenCalled();
    expect(publishRunUpdateMock).not.toHaveBeenCalled();
    expect(removePathRunQueueEntriesMock).not.toHaveBeenCalled();
  });
});
