import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleAdvancedApi } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-api-advanced-handler';
import type {
  AiNode,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

const buildNode = (
  patch: Partial<AiNode> = {}
): AiNode =>
  ({
    id: 'node-api-advanced',
    type: 'api_advanced',
    title: 'API Advanced',
    description: 'Advanced API node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType', 'cursor', 'page'],
    outputs: ['value', 'bundle', 'status', 'headers', 'items', 'route', 'error', 'success'],
    config: {
      apiAdvanced: {
        url: 'https://example.test/resource/{id}',
        method: 'GET',
        pathParamsJson: '{"id":"{{entityId}}"}',
        queryParamsJson: '{"lang":"{{value}}"}',
        headersJson: '{"X-Test":"{{prompt}}"}',
        bodyTemplate: '',
        bodyMode: 'none',
        timeoutMs: 30000,
        authMode: 'none',
        responseMode: 'json',
        responsePath: '',
        outputMappingsJson: '{"payload":"data","statusCode":"status"}',
        retryEnabled: true,
        retryAttempts: 2,
        retryBackoff: 'fixed',
        retryBackoffMs: 0,
        retryMaxBackoffMs: 0,
        retryJitterRatio: 0,
        retryOnStatusJson: '[500]',
        retryOnNetworkError: true,
        paginationMode: 'none',
        pageParam: 'page',
        limitParam: 'limit',
        startPage: 1,
        pageSize: 10,
        cursorParam: 'cursor',
        cursorPath: '',
        itemsPath: 'items',
        maxPages: 1,
        paginationAggregateMode: 'first_page',
        rateLimitEnabled: false,
        rateLimitRequests: 1,
        rateLimitIntervalMs: 1000,
        rateLimitConcurrency: 1,
        rateLimitOnLimit: 'wait',
        idempotencyEnabled: true,
        idempotencyHeaderName: 'Idempotency-Key',
        idempotencyKeyTemplate: 'idemp-{{entityId}}',
        errorRoutesJson:
          '[{"id":"http_error","when":"status_range","minStatus":400,"maxStatus":599,"outputPort":"http_error"}]',
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

describe('handleAdvancedApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes templated request and maps outputs', async () => {
    const node = buildNode();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [1, 2], ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleAdvancedApi(
      buildContext(node, { entityId: '42', value: 'en', prompt: 'hello' })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('https://example.test/resource/42?lang=en');
    expect((init?.headers as Record<string, string>)['X-Test']).toBe('hello');
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('idemp-42');
    expect(result['status']).toBe(200);
    expect(result['success']).toBe(true);
    expect(result['payload']).toEqual({ items: [1, 2], ok: true });
    expect(result['statusCode']).toBe(200);
  });

  it('retries on configured status codes and succeeds on second attempt', async () => {
    const node = buildNode();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'temporary' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ done: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleAdvancedApi(
      buildContext(node, { entityId: '11', value: 'en', prompt: 'retry' })
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result['status']).toBe(200);
    expect(result['success']).toBe(true);
    expect(result['error']).toBeNull();
  });
});

