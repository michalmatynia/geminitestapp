import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPathRunRepositoryMock, resolveWithExpansionMock, getVersionMock, getByIdsMock } =
  vi.hoisted(() => ({
    getPathRunRepositoryMock: vi.fn(),
    resolveWithExpansionMock: vi.fn(),
    getVersionMock: vi.fn(),
    getByIdsMock: vi.fn(),
  }));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  retrievalService: {
    resolveWithExpansion: resolveWithExpansionMock,
  },
  registryBackend: {
    getVersion: getVersionMock,
    getByIds: getByIdsMock,
  },
}));

const buildRun = () =>
  ({
    id: 'run-1',
    pathId: 'path-1',
    pathName: 'Primary Path',
    status: 'failed',
    entityId: 'product-1',
    entityType: 'product',
    triggerEvent: 'manual_run',
    triggerNodeId: 'trigger-1',
    createdAt: '2026-03-02T10:00:00.000Z',
    startedAt: '2026-03-02T10:00:05.000Z',
    finishedAt: '2026-03-02T10:00:20.000Z',
    deadLetteredAt: null,
    meta: {
      runtimeFingerprint: 'runtime-fp-1',
    },
    graph: {
      nodes: [
        {
          id: 'model-a',
          type: 'model',
          title: 'Primary Model',
          config: { model: { modelId: 'gpt-4o-mini' } },
        },
      ],
      edges: [],
    },
  }) as any;

const buildNodes = () =>
  [
    {
      id: 'node-1',
      runId: 'run-1',
      nodeId: 'model-a',
      nodeType: 'model',
      nodeTitle: 'Primary Model',
      status: 'completed',
      attempt: 1,
      errorMessage: null,
      createdAt: '2026-03-02T10:00:05.000Z',
      updatedAt: '2026-03-02T10:00:07.000Z',
      startedAt: '2026-03-02T10:00:05.000Z',
      finishedAt: '2026-03-02T10:00:07.000Z',
    },
  ] as any[];

const buildEvents = () =>
  [
    {
      id: 'event-1',
      runId: 'run-1',
      level: 'error',
      message: 'Fallback model crashed.',
      nodeId: 'model-a',
      nodeType: 'model',
      nodeTitle: 'Primary Model',
      createdAt: '2026-03-02T10:00:12.500Z',
    },
  ] as any[];

const buildRegistryNodes = () => [
  {
    id: 'page:ai-paths',
    kind: 'page',
    name: 'AI Paths Canvas',
    description: 'Visual editor for AI path graphs.',
    tags: ['ai', 'paths', 'canvas'],
    relationships: [{ type: 'uses', targetId: 'action:run-ai-path' }],
  },
  {
    id: 'action:run-ai-path',
    kind: 'action',
    name: 'Run AI Path',
    description: 'Queues an AI path run.',
    tags: ['ai', 'paths', 'execution'],
    relationships: [{ type: 'writes', targetId: 'collection:ai-path-runs' }],
  },
  {
    id: 'collection:ai-path-runs',
    kind: 'collection',
    name: 'ai_path_runs',
    description: 'AI path runtime records.',
    tags: ['ai', 'paths', 'runs'],
    relationships: [],
  },
] as any[];

describe('hydrate-system-log-runtime-context', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    const repo = {
      findRunById: vi.fn().mockResolvedValue(buildRun()),
      listRunNodes: vi.fn().mockResolvedValue(buildNodes()),
      listRunEvents: vi.fn().mockResolvedValue(buildEvents()),
    };

    getPathRunRepositoryMock.mockResolvedValue(repo);
    resolveWithExpansionMock.mockReturnValue({
      nodes: buildRegistryNodes(),
      truncated: false,
      visitedIds: ['page:ai-paths', 'action:run-ai-path', 'collection:ai-path-runs'],
    });
    getVersionMock.mockReturnValue('codefirst:3');
    getByIdsMock.mockReturnValue(buildRegistryNodes());
  });

  it('returns the original context when no adapter matches', async () => {
    const { hydrateLogRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const context = {
      fingerprint: 'fp-1',
      service: 'system',
    };

    const result = await hydrateLogRuntimeContext(context);

    expect(result).toBe(context);
  });

  it('preserves top-level keys while merging static context from the adapter', async () => {
    const { hydrateLogRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const result = await hydrateLogRuntimeContext({
      runId: 'run-1',
      fingerprint: 'fp-1',
      category: 'runtime',
      error: { message: 'boom' },
      service: 'ai-paths-worker',
    });

    expect(result).toEqual(
      expect.objectContaining({
        runId: 'run-1',
        fingerprint: 'fp-1',
        category: 'runtime',
        error: { message: 'boom' },
        service: 'ai-paths-worker',
        staticContext: {
          aiPathRun: expect.objectContaining({
            runId: 'run-1',
          }),
        },
      })
    );
  });

  it('skips rehydration when adapter-owned static context already exists', async () => {
    const { hydrateLogRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const context = {
      runId: 'run-1',
      staticContext: {
        aiPathRun: {
          kind: 'ai_path_run',
          runId: 'run-1',
        },
      },
    };

    const result = await hydrateLogRuntimeContext(context);

    expect(result).toBe(context);
    expect(getPathRunRepositoryMock).not.toHaveBeenCalled();
  });

  it('keeps only fingerprint plus adapter-backed static context in AI sanitization', async () => {
    const { sanitizeSystemLogForAi } = await import(
      '@/shared/lib/observability/runtime-context/sanitize-system-log-for-ai'
    );

    const sanitized = await sanitizeSystemLogForAi({
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      source: 'ai-paths-worker',
      context: {
        runId: 'run-1',
        fingerprint: 'fp-1',
        service: 'ai-paths-worker',
      },
      stack: null,
      path: '/api/ai-paths/runs',
      method: 'POST',
      statusCode: 500,
      requestId: null,
      userId: null,
      createdAt: '2026-03-02T10:01:00.000Z',
      updatedAt: null,
    });

    expect(sanitized).toEqual(
      expect.objectContaining({
        id: 'log-1',
        context: {
          fingerprint: 'fp-1',
          staticContext: {
            aiPathRun: expect.objectContaining({
              runId: 'run-1',
            }),
          },
        },
      })
    );
    expect((sanitized.context as Record<string, unknown>)['service']).toBeUndefined();
  });
});
