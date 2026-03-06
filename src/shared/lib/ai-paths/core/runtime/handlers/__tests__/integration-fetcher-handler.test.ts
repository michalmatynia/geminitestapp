import { describe, expect, it, vi } from 'vitest';

import { handleFetcher } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-fetcher-handler';
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

  it('throws when simulation source mode cannot hydrate configured entity', async () => {
    const fetchEntityCached = vi.fn(async () => null);
    const node = buildNode({
      config: {
        fetcher: {
          sourceMode: 'simulation_id',
          entityType: 'product',
          entityId: 'p-404',
        },
      },
    });
    const context = buildContext(
      node,
      {
        trigger: true,
      },
      {
        fetchEntityCached,
        strictFlowMode: true,
      }
    );

    await expect(handleFetcher(context)).rejects.toThrow('could not hydrate product:p-404');
    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'p-404');
  });

  it('does not throw when live context mode cannot hydrate entity', async () => {
    const fetchEntityCached = vi.fn(async () => null);
    const node = buildNode({
      config: {
        fetcher: {
          sourceMode: 'live_context',
        },
      },
    });
    const context = buildContext(
      node,
      {
        trigger: true,
        context: {
          entityId: 'p-live',
          entityType: 'product',
        },
      },
      {
        fetchEntityCached,
        strictFlowMode: true,
      }
    );

    const result = await handleFetcher(context);

    expect(result['entityId']).toBe('p-live');
    expect(result['entityType']).toBe('product');
    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'p-live');
  });

  it('prefers the live entity outside the AI Paths canvas even when the fetcher is left in simulation mode', async () => {
    const fetchEntityCached = vi.fn(async () => null);
    const node = buildNode({
      config: {
        fetcher: {
          sourceMode: 'simulation_id',
          entityType: 'product',
          entityId: 'p-sim',
        },
      },
    });
    const context = buildContext(node, {
      trigger: true,
      context: {
        entityId: 'p-live',
        entityType: 'product',
        entity: { id: 'p-live', sku: 'SKU-1' },
        location: { pathname: '/admin/products' },
      },
    });

    const result = await handleFetcher(context);

    expect(result['entityId']).toBe('p-live');
    expect(result['entityType']).toBe('product');
    expect(result['context']).toEqual(
      expect.objectContaining({
        entityId: 'p-live',
        entityType: 'product',
        contextSource: 'trigger_fetcher',
      })
    );
    expect(result['meta']).toEqual(
      expect.objectContaining({
        fetcherSourceMode: 'simulation_id',
        fetcherResolvedSource: 'live_context_override',
        entityId: 'p-live',
        entityType: 'product',
      })
    );
    expect(fetchEntityCached).not.toHaveBeenCalledWith('product', 'p-sim');
  });

  it('keeps simulation fetches for AI Paths canvas runs configured with simulation mode', async () => {
    const fetchEntityCached = vi.fn(async (_entityType: string, entityId: string) =>
      entityId === 'p-sim' ? { id: 'p-sim', sku: 'SIM-1' } : null
    );
    const node = buildNode({
      config: {
        fetcher: {
          sourceMode: 'simulation_id',
          entityType: 'product',
          entityId: 'p-sim',
        },
      },
    });
    const context = buildContext(
      node,
      {
        trigger: true,
        context: {
          entityId: 'p-live',
          entityType: 'product',
          entity: { id: 'p-live', sku: 'LIVE-1' },
          location: { pathname: '/admin/ai-paths' },
        },
      },
      {
        fetchEntityCached,
      }
    );

    const result = await handleFetcher(context);

    expect(result['entityId']).toBe('p-sim');
    expect(result['entityType']).toBe('product');
    expect(result['context']).toEqual(
      expect.objectContaining({
        entityId: 'p-sim',
        entityType: 'product',
        contextSource: 'simulation_fetcher',
      })
    );
    expect(result['meta']).toEqual(
      expect.objectContaining({
        fetcherResolvedSource: 'simulation_id',
      })
    );
    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'p-sim');
  });
});
