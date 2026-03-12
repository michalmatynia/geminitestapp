import { describe, expect, it, vi } from 'vitest';

import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { handleTrigger } from '../integration-trigger-handler';

const buildContext = (
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext =>
  ({
    node: { id: 'node-trigger', type: 'trigger', title: 'Trigger', inputs: [], outputs: [], config: {} },
    nodeInputs: {},
    prevOutputs: {},
    allOutputs: {},
    allInputs: {},
    edges: [],
    nodes: [],
    runId: 'run-1',
    activePathId: 'path-1',
    skipAiJobs: false,
    executed: { ai: new Set() },
    toast: vi.fn(),
    reportAiPathsError: vi.fn(),
    fetchEntityCached: vi.fn(),
    contextRegistry: null,
    simulationEntityType: null,
    simulationEntityId: null,
    ...overrides,
  }) as unknown as NodeHandlerContext;

describe('handleTrigger', () => {
  it('returns {} for a non-matching trigger node', async () => {
    const ctx = buildContext({
      triggerNodeId: 'node-other-trigger',
    });

    const result = await handleTrigger(ctx);

    expect(result).toEqual({});
  });

  it('returns trigger fields without entity context when no entityId is in triggerContext', async () => {
    const ctx = buildContext({
      triggerNodeId: 'node-trigger',
      triggerEvent: 'manual',
      triggerContext: { someKey: 'someValue' },
    });

    const result = await handleTrigger(ctx);

    expect(result['trigger']).toBe(true);
    expect(result['triggerName']).toBe('manual');
    expect(result['entityId']).toBeUndefined();
    expect(result['entityJson']).toBeUndefined();
    expect(result['entityFetchFailed']).toBeUndefined();
  });

  it('fetches entity and includes it in output when entityId and entityType are present', async () => {
    const fakeEntity = { id: 'prod-1', name: 'Test Product' };
    const fetchEntityCached = vi.fn().mockResolvedValue(fakeEntity);
    const ctx = buildContext({
      triggerNodeId: 'node-trigger',
      triggerEvent: 'product_modal',
      triggerContext: { entityId: 'prod-1', entityType: 'product' },
      fetchEntityCached,
    });

    const result = await handleTrigger(ctx);

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'prod-1');
    expect(result['entityId']).toBe('prod-1');
    expect(result['entityType']).toBe('product');
    expect(result['entityJson']).toEqual(fakeEntity);
    expect(result['entityFetchFailed']).toBeUndefined();
    // context spread includes entityJson too
    const context = result['context'] as Record<string, unknown>;
    expect(context['entityJson']).toEqual(fakeEntity);
  });

  it('surfaces entity fetch failure: calls reportAiPathsError and sets entityFetchFailed on output', async () => {
    const fetchError = new Error('Product not found');
    const fetchEntityCached = vi.fn().mockRejectedValue(fetchError);
    const reportAiPathsError = vi.fn();
    const ctx = buildContext({
      triggerNodeId: 'node-trigger',
      triggerEvent: 'product_modal',
      triggerContext: { entityId: 'prod-deleted', entityType: 'product' },
      fetchEntityCached,
      reportAiPathsError,
    });

    const result = await handleTrigger(ctx);

    expect(reportAiPathsError).toHaveBeenCalledWith(
      fetchError,
      expect.objectContaining({ action: 'triggerEntityFetch', nodeId: 'node-trigger' }),
      'Trigger entity fetch failed:'
    );
    expect(result['entityFetchFailed']).toBe(true);
    expect(result['entityFetchError']).toBe('Product not found');
    expect(result['entityJson']).toBeUndefined();
    // context also contains the failure flag
    const context = result['context'] as Record<string, unknown>;
    expect(context['entityFetchFailed']).toBe(true);
    expect(context['entityFetchError']).toBe('Product not found');
  });

  it('infers entityType as product from legacy productId field in triggerContext', async () => {
    const fakeEntity = { id: 'prod-2', name: 'Legacy Product' };
    const fetchEntityCached = vi.fn().mockResolvedValue(fakeEntity);
    const ctx = buildContext({
      triggerNodeId: 'node-trigger',
      triggerEvent: 'manual',
      triggerContext: { productId: 'prod-2' },
      fetchEntityCached,
    });

    const result = await handleTrigger(ctx);

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'prod-2');
    expect(result['entityId']).toBe('prod-2');
    expect(result['entityType']).toBe('product');
    expect(result['entityJson']).toEqual(fakeEntity);
  });

  it('prefers embedded triggerContext entityJson over refetching a stale entity', async () => {
    const embeddedEntity = { id: 'prod-3', name: 'Row Snapshot', published: false, status: 'draft' };
    const fetchEntityCached = vi.fn().mockResolvedValue({
      id: 'prod-3',
      name: 'Stale Entity',
      published: true,
      status: 'published',
    });
    const ctx = buildContext({
      triggerNodeId: 'node-trigger',
      triggerEvent: 'manual',
      triggerContext: {
        entityId: 'prod-3',
        entityType: 'product',
        entityJson: embeddedEntity,
      },
      fetchEntityCached,
    });

    const result = await handleTrigger(ctx);

    expect(fetchEntityCached).not.toHaveBeenCalled();
    expect(result['entityJson']).toEqual(embeddedEntity);
    expect((result['context'] as Record<string, unknown>)['entityJson']).toEqual(embeddedEntity);
  });
});
