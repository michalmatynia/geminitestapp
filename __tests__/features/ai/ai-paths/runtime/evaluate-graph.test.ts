import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateGraph } from '@/shared/lib/ai-paths/core/runtime/engine';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import {
  defaultOptions,
  mockFetchEntityByType,
  resetEvaluateGraphMocks,
} from './evaluate-graph.test-support';

describe('evaluateGraph', () => {
  beforeEach(() => {
    resetEvaluateGraphMocks();
  });
  it('should evaluate a simple constant node', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Constant',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'hello',
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-1']).toEqual({ value: 'hello' });
  });

  it('should evaluate constant + math nodes', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Constant',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'number',
            value: '10',
          },
        },
      },
      {
        id: 'node-2',
        type: 'math',
        title: 'Math',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 200, y: 0 },
        config: {
          math: {
            operation: 'add',
            operand: 5,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-1',
        to: 'node-2',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-1']).toEqual({ value: 10 });
    expect(result.outputs['node-2']).toEqual({ value: 15 });
  });

  it('should handle branching logic with router', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Value',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: { valueType: 'number', value: '100' },
        },
      },
      {
        id: 'node-router',
        type: 'router',
        title: 'Router',
        description: '',
        inputs: ['value'],
        outputs: ['valid', 'errors', 'value'],
        position: { x: 200, y: 0 },
        config: {
          router: {
            mode: 'value',
            matchMode: 'equals',
            compareTo: '100',
          },
        },
      },
      {
        id: 'node-success',
        type: 'template',
        title: 'Success',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 400, y: -100 },
        config: {
          template: { template: 'Success: {{value}}' },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'e1',
        from: 'node-1',
        to: 'node-router',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'e2',
        from: 'node-router',
        to: 'node-success',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-router']).toMatchObject({ valid: true });
    expect(result.outputs['node-success']).toEqual({ prompt: 'Success: 100' });
  });

  it('should evaluate a parser node with JSON input', async () => {
    const nodes: AiNode[] = [
      {
        id: 'seed-node',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: -200, y: 0 },
        config: {
          constant: {
            valueType: 'json',
            value: JSON.stringify({
              name: 'Test Product',
              details: { price: 99.99 },
            }),
          },
        },
      },
      {
        id: 'node-parser',
        type: 'parser',
        title: 'Parser',
        description: '',
        inputs: ['entityJson'],
        outputs: ['title', 'price'],
        position: { x: 0, y: 0 },
        config: {
          parser: {
            mappings: {
              title: '$.name',
              price: '$.details.price',
            },
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'e-seed',
        from: 'seed-node',
        to: 'node-parser',
        fromPort: 'value',
        toPort: 'entityJson',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-parser']).toEqual({
      title: 'Test Product',
      price: 99.99,
    });
  });

  it('should handle context node resolution', async () => {
    const mockProduct = { id: 'p1', title: 'Original Title' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'node-context',
        type: 'context',
        title: 'Context',
        description: '',
        inputs: [],
        outputs: ['context', 'entityId', 'entityType', 'entityJson'],
        position: { x: 0, y: 0 },
        config: {
          context: {
            role: 'product',
            entityType: 'product',
            entityIdSource: 'manual',
            entityId: 'p1',
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-context']).toMatchObject({
      entityId: 'p1',
      entityType: 'product',
      entityJson: mockProduct,
    });
    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'p1');
  });

  it('ignores upstream simulation nodes in trigger-only mode', async () => {
    const nodes: AiNode[] = [
      {
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        description: '',
        inputs: ['trigger'],
        outputs: ['context'],
        position: { x: -200, y: 0 },
        config: {
          simulation: {
            entityType: 'product',
            entityId: 'product-2',
            productId: 'product-2',
            runBehavior: 'before_connected_trigger',
          },
        },
      },
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-sim-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
    });

    expect(result.outputs['simulation-1']).toBeUndefined();
    expect(result.outputs['trigger-1']?.['entityId'] ?? null).toBeNull();
  });

  it('resolves live trigger context through fetcher without backward simulation loop', async () => {
    const mockProduct = { id: 'product-77', title: 'Floor Lamp' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'live_context',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {
        entityId: 'product-77',
        entityType: 'product',
      },
    });

    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'product-77');
    expect(result.outputs['fetcher-1']?.['entityId']).toBe('product-77');
    expect(
      (result.outputs['fetcher-1']?.['context'] as Record<string, unknown>)?.['contextSource']
    ).toBe('trigger_fetcher');
  });

  it('resolves simulated context through fetcher and feeds Context node in forward flow', async () => {
    const mockProduct = { id: 'product-88', title: 'Desk Lamp' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'simulation_id',
            entityType: 'product',
            entityId: 'product-88',
          },
        },
      },
      {
        id: 'context-1',
        type: 'context',
        title: 'Context',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType', 'entityJson'],
        position: { x: 460, y: 0 },
        config: {
          context: {
            role: 'product',
            entityType: 'auto',
            entityIdSource: 'context',
            scopeMode: 'full',
            scopeTarget: 'entity',
            includePaths: [],
            excludePaths: [],
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-fetcher-context',
        from: 'fetcher-1',
        to: 'context-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
    });

    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'product-88');
    expect(result.outputs['fetcher-1']?.['entityId']).toBe('product-88');
    expect(
      (result.outputs['fetcher-1']?.['context'] as Record<string, unknown>)?.['contextSource']
    ).toBe('simulation_fetcher');
    expect(result.outputs['context-1']?.['entityId']).toBe('product-88');
    expect(result.outputs['context-1']?.['entityJson']).toMatchObject(mockProduct);
  });


});
