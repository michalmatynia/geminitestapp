import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths';

const {
  getPathRunRepositoryMock,
  enqueuePathRunJobMock,
  removePathRunQueueEntriesMock,
  recordRuntimeRunQueuedMock,
  recordRuntimeRunFinishedMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  enqueuePathRunJobMock: vi.fn(),
  removePathRunQueueEntriesMock: vi.fn(),
  recordRuntimeRunQueuedMock: vi.fn(),
  recordRuntimeRunFinishedMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  enqueuePathRunJob: enqueuePathRunJobMock,
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeRunQueued: recordRuntimeRunQueuedMock,
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-fingerprint', () => ({
  getAiPathsRuntimeFingerprint: () => 'runtime-fingerprint-test',
  withRuntimeFingerprintMeta: (meta: Record<string, unknown>) => meta,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const loadModule = async () => await import('@/features/ai/ai-paths/services/path-run-service');

describe('path-run-service enqueuePathRun', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects legacy node identities instead of repairing them during enqueue', async () => {
    const config = createDefaultPathConfig('path_legacy_enqueue');
    const legacyNodeId = 'node-legacy-parser';
    const firstNodeId = config.nodes[0]?.id as string;
    const nodes = config.nodes.map((node, index) =>
      index === 0
        ? {
            ...node,
            id: legacyNodeId,
            instanceId: legacyNodeId,
          }
        : node
    );
    const edges = config.edges.map((edge) => ({
      ...edge,
      from: edge.from === firstNodeId ? legacyNodeId : edge.from,
      to: edge.to === firstNodeId ? legacyNodeId : edge.to,
    }));

    const createRunMock = vi.fn();
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
      createRun: createRunMock,
    });

    const { enqueuePathRun } = await loadModule();

    await expect(
      enqueuePathRun({
        pathId: config.id,
        pathName: config.name,
        nodes,
        edges,
      })
    ).rejects.toThrow(/legacy node identities/i);
    expect(createRunMock).not.toHaveBeenCalled();
  });

  it('accepts canonical graphs without recording identity repair metadata', async () => {
    const config = createDefaultPathConfig('path_canonical_enqueue');
    const listRunsMock = vi.fn().mockResolvedValue({ runs: [], total: 0 });
    const createRunMock = vi.fn().mockResolvedValue({
      id: 'run-1',
      pathId: config.id,
      status: 'queued',
      startedAt: null,
      meta: null,
    });
    const createRunNodesMock = vi.fn().mockResolvedValue(undefined);
    const createRunEventMock = vi.fn().mockResolvedValue(undefined);

    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
      createRun: createRunMock,
      createRunNodes: createRunNodesMock,
      createRunEvent: createRunEventMock,
      updateRunIfStatus: vi.fn().mockResolvedValue(null),
    });
    enqueuePathRunJobMock.mockResolvedValue(undefined);
    recordRuntimeRunQueuedMock.mockResolvedValue(undefined);

    const { enqueuePathRun } = await loadModule();
    const run = await enqueuePathRun({
      pathId: config.id,
      pathName: config.name,
      nodes: config.nodes,
      edges: config.edges,
      meta: {
        aiPathsValidation: {
          enabled: false,
        },
      },
    });

    expect(run.id).toBe('run-1');
    expect(listRunsMock).not.toHaveBeenCalled();
    expect(createRunNodesMock).toHaveBeenCalledWith('run-1', config.nodes);
    expect(enqueuePathRunJobMock).toHaveBeenCalledWith('run-1', undefined);
    expect(createRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: {
          nodes: config.nodes,
          edges: config.edges,
        },
        meta: expect.not.objectContaining({
          identityRepair: expect.anything(),
        }),
      })
    );
  });

  it('uses canonical requestId lookup only once when deduplicating enqueue runs', async () => {
    const config = createDefaultPathConfig('path_request_id_dedupe');
    const existingRun = {
      id: 'run-existing',
      pathId: config.id,
      status: 'queued',
      startedAt: null,
      meta: { requestId: 'req-123' },
    };
    const listRunsMock = vi.fn().mockResolvedValue({ runs: [existingRun], total: 1 });
    const createRunMock = vi.fn();

    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
      createRun: createRunMock,
      createRunNodes: vi.fn(),
      createRunEvent: vi.fn(),
      updateRunIfStatus: vi.fn().mockResolvedValue(null),
    });

    const { enqueuePathRun } = await loadModule();
    const run = await enqueuePathRun({
      pathId: config.id,
      pathName: config.name,
      nodes: config.nodes,
      edges: config.edges,
      requestId: 'req-123',
      meta: {
        aiPathsValidation: {
          enabled: false,
        },
      },
    });

    expect(run.id).toBe('run-existing');
    expect(listRunsMock).toHaveBeenCalledTimes(1);
    expect(listRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: config.id,
        requestId: 'req-123',
        limit: 1,
        offset: 0,
      })
    );
    expect(createRunMock).not.toHaveBeenCalled();
  });
});
