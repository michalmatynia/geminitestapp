import { describe, expect, it, vi } from 'vitest';

import { handleFetcher } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-fetcher-handler';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-fetcher',
    type: 'fetcher',
    title: 'Fetcher',
    description: 'Fetcher node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['trigger', 'context', 'entityId', 'entityType'],
    outputs: ['context', 'meta', 'entityId', 'entityType'],
    config: {
      fetcher: {
        sourceMode: 'live_context',
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  patch: Partial<NodeHandlerContext> = {}
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
    triggerNodeId: 'node-trigger',
    triggerEvent: 'manual',
    triggerContext: null,
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
    ...patch,
  }) as NodeHandlerContext;

describe('handleFetcher', () => {
  it('does not inject fallback entity payload when fetched entity is missing', async () => {
    const fetchEntityCached = vi.fn(async () => null);
    const toast = vi.fn();
    const node = buildNode();
    const context = buildContext(
      node,
      {
        trigger: true,
        context: {
          entityId: 'p-1',
          entityType: 'product',
        },
      },
      {
        fetchEntityCached,
        toast,
      }
    );

    const result = await handleFetcher(context);

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'p-1');
    expect(toast).toHaveBeenCalledWith('No product data found for ID p-1.', {
      variant: 'error',
    });
    expect(result['entityId']).toBe('p-1');
    expect(result['entityType']).toBe('product');
    expect(result['context']).toEqual(
      expect.objectContaining({
        entityId: 'p-1',
        entityType: 'product',
      })
    );
    expect((result['context'] as Record<string, unknown>)['entity']).toBeUndefined();
    expect((result['context'] as Record<string, unknown>)['entityJson']).toBeUndefined();
    expect((result['context'] as Record<string, unknown>)['product']).toBeUndefined();
  });
});

