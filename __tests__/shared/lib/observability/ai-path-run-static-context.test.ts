import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveRefsMock,
  getVersionMock,
  hydrateLogRuntimeContextMock,
  hydrateSystemLogRecordRuntimeContextMock,
  sanitizeSystemLogForAiMock,
} = vi.hoisted(() => ({
  resolveRefsMock: vi.fn(),
  getVersionMock: vi.fn(),
  hydrateLogRuntimeContextMock: vi.fn(),
  hydrateSystemLogRecordRuntimeContextMock: vi.fn(),
  sanitizeSystemLogForAiMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: resolveRefsMock,
    getVersion: getVersionMock,
  },
}));

vi.mock('@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context', () => ({
  hydrateLogRuntimeContext: hydrateLogRuntimeContextMock,
  hydrateSystemLogRecordRuntimeContext: hydrateSystemLogRecordRuntimeContextMock,
}));

vi.mock('@/shared/lib/observability/runtime-context/sanitize-system-log-for-ai', () => ({
  sanitizeSystemLogForAi: sanitizeSystemLogForAiMock,
}));

const buildRuntimeDocument = () => ({
  id: 'runtime:ai-path-run:run-1',
  kind: 'runtime_document' as const,
  entityType: 'ai_path_run',
  title: 'Primary Path',
  summary: 'failed AI Path run',
  status: 'failed',
  tags: ['ai-paths', 'runtime', 'failed'],
  relatedNodeIds: ['page:ai-paths', 'action:run-ai-path', 'collection:ai-path-runs'],
  timestamps: {
    createdAt: '2026-03-02T10:00:00.000Z',
    startedAt: '2026-03-02T10:00:05.000Z',
    finishedAt: '2026-03-02T10:00:20.000Z',
    deadLetteredAt: null,
  },
  facts: {
    runId: 'run-1',
    pathId: 'path-1',
    pathName: 'Primary Path',
    status: 'failed',
    entityId: 'product-1',
    entityType: 'product',
    triggerEvent: 'manual_run',
    triggerNodeId: 'trigger-1',
    runtimeFingerprint: 'runtime-fp-1',
    totalNodes: 3,
    completedNodes: 1,
    failedNodes: 1,
    warningNodes: 1,
    totalEvents: 3,
    errorEvents: 1,
    warnEvents: 1,
  },
  sections: [
    {
      id: 'executed-models',
      kind: 'items' as const,
      title: 'Executed Models',
      items: [
        {
          nodeId: 'model-a',
          modelId: 'gpt-4o-mini',
          usesBrainDefault: false,
          status: 'completed',
          attempt: 1,
        },
        {
          nodeId: 'model-b',
          modelId: null,
          usesBrainDefault: true,
          status: 'failed',
          attempt: 2,
          errorMessage: 'Fallback model failed',
        },
      ],
    },
    {
      id: 'failed-nodes',
      kind: 'items' as const,
      title: 'Failed Nodes',
      items: [
        {
          nodeId: 'model-b',
          nodeType: 'model',
          status: 'failed',
          attempt: 2,
          errorMessage: 'Fallback model failed',
        },
      ],
    },
    {
      id: 'recent-runtime-errors',
      kind: 'events' as const,
      title: 'Recent Runtime Errors',
      items: [
        {
          createdAt: '2026-03-02T10:00:12.500Z',
          level: 'warn',
          message: 'Validator warning.',
          nodeId: 'validator-1',
        },
      ],
    },
    {
      id: 'preflight',
      kind: 'facts' as const,
      title: 'Preflight',
      items: [
        { label: 'compileErrorCount', value: 1 },
        { label: 'validationErrorCount', value: 1 },
        { label: 'dependencyStrictReady', value: false },
        { label: 'dataContractErrorCount', value: 1 },
        { label: 'samples', value: ['Compile exploded'] },
      ],
    },
  ],
  provenance: {
    providerId: 'ai-path-run',
  },
});

