import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleHttp } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-http-handler';
import type { AiNode, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const ORIGINAL_INTERNAL_API_BASE_URL = process.env['AI_PATHS_INTERNAL_API_BASE_URL'];
const ORIGINAL_APP_URL = process.env['NEXT_PUBLIC_APP_URL'];

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-http',
    type: 'http',
    title: 'HTTP',
    description: 'HTTP node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['value'],
    outputs: ['value', 'bundle'],
    config: {
      http: {
        url: 'https://example.test/resource',
        method: 'GET',
        headers: '{}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (node: AiNode, nodeInputs: RuntimePortValues): NodeHandlerContext =>
  ({
    node,
    nodeInputs,
    prevOutputs: {},
    edges: [],
    nodes: [node],
    nodeById: new Map<string, AiNode>([[node.id, node]]),
    runId: 'run-1',
    runStartedAt: new Date().toISOString(),
    activePathId: 'path-1',
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: undefined,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: () => Promise.resolve(null),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set<string>(),
      updater: new Set<string>(),
      http: new Set<string>(),
      delay: new Set<string>(),
      poll: new Set<string>(),
      ai: new Set<string>(),
      schema: new Set<string>(),
      mapper: new Set<string>(),
    },
  }) as NodeHandlerContext;

describe('handleHttp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_INTERNAL_API_BASE_URL === undefined) {
      delete process.env['AI_PATHS_INTERNAL_API_BASE_URL'];
    } else {
      process.env['AI_PATHS_INTERNAL_API_BASE_URL'] = ORIGINAL_INTERNAL_API_BASE_URL;
    }
    if (ORIGINAL_APP_URL === undefined) {
      delete process.env['NEXT_PUBLIC_APP_URL'];
    } else {
      process.env['NEXT_PUBLIC_APP_URL'] = ORIGINAL_APP_URL;
    }
  });

  it('blocks redirect chains that resolve to disallowed hosts', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(handleHttp(buildContext(buildNode(), {}))).rejects.toThrow(
      'Blocked outbound URL: https://example.test/resource'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows allowed redirects and resolves response payload', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: '/v2/resource' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, value: 42 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleHttp(
      buildContext(
        buildNode({
          config: {
            http: {
              ...buildNode().config!.http!,
              responsePath: 'value',
            },
          },
        }),
        {}
      )
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result['value']).toBe(42);
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
      })
    );
  });

  it('resolves relative internal API URLs against the configured app origin', async () => {
    process.env['NEXT_PUBLIC_APP_URL'] = 'http://localhost:3000';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, value: { tone: 'sales' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleHttp(
      buildContext(
        buildNode({
          config: {
            http: {
              ...buildNode().config!.http!,
              url: '/api/v2/products/ai-paths/description-context?catalogId=catalog-1',
              responsePath: 'value',
            },
          },
        }),
        {}
      )
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v2/products/ai-paths/description-context?catalogId=catalog-1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result['value']).toEqual({ tone: 'sales' });
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
        url: 'http://localhost:3000/api/v2/products/ai-paths/description-context?catalogId=catalog-1',
      })
    );
  });

  it('does not treat non-API relative paths as internal app fetches', async () => {
    process.env['NEXT_PUBLIC_APP_URL'] = 'http://localhost:3000';
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      handleHttp(
        buildContext(
          buildNode({
            config: {
              http: {
                ...buildNode().config!.http!,
                url: '/admin/products',
              },
            },
          }),
          {}
        )
      )
    ).rejects.toThrow('Blocked outbound URL: /admin/products');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
