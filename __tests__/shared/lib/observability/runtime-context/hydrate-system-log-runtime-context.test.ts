import { beforeEach, describe, expect, it, vi } from 'vitest';

const { inferRefsMock, resolveRefsMock, getVersionMock } = vi.hoisted(() => ({
  inferRefsMock: vi.fn(),
  resolveRefsMock: vi.fn(),
  getVersionMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    inferRefs: inferRefsMock,
    resolveRefs: resolveRefsMock,
    getVersion: getVersionMock,
  },
}));

const buildRef = (runId: string) => ({
  id: `runtime:ai-path-run:${runId}`,
  kind: 'runtime_document' as const,
  providerId: 'ai-path-run',
  entityType: 'ai_path_run',
});

const buildResolvedBundle = (runId: string) => ({
  refs: [buildRef(runId)],
  nodes: [
    {
      id: 'page:ai-paths',
      kind: 'page',
      name: 'AI Paths',
      description: 'AI paths runtime page.',
      tags: ['ai', 'paths'],
      permissions: {
        readScopes: [],
        riskTier: 'low',
        classification: 'internal',
      },
      version: 'codefirst:1',
      updatedAtISO: '2026-03-02T10:00:00.000Z',
      source: { type: 'code', ref: 'registry/pages.ts' },
      relationships: [],
    },
  ],
  documents: [
    {
      id: `runtime:ai-path-run:${runId}`,
      kind: 'runtime_document' as const,
      entityType: 'ai_path_run',
      title: 'Primary Path',
      summary: 'failed AI Path run',
      status: 'failed',
      tags: ['ai-paths', 'runtime', 'failed'],
      relatedNodeIds: ['page:ai-paths'],
      timestamps: {
        createdAt: '2026-03-02T10:00:00.000Z',
      },
      facts: {
        runId,
        pathName: 'Primary Path',
      },
      sections: [
        {
          id: 'failed-nodes',
          kind: 'items' as const,
          title: 'Failed Nodes',
          items: [{ nodeId: 'model-b', status: 'failed' }],
        },
      ],
      provenance: {
        providerId: 'ai-path-run',
      },
    },
  ],
  truncated: false,
  engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
});

describe('hydrate-system-log-runtime-context', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getVersionMock.mockReturnValue('registry:codefirst:7|providers:ai-path-run@1');
    inferRefsMock.mockReturnValue([buildRef('run-1')]);
    resolveRefsMock.mockResolvedValue(buildResolvedBundle('run-1'));
  });

  it('returns the original context when no runtime refs can be inferred', async () => {
    inferRefsMock.mockReturnValue([]);

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

  it('preserves top-level keys while attaching canonical context registry refs', async () => {
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
        contextRegistry: {
          refs: [buildRef('run-1')],
          engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
        },
      })
    );
  });

  it('strips legacy AI-path snapshots from new write-time context while keeping canonical refs', async () => {
    const { hydrateLogRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const result = await hydrateLogRuntimeContext({
      runId: 'run-1',
      staticContext: {
        aiPathRun: {
          kind: 'ai_path_run',
          runId: 'run-1',
        },
      },
    });

    expect(result).toEqual({
      runId: 'run-1',
      contextRegistry: {
        refs: [buildRef('run-1')],
        engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
      },
    });
  });

  it('hydrates canonical refs into resolved runtime documents for read-time consumers', async () => {
    const { hydrateSystemLogRecordRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const result = await hydrateSystemLogRecordRuntimeContext({
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      source: 'ai-paths-worker',
      context: {
        contextRegistry: {
          refs: [buildRef('run-1')],
          engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
        },
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

    expect(resolveRefsMock).toHaveBeenCalledWith({
      refs: [buildRef('run-1')],
      maxNodes: 16,
      depth: 1,
    });
    expect(result.context).toEqual(
      expect.objectContaining({
        contextRegistry: expect.objectContaining({
          refs: [buildRef('run-1')],
          resolved: expect.objectContaining({
            documents: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
            nodes: [expect.objectContaining({ id: 'page:ai-paths' })],
          }),
        }),
      })
    );
  });

  it('does not infer refs from legacy aiPathRun snapshots without canonical runId/context refs', async () => {
    inferRefsMock.mockReturnValue([]);

    const { hydrateSystemLogRecordRuntimeContext } = await import(
      '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context'
    );

    const result = await hydrateSystemLogRecordRuntimeContext({
      id: 'log-legacy',
      level: 'error',
      message: 'Legacy run failed',
      source: 'ai-paths-worker',
      context: {
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-legacy',
          },
        },
      },
      stack: null,
      path: null,
      method: null,
      statusCode: 500,
      requestId: null,
      userId: null,
      createdAt: '2026-03-02T10:01:00.000Z',
      updatedAt: null,
    });

    expect(inferRefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-legacy',
          },
        },
      })
    );
    expect(result.context).toEqual(
      expect.objectContaining({
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-legacy',
          },
        },
      })
    );
    expect((result.context as Record<string, unknown>)['contextRegistry']).toBeUndefined();
  });

  it('keeps only fingerprint plus registry context in AI sanitization', async () => {
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
          contextRegistry: expect.objectContaining({
            refs: [buildRef('run-1')],
            resolved: expect.objectContaining({
              documents: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
            }),
          }),
        },
      })
    );
    expect((sanitized.context as Record<string, unknown>)['service']).toBeUndefined();
  });
});