const buildResolvedBundle = () => ({
  refs: [
    {
      id: 'runtime:ai-path-run:run-1',
      kind: 'runtime_document' as const,
      providerId: 'ai-path-run',
      entityType: 'ai_path_run',
    },
  ],
  nodes: [
    {
      id: 'page:ai-paths',
      kind: 'page' as const,
      name: 'AI Paths Canvas',
      description: 'Visual editor for AI path graphs.',
      tags: ['ai', 'paths', 'canvas'],
      permissions: {
        readScopes: [],
        riskTier: 'low' as const,
        classification: 'internal' as const,
      },
      version: 'codefirst:3',
      updatedAtISO: '2026-03-02T10:00:00.000Z',
      source: { type: 'code' as const, ref: 'registry/pages.ts' },
      relationships: [{ type: 'uses' as const, targetId: 'action:run-ai-path' }],
    },
    {
      id: 'action:run-ai-path',
      kind: 'action' as const,
      name: 'Run AI Path',
      description: 'Queues an AI path run.',
      tags: ['ai', 'paths', 'execution'],
      permissions: {
        readScopes: [],
        riskTier: 'low' as const,
        classification: 'internal' as const,
      },
      version: 'codefirst:3',
      updatedAtISO: '2026-03-02T10:00:00.000Z',
      source: { type: 'code' as const, ref: 'registry/actions.ts' },
      relationships: [{ type: 'writes' as const, targetId: 'collection:ai-path-runs' }],
    },
    {
      id: 'collection:ai-path-runs',
      kind: 'collection' as const,
      name: 'ai_path_runs',
      description: 'AI path runtime records.',
      tags: ['ai', 'paths', 'runs'],
      permissions: {
        readScopes: [],
        riskTier: 'low' as const,
        classification: 'internal' as const,
      },
      version: 'codefirst:3',
      updatedAtISO: '2026-03-02T10:00:00.000Z',
      source: { type: 'code' as const, ref: 'registry/collections.ts' },
      relationships: [],
    },
  ],
  documents: [buildRuntimeDocument()],
  truncated: false,
  engineVersion: 'registry:codefirst:3|providers:ai-path-run@1',
});

const loadModule = async () =>
  await import('@/shared/lib/observability/ai-path-run-static-context');

describe('ai-path-run static context compatibility shim', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    resolveRefsMock.mockResolvedValue(buildResolvedBundle());
    getVersionMock.mockReturnValue('registry:codefirst:3|providers:ai-path-run@1');
    hydrateLogRuntimeContextMock.mockImplementation(async (context) => context);
    hydrateSystemLogRecordRuntimeContextMock.mockImplementation(async (log) => log);
    sanitizeSystemLogForAiMock.mockImplementation(async (log) => ({ id: log.id }));
  });

  it('builds the legacy bounded AI-path snapshot from the registry-owned runtime document', async () => {
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
        version: 'registry:codefirst:3|providers:ai-path-run@1',
        refs: ['page:ai-paths', 'action:run-ai-path', 'collection:ai-path-runs'],
      })
    );
  });

  it('keeps the old helper exports delegating to the new runtime-context wrappers', async () => {
    const {
      hydrateLogContextWithAiPathRunStaticContext,
      hydrateSystemLogWithAiPathRunStaticContext,
      sanitizeSystemLogForAiInsight,
    } = await loadModule();

    const context = { runId: 'run-1' };
    const log = {
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      context,
      createdAt: '2026-03-02T10:01:00.000Z',
    } as any;

    await hydrateLogContextWithAiPathRunStaticContext(context);
    await hydrateSystemLogWithAiPathRunStaticContext(log);
    await sanitizeSystemLogForAiInsight(log);

    expect(hydrateLogRuntimeContextMock).toHaveBeenCalledWith(context);
    expect(hydrateSystemLogRecordRuntimeContextMock).toHaveBeenCalledWith(log);
    expect(sanitizeSystemLogForAiMock).toHaveBeenCalledWith(log);
  });
});
