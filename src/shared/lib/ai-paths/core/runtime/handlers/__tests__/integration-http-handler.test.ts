import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleHttp } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-http-handler';
import type {
  AiNode,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildNode = (
  patch: Partial<AiNode> = {}
): AiNode =>
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

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues
): NodeHandlerContext =>
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
    fetchEntityCached: async () => null,
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
  });

  it('blocks redirect chains that resolve to disallowed hosts', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data/' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleHttp(
      buildContext(buildNode(), {})
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        ok: false,
        status: 0,
        route: 'blocked_outbound_url',
      })
    );
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
      buildContext(buildNode({
        config: {
          http: {
            ...buildNode().config!.http!,
            responsePath: 'value',
          },
        },
      }), {})
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
});
