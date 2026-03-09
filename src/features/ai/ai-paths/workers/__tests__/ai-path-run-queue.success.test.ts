import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createManagedQueueMock,
  getPathRunRepositoryMock,
  mutateAgentLeaseMock,
  processRunMock,
  processStaleRunRecoveryMock,
  recordRuntimeRunStartedMock,
  recordRuntimeRunBlockedOnLeaseMock,
} = vi.hoisted(() => ({
  createManagedQueueMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  mutateAgentLeaseMock: vi.fn(),
  processRunMock: vi.fn(),
  processStaleRunRecoveryMock: vi.fn(),
  recordRuntimeRunStartedMock: vi.fn(),
  recordRuntimeRunBlockedOnLeaseMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
  getRedisConnection: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/shared/lib/agent-lease-service', () => ({
  mutateAgentLease: mutateAgentLeaseMock,
}));

vi.mock('@/features/ai/ai-paths/workers/ai-path-run-processor', () => ({
  processRun: processRunMock,
  processStaleRunRecovery: processStaleRunRecoveryMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeRunStarted: recordRuntimeRunStartedMock,
  recordRuntimeRunBlockedOnLease: recordRuntimeRunBlockedOnLeaseMock,
}));

const createQueueMock = () => ({
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
  enqueue: vi.fn(),
  getQueue: vi.fn(() => ({})),
  getHealthStatus: vi.fn(),
});

const loadModule = async () =>
  await import('@/features/ai/ai-paths/workers/ai-path-run-queue/queue');

describe('ai-path-run queue execution lease success', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createManagedQueueMock.mockReturnValue(createQueueMock());
    processRunMock.mockResolvedValue(undefined);
    processStaleRunRecoveryMock.mockResolvedValue(undefined);
    recordRuntimeRunStartedMock.mockResolvedValue(undefined);
    recordRuntimeRunBlockedOnLeaseMock.mockResolvedValue(undefined);
  });

  it('processes the run and releases the execution lease after a successful claim', async () => {
    const claimRunForProcessingMock = vi.fn().mockResolvedValue({
      id: 'run-1',
      status: 'running',
      meta: null,
    });

    getPathRunRepositoryMock.mockResolvedValue({
      claimRunForProcessing: claimRunForProcessingMock,
      updateRunIfStatus: vi.fn(),
      createRunEvent: vi.fn(),
    });
    mutateAgentLeaseMock
      .mockReturnValueOnce({
        ok: true,
        code: 'claimed',
        message: 'Lease claimed.',
        state: null,
        event: null,
        conflictingLease: null,
        lease: {
          leaseId: 'lease-1',
          resourceId: 'ai-paths.run.execution',
          scopeId: 'run-1',
          resourceType: 'workflow',
          ownerAgentId: 'agent-queue-worker',
          ownerRunId: 'run-1',
          mode: 'partitioned',
          status: 'active',
          leaseMs: 300000,
          heartbeatMs: 30000,
          claimedAt: '2026-03-09T10:00:00.000Z',
          heartbeatAt: null,
          expiresAt: '2026-03-09T10:05:00.000Z',
          releasedAt: null,
          releaseReason: null,
        },
      })
      .mockReturnValueOnce({
        ok: true,
        code: 'released',
        message: 'Lease released.',
        state: null,
        event: null,
        conflictingLease: null,
        lease: null,
      });

    await loadModule();

    const config = createManagedQueueMock.mock.calls[0]?.[0] as
      | {
          processor?: (
            data: { runId: string; type: 'run' | 'recovery' },
            jobId: string,
            signal?: AbortSignal
          ) => Promise<void>;
        }
      | undefined;

    if (!config?.processor) {
      throw new Error('Expected the AI Paths queue module to register a managed queue processor.');
    }

    await config.processor({ runId: 'run-1', type: 'run' }, 'job-1');

    expect(claimRunForProcessingMock).toHaveBeenCalledWith('run-1');
    expect(mutateAgentLeaseMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'claim',
        resourceId: 'ai-paths.run.execution',
        scopeId: 'run-1',
        ownerRunId: 'run-1',
      })
    );
    expect(recordRuntimeRunStartedMock).toHaveBeenCalledWith({ runId: 'run-1' });
    expect(processRunMock).toHaveBeenCalled();
    expect(recordRuntimeRunBlockedOnLeaseMock).not.toHaveBeenCalled();
    expect(mutateAgentLeaseMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'release',
        resourceId: 'ai-paths.run.execution',
        scopeId: 'run-1',
        leaseId: 'lease-1',
      })
    );
  });
});
