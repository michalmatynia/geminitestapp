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
      graphCompile: {
        errors: ['Compile exploded'],
        warnings: ['Compile warning'],
        findings: [{ nodeId: 'validator-1', issue: 'missing edge' }],
      },
      runPreflight: {
        validation: {
          errors: ['Validation exploded'],
          warnings: ['Validation warning'],
        },
        dependency: {
          errors: ['Dependency exploded'],
          warnings: ['Dependency warning'],
          strictReady: false,
        },
        dataContract: {
          errors: ['Data contract exploded'],
          warnings: ['Data contract warning'],
          issues: [{ nodeId: 'validator-1', message: 'Missing field title' }],
        },
        warnings: ['General preflight warning'],
      },
    },
    graph: {
      nodes: [
        {
          id: 'model-a',
          type: 'model',
          title: 'Primary Model',
          config: { model: { modelId: 'gpt-4o-mini' } },
        },
        {
          id: 'model-b',
          type: 'model',
          title: 'Fallback Model',
          config: { model: { modelId: '' } },
        },
        {
          id: 'validator-1',
          type: 'validator',
          title: 'Validator',
          config: {},
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
    {
      id: 'node-2',
      runId: 'run-1',
      nodeId: 'model-b',
      nodeType: 'model',
      nodeTitle: 'Fallback Model',
      status: 'failed',
      attempt: 2,
      errorMessage: 'Fallback model failed',
      createdAt: '2026-03-02T10:00:08.000Z',
      updatedAt: '2026-03-02T10:00:12.000Z',
      startedAt: '2026-03-02T10:00:08.000Z',
      finishedAt: '2026-03-02T10:00:12.000Z',
    },
    {
      id: 'node-3',
      runId: 'run-1',
      nodeId: 'validator-1',
      nodeType: 'validator',
      nodeTitle: 'Validator',
      status: 'blocked',
      attempt: 1,
      errorMessage: 'Missing title',
      createdAt: '2026-03-02T10:00:12.000Z',
      updatedAt: '2026-03-02T10:00:13.000Z',
      startedAt: '2026-03-02T10:00:12.000Z',
      finishedAt: '2026-03-02T10:00:13.000Z',
    },
  ] as any[];

const buildEvents = () =>
  [
    {
      id: 'event-1',
      runId: 'run-1',
      level: 'info',
      message: 'Run queued.',
      nodeId: null,
      nodeType: null,
      nodeTitle: null,
      createdAt: '2026-03-02T10:00:04.000Z',
    },
    {
      id: 'event-2',
      runId: 'run-1',
      level: 'warn',
      message: 'Validator warning.',
      nodeId: 'validator-1',
      nodeType: 'validator',
      nodeTitle: 'Validator',
      createdAt: '2026-03-02T10:00:13.000Z',
    },
    {
      id: 'event-3',
      runId: 'run-1',
      level: 'error',
      message: 'Fallback model crashed.',
      nodeId: 'model-b',
      nodeType: 'model',
      nodeTitle: 'Fallback Model',
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

const loadModule = async () =>
  await import('@/shared/lib/observability/ai-path-run-static-context');

describe('ai-path-run static context', () => {
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

  it('builds a bounded AI path run snapshot with executed models, failures, and registry context', async () => {
    const { buildAiPathRunStaticContext } = await loadModule();

    const result = await buildAiPathRunStaticContext('run-1');

    expect(result).not.toBeNull();
    expect(result?.kind).toBe('ai_path_run');
    expect(result?.summary).toEqual(
      expect.objectContaining({
        totalNodes: 3,
        completedNodes: 1,
        failedNodes: 1,
        warningNodes: 1,
        totalEvents: 3,
        errorEvents: 1,
        warnEvents: 1,
      })
    );
    expect(result?.executedModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'model-a',
          modelId: 'gpt-4o-mini',
          usesBrainDefault: false,
        }),
        expect.objectContaining({
          nodeId: 'model-b',
          modelId: null,
          usesBrainDefault: true,
          errorMessage: 'Fallback model failed',
        }),
      ])
    );
    expect(result?.failedNodes).toEqual([
      expect.objectContaining({
        nodeId: 'model-b',
        status: 'failed',
      }),
    ]);
    expect(result?.recentErrorEvents[0]).toEqual(
      expect.objectContaining({
        level: 'warn',
        nodeId: 'validator-1',
      })
    );
    expect(result?.preflight).toEqual(
      expect.objectContaining({
        compileErrorCount: 1,
        validationErrorCount: 1,
        dependencyStrictReady: false,
        dataContractErrorCount: 1,
      })
    );
    expect(result?.registry).toEqual(
      expect.objectContaining({
        version: 'codefirst:3',
        refs: ['page:ai-paths', 'action:run-ai-path', 'collection:ai-path-runs'],
      })
    );
    expect(result?.registry.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'page:ai-paths' }),
        expect.objectContaining({ id: 'action:run-ai-path' }),
        expect.objectContaining({ id: 'collection:ai-path-runs' }),
      ])
    );
  });

  it('hydrates log context and keeps only fingerprint plus static AI-path context for AI insights', async () => {
    const {
      hydrateLogContextWithAiPathRunStaticContext,
      sanitizeSystemLogForAiInsight,
    } = await loadModule();

    const hydratedContext = await hydrateLogContextWithAiPathRunStaticContext({
      runId: 'run-1',
      fingerprint: 'fp-log-1',
      service: 'ai-paths-worker',
    });

    expect(hydratedContext).toEqual(
      expect.objectContaining({
        runId: 'run-1',
        fingerprint: 'fp-log-1',
        staticContext: expect.objectContaining({
          aiPathRun: expect.objectContaining({
            runId: 'run-1',
            runtimeFingerprint: 'runtime-fp-1',
          }),
        }),
      })
    );

    const sanitized = await sanitizeSystemLogForAiInsight({
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      source: 'ai-paths-worker',
      context: {
        runId: 'run-1',
        fingerprint: 'fp-log-1',
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
          fingerprint: 'fp-log-1',
          staticContext: {
            aiPathRun: expect.objectContaining({
              runId: 'run-1',
              executedModels: expect.any(Array),
            }),
          },
        },
      })
    );
    expect((sanitized.context as Record<string, unknown>)['service']).toBeUndefined();
  });
});
